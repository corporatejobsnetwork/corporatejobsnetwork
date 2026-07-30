import { determineJobCategory } from "../filters";
import type {
  NormalizedImportedJob,
  SmartRecruitersCompany,
} from "../types";

interface SmartRecruitersLocation {
  city?: string;
  region?: string;
  country?: string;
  remote?: boolean;
}

interface SmartRecruitersLabel {
  id?: string;
  label?: string;
}

interface SmartRecruitersCompanyInfo {
  identifier?: string;
  name?: string;
}

interface SmartRecruitersPostingSummary {
  id?: string;
  uuid?: string;
  name?: string;
  refNumber?: string;
  releasedDate?: string;
  location?: SmartRecruitersLocation;
  company?: SmartRecruitersCompanyInfo;
  typeOfEmployment?: SmartRecruitersLabel;
  experienceLevel?: SmartRecruitersLabel;
  function?: SmartRecruitersLabel;
  industry?: SmartRecruitersLabel;
  ref?: string;
}

interface SmartRecruitersPostingList {
  limit?: number;
  offset?: number;
  totalFound?: number;
  content?: SmartRecruitersPostingSummary[];
}

interface SmartRecruitersJobAd {
  companyDescription?: string;
  jobDescription?: string;
  qualifications?: string;
  additionalInformation?: string;
}

interface SmartRecruitersPostingDetail
  extends SmartRecruitersPostingSummary {
  applyUrl?: string;
  jobAdUrl?: string;
  jobAd?: SmartRecruitersJobAd;
}

const PAGE_SIZE = 100;
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

