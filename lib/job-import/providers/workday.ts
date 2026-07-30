import { determineJobCategory } from "../filters";
import type {
  NormalizedImportedJob,
  WorkdayCompany,
} from "../types";

interface WorkdayJobPosting {
  title?: string;
  externalPath?: string;
  bulletFields?: string[];
  locationsText?: string;
  postedOn?: string;
}

interface WorkdaySearchResponse {
  total?: number;
  jobPostings?: WorkdayJobPosting[];
}

interface WorkdayJobDetail {
  jobPostingInfo?: {
    id?: string;
    title?: string;
    jobDescription?: string;
    location?: string;
    additionalLocations?: string[];
    postedOn?: string;
    timeType?: string;
    workerSubType?: string;
    jobReqId?: string;
    country?: string;
    remoteType?: string;
  };
}

const PAGE_SIZE = 20;
const MAX_PAGES = 100;

const EXPERIENCE_PATTERNS = [
  /\b(\d+\s*(?:-|–|—|to)\s*\d+\+?\s*years?(?:\s+of\s+experience)?)\b/i,
  /\b(\d+\+\s*years?(?:\s+of\s+experience)?)\b/i,
  /\b(?:minimum\s+(?:of\s+)?)?(\d+\s+years?(?:\s+of\s+experience)?)\b/i,
  /\b(freshers?)\b/i,
  /\b(entry[- ]level)\b/i,
];

const EDUCATION_PATTERNS = [
  /\b(?:bachelor'?s?|master'?s?)\s+(?:degree\s+)?(?:in\s+)?[^.\n;]{2,120}/i,
  /\b(?:B\.?\s*Tech|M\.?\s*Tech|B\.?\s*E\.?|M\.?\s*E\.?|BCA|MCA|BBA|MBA|B\.?\s*Com|M\.?\s*Com)\b[^.\n;]{0,100}/i,
  /\b(?:graduate|graduation|undergraduate|postgraduate|diploma)\b[^.\n;]{0,100}/i,
];

const SALARY_PATTERNS = [
  /₹\s?[\d,.]+\s*(?:-|–|—|to)\s*₹?\s?[\d,.]+\s*(?:per month|monthly|per annum|annually|lpa|lakhs?)/i,
  /\b\d+(?:\.\d+)?\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?\s*LPA\b/i,
  /\b(?:salary|compensation|pay range)\s*[:\-]?\s*[^.\n]{3,100}/i,
];

const INDIA_LOCATION_PATTERN =
  /\b(india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|new delhi|noida|gurugram|gurgaon|kolkata|ahmedabad|kochi|cochin|thiruvananthapuram|trivandrum|jaipur|chandigarh|indore|bhubaneswar|mysuru|mysore|mangaluru|mangalore|hubballi|hubli)\b/i;