const SKILLS: Array<[string, RegExp[]]> = [
  ["Java", [/\bjava\b/i]],
  ["JavaScript", [/\bjavascript\b/i, /\bjs\b/i]],
  ["TypeScript", [/\btypescript\b/i]],
  ["React", [/\breact(?:\.js)?\b/i]],
  ["Angular", [/\bangular(?:\.js)?\b/i]],
  ["Vue.js", [/\bvue(?:\.js)?\b/i]],
  ["Node.js", [/\bnode(?:\.js)?\b/i]],
  ["Python", [/\bpython\b/i]],
  ["PHP", [/\bphp\b/i]],
  [".NET", [/(?:^|[^a-z0-9])\.net(?:[^a-z0-9]|$)/i]],
  ["C#", [/(?:^|[^a-z0-9])c#(?:[^a-z0-9]|$)/i]],
  ["C++", [/(?:^|[^a-z0-9])c\+\+(?:[^a-z0-9]|$)/i]],
  ["Go", [/\bgolang\b/i, /\bgo language\b/i]],
  ["Kotlin", [/\bkotlin\b/i]],
  ["Swift", [/\bswift\b/i]],
  ["SQL", [/\bsql\b/i]],
  ["MySQL", [/\bmysql\b/i]],
  ["PostgreSQL", [/\bpostgres(?:ql)?\b/i]],
  ["MongoDB", [/\bmongodb\b/i]],
  ["Oracle", [/\boracle database\b/i, /\boracle sql\b/i]],
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

function extractByPattern(
  text: string,
  patterns: RegExp[],
  fallback: string
): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1] || match?.[0]) {
      return (match[1] || match[0])
        .replace(/\s+/g, " ")
        .trim();
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

function cleanPart(value?: string): string {
  return value?.trim() || "";
}

function getLocation(
  detail: SmartRecruitersPostingDetail
): string {
  const location = detail.location;

  const parts = [
    cleanPart(location?.city),
    cleanPart(location?.region),
    cleanPart(location?.country),
  ].filter(Boolean);

  if (parts.length > 0) {
    return Array.from(new Set(parts)).join(", ");
  }

  return location?.remote ? "Remote" : "Not Mentioned";
}

function getCountry(
  detail: SmartRecruitersPostingDetail
): string {
  return cleanPart(detail.location?.country) || "Not Mentioned";
}

function getWorkMode(
  detail: SmartRecruitersPostingDetail,
  description: string
): string {
  if (detail.location?.remote) {
    return "Remote";
  }

  if (/\bhybrid\b/i.test(description)) {
    return "Hybrid";
  }

  if (/\bremote\b|\bwork from home\b|\bwfh\b/i.test(description)) {
    return "Remote";
  }

  if (/\bon[- ]site\b|\boffice based\b/i.test(description)) {
    return "On-site";
  }

  return "Not Mentioned";
}

function getSourceJobId(
  detail: SmartRecruitersPostingDetail
): string {
  return (
    cleanPart(detail.uuid) ||
    cleanPart(detail.id) ||
    cleanPart(detail.refNumber) ||
    cleanPart(detail.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

function toIsoDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

function getPostingUrl(
  company: SmartRecruitersCompany,
  detail: SmartRecruitersPostingDetail
): string {
  if (detail.jobAdUrl?.trim()) {
    return detail.jobAdUrl.trim();
  }

  const postingId =
    detail.uuid?.trim() ||
    detail.id?.trim() ||
    "";

  return postingId
    ? `https://jobs.smartrecruiters.com/${encodeURIComponent(
        company.boardId
      )}/${encodeURIComponent(postingId)}`
    : "";
}

async function fetchPostingPage(
  company: SmartRecruitersCompany,
  offset: number
): Promise<SmartRecruitersPostingList> {
  const url = new URL(
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(
      company.boardId
    )}/postings`
  );

  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("destination", "PUBLIC");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      "User-Agent": "CorporateJobsNetwork/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch SmartRecruiters jobs for ${company.name}: ${response.status}`
    );
  }

  return (await response.json()) as SmartRecruitersPostingList;
}

async function fetchPostingDetail(
  company: SmartRecruitersCompany,
  posting: SmartRecruitersPostingSummary
): Promise<SmartRecruitersPostingDetail> {
  const postingId =
    posting.uuid?.trim() ||
    posting.id?.trim();

  if (!postingId) {
    throw new Error(
      `SmartRecruiters posting id is missing for ${company.name}.`
    );
  }

  const response = await fetch(
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(
      company.boardId
    )}/postings/${encodeURIComponent(postingId)}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "CorporateJobsNetwork/1.0",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Unable to fetch SmartRecruiters job detail for ${company.name}: ${response.status}`
    );
  }

  return (await response.json()) as SmartRecruitersPostingDetail;
}

async function fetchAllPostings(
  company: SmartRecruitersCompany
): Promise<SmartRecruitersPostingSummary[]> {
  const postings: SmartRecruitersPostingSummary[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  for (
    let page = 0;
    page < MAX_PAGES && offset < total;
    page += 1
  ) {
    const result = await fetchPostingPage(company, offset);
    const content = Array.isArray(result.content)
      ? result.content
      : [];

    total =
      typeof result.totalFound === "number"
        ? result.totalFound
        : offset + content.length;

    postings.push(...content);

    if (content.length === 0 || content.length < PAGE_SIZE) {
      break;
    }

    offset += content.length;
  }

  return postings;
}

export async function fetchSmartRecruitersJobs(
  company: SmartRecruitersCompany
): Promise<NormalizedImportedJob[]> {
  const postings = await fetchAllPostings(company);
  const jobs: NormalizedImportedJob[] = [];

  for (const posting of postings) {
    try {
      const detail = await fetchPostingDetail(
        company,
        posting
      );

      const jobAd = detail.jobAd || {};

      const companyDescription = stripHtml(
        jobAd.companyDescription || ""
      );

      const jobDescription = stripHtml(
        jobAd.jobDescription || ""
      );

      const qualifications = stripHtml(
        jobAd.qualifications || ""
      );

      const additionalInformation = stripHtml(
        jobAd.additionalInformation || ""
      );

      const description = [
        companyDescription,
        jobDescription,
        qualifications,
        additionalInformation,
      ]
        .filter(Boolean)
        .join("\n\n")
        .trim();

      const role =
        cleanPart(detail.name) ||
        cleanPart(posting.name) ||
        "Role Not Mentioned";

      const location = getLocation(detail);
      const sourceJobId = getSourceJobId(detail);

      const sourceUrl = getPostingUrl(company, detail);
      const applyLink =
        cleanPart(detail.applyUrl) ||
        sourceUrl;

      const employmentType =
        cleanPart(detail.typeOfEmployment?.label) ||
        "Not Mentioned";

      const experience =
        cleanPart(detail.experienceLevel?.label) ||
        extractByPattern(
          description,
          EXPERIENCE_PATTERNS,
          "Not Mentioned"
        );

      const allSkills = extractSkills(description);
      const requiredSkills = extractSkills(
        qualifications || description
      );

      jobs.push({
        uniqueKey:
          `smartrecruiters_${company.boardId}_${sourceJobId}`,

        source: "smartrecruiters",
        sourceJobId,
        sourceCompanyId: company.boardId,
        sourceUrl,

        company: company.name,
        companySlug: company.slug,
        companyLogo: company.logo || "",

        role,
        location,
        country: getCountry(detail),

        description,
        responsibilities: jobDescription,
        eligibility: qualifications,
        benefits: additionalInformation,
        selectionProcess: "",

        experience,
        education: extractByPattern(
          qualifications || description,
          EDUCATION_PATTERNS,
          "Not Mentioned"
        ),
        salary: extractByPattern(
          description,
          SALARY_PATTERNS,
          "Salary Not Disclosed"
        ),

        skills: allSkills,
        requiredSkills,

        jobType: employmentType || "Private Job",
        category: determineJobCategory(
          role,
          description,
          location
        ),

        applyLink,

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
          toIsoDate(detail.releasedDate) ||
          toIsoDate(posting.releasedDate),
        sourceUpdatedAt: null,

        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        `Skipped SmartRecruiters job for ${company.name}:`,
        error
      );
    }
  }

  return jobs;
}