const SKILLS: Array<[string, RegExp[]]> = [
  ["Java", [/\bjava\b/i]],
  ["JavaScript", [/\bjavascript\b/i, /\bjs\b/i]],
  ["TypeScript", [/\btypescript\b/i]],
  ["React", [/\breact(?:\.js)?\b/i]],
  ["Angular", [/\bangular(?:\.js)?\b/i]],
  ["Node.js", [/\bnode(?:\.js)?\b/i]],
  ["Python", [/\bpython\b/i]],
  [".NET", [/(?:^|[^a-z0-9])\.net(?:[^a-z0-9]|$)/i]],
  ["C#", [/(?:^|[^a-z0-9])c#(?:[^a-z0-9]|$)/i]],
  ["C++", [/(?:^|[^a-z0-9])c\+\+(?:[^a-z0-9]|$)/i]],
  ["SQL", [/\bsql\b/i]],
  ["MySQL", [/\bmysql\b/i]],
  ["PostgreSQL", [/\bpostgres(?:ql)?\b/i]],
  ["MongoDB", [/\bmongodb\b/i]],
  ["Spring Boot", [/\bspring\s*boot\b/i]],
  ["AWS", [/\baws\b/i, /\bamazon web services\b/i]],
  ["Azure", [/\bazure\b/i]],
  ["GCP", [/\bgcp\b/i, /\bgoogle cloud(?: platform)?\b/i]],
  ["Docker", [/\bdocker\b/i]],
  ["Kubernetes", [/\bkubernetes\b/i, /\bk8s\b/i]],
  ["Linux", [/\blinux\b/i]],
  ["Git", [/\bgit\b/i]],
  ["Jenkins", [/\bjenkins\b/i]],
  ["CI/CD", [/\bci\s*\/?\s*cd\b/i]],
  ["REST APIs", [/\brest(?:ful)?\s+apis?\b/i]],
  ["GraphQL", [/\bgraphql\b/i]],
  ["Microservices", [/\bmicroservices?\b/i]],
  ["Machine Learning", [/\bmachine learning\b/i]],
  ["Artificial Intelligence", [/\bartificial intelligence\b/i, /\bgenerative ai\b/i]],
  ["Excel", [/\bmicrosoft excel\b/i, /\bms excel\b/i, /\bexcel\b/i]],
  ["Power BI", [/\bpower\s*bi\b/i]],
  ["Tableau", [/\btableau\b/i]],
  ["Communication Skills", [/\bcommunication skills?\b/i]],
  ["Problem Solving", [/\bproblem[- ]solving\b/i]],
  ["Analytical Skills", [/\banalytical skills?\b/i]],
  ["Stakeholder Management", [/\bstakeholder management\b/i]],
  ["Project Management", [/\bproject management\b/i]],
];

function normalizeHost(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    );
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h1|h2|h3|h4|h5|h6|ul|ol|section)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractByPattern(text: string, patterns: RegExp[], fallback: string): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1] || match?.[0]) {
      return (match[1] || match[0]).replace(/\s+/g, " ").trim();
    }
  }
  return fallback;
}

function extractSkills(text: string): string[] {
  return SKILLS.filter(([, patterns]) =>
    patterns.some((pattern) => pattern.test(text))
  )
    .map(([label]) => label)
    .slice(0, 15);
}

function createCxsBaseUrl(company: WorkdayCompany): string {
  return `${normalizeHost(company.workdayHost)}/wday/cxs/${encodeURIComponent(
    company.tenant
  )}/${encodeURIComponent(company.siteId)}`;
}

function normalizeExternalPath(value: string): string {
  return value.startsWith("/") ? value : `/${value}`;
}

function createPublicJobUrl(
  company: WorkdayCompany,
  externalPath: string
): string {
  const locale = company.locale?.trim() || "en-US";
  return `${normalizeHost(company.workdayHost)}/${locale}/${company.siteId}${normalizeExternalPath(
    externalPath
  )}`;
}

function getEmploymentType(
  posting: WorkdayJobPosting,
  detail: WorkdayJobDetail
): string {
  const info = detail.jobPostingInfo;
  return (
    info?.timeType?.trim() ||
    info?.workerSubType?.trim() ||
    posting.bulletFields?.find((value) =>
      /\b(full[- ]time|part[- ]time|intern|contract|temporary|permanent)\b/i.test(
        value
      )
    ) ||
    "Not Mentioned"
  );
}

function getLocation(
  posting: WorkdayJobPosting,
  detail: WorkdayJobDetail
): string {
  const info = detail.jobPostingInfo;
  const values = [
    info?.location || "",
    ...(info?.additionalLocations || []),
    posting.locationsText || "",
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(values)).join(", ") || "Not Mentioned";
}

function getWorkMode(detail: WorkdayJobDetail, description: string): string {
  const remoteType = detail.jobPostingInfo?.remoteType?.trim();
  if (remoteType) return remoteType;
  if (/\bhybrid\b/i.test(description)) return "Hybrid";
  if (/\bremote\b|\bwork from home\b|\bwfh\b/i.test(description)) return "Remote";
  if (/\bon[- ]site\b|\boffice based\b/i.test(description)) return "On-site";
  return "Not Mentioned";
}

function toIsoDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchSearchPage(
  company: WorkdayCompany,
  offset: number
): Promise<WorkdaySearchResponse> {
  const response = await fetch(`${createCxsBaseUrl(company)}/jobs`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "CorporateJobsNetwork/1.0",
    },
    body: JSON.stringify({
      appliedFacets: {},
      limit: PAGE_SIZE,
      offset,
      searchText: "",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch Workday jobs for ${company.name}: ${response.status}`
    );
  }

  return (await response.json()) as WorkdaySearchResponse;
}

async function fetchJobDetail(
  company: WorkdayCompany,
  externalPath: string
): Promise<WorkdayJobDetail> {
  const response = await fetch(
    `${createCxsBaseUrl(company)}/job${normalizeExternalPath(externalPath)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "CorporateJobsNetwork/1.0",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Unable to fetch Workday job detail for ${company.name}: ${response.status}`
    );
  }

  return (await response.json()) as WorkdayJobDetail;
}

async function fetchAllPostings(
  company: WorkdayCompany
): Promise<WorkdayJobPosting[]> {
  const jobs: WorkdayJobPosting[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  for (let page = 0; page < MAX_PAGES && offset < total; page += 1) {
    const result = await fetchSearchPage(company, offset);
    const postings = Array.isArray(result.jobPostings)
      ? result.jobPostings
      : [];

    total =
      typeof result.total === "number"
        ? result.total
        : offset + postings.length;

    jobs.push(...postings);

    if (postings.length === 0 || postings.length < PAGE_SIZE) {
      break;
    }

    offset += postings.length;
  }

  return jobs;
}

export async function fetchWorkdayJobs(
  company: WorkdayCompany
): Promise<NormalizedImportedJob[]> {
  const postings = await fetchAllPostings(company);
  const jobs: NormalizedImportedJob[] = [];

  for (const posting of postings) {
    const externalPath = posting.externalPath?.trim();
    if (!externalPath) continue;

    try {
      const detail = await fetchJobDetail(company, externalPath);
      const info = detail.jobPostingInfo;
      const description = stripHtml(info?.jobDescription || "");
      const role =
        info?.title?.trim() ||
        posting.title?.trim() ||
        "Role Not Mentioned";
      const location = getLocation(posting, detail);
      const sourceJobId =
        info?.jobReqId?.trim() ||
        info?.id?.trim() ||
        externalPath.split("/").filter(Boolean).pop() ||
        role.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const sourceUrl = createPublicJobUrl(company, externalPath);
      const employmentType = getEmploymentType(posting, detail);

      jobs.push({
        uniqueKey: `workday_${company.tenant}_${company.siteId}_${sourceJobId}`,
        source: "workday",
        sourceJobId,
        sourceCompanyId: `${company.tenant}:${company.siteId}`,
        sourceUrl,

        company: company.name,
        companySlug: company.slug,
        companyLogo: company.logo || "",

        role,
        location,
        country:
          info?.country?.trim() ||
          (INDIA_LOCATION_PATTERN.test(location)
            ? "India"
            : "Not Mentioned"),

        description,
        responsibilities: "",
        eligibility: "",
        benefits: "",
        selectionProcess: "",

        experience: extractByPattern(
          description,
          EXPERIENCE_PATTERNS,
          "Not Mentioned"
        ),
        education: extractByPattern(
          description,
          EDUCATION_PATTERNS,
          "Not Mentioned"
        ),
        salary: extractByPattern(
          description,
          SALARY_PATTERNS,
          "Salary Not Disclosed"
        ),

        skills: extractSkills(description),
        requiredSkills: extractSkills(description),

        jobType: employmentType || "Private Job",
        category: determineJobCategory(role, description, location),

        applyLink: sourceUrl,
        workMode: getWorkMode(detail, description),
        employmentType,
        lastDate: "",

        importedAutomatically: true,
        trustedCompany: company.trusted,

        reviewStatus: "pending",
        processingStatus: "completed",

        status: "draft",
        isActive: true,

        sourceCreatedAt:
          toIsoDate(info?.postedOn) ||
          toIsoDate(posting.postedOn),
        sourceUpdatedAt: null,

        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        `Skipped Workday job for ${company.name}:`,
        error
      );
    }
  }

  return jobs;
}