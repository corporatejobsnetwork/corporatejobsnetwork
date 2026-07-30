import { determineJobCategory } from "../filters";
import type {
  NormalizedImportedJob,
  SuccessFactorsCompany,
} from "../types";

interface JsonLdJobPosting {
  "@type"?: string;
  title?: string;
  description?: string;
  datePosted?: string;
  validThrough?: string;
  employmentType?: string | string[];
  hiringOrganization?: {
    name?: string;
    logo?: string;
  };
  jobLocation?: unknown;
  applicantLocationRequirements?: unknown;
  jobLocationType?: string;
  baseSalary?: unknown;
  qualifications?: string;
  responsibilities?: string;
  skills?: string | string[];
  experienceRequirements?: unknown;
  educationRequirements?: unknown;
  identifier?:
    | string
    | {
        name?: string;
        value?: string;
      };
}

const MAX_SEARCH_PAGES = 100;
const MAX_JOB_LINKS = 5000;

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
  /\b(?:salary|compensation|pay range)\s*[:\-]?\s*[^.\n]{3,120}/i,
];

const INDIA_PATTERN =
  /\b(india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|new delhi|noida|gurugram|gurgaon|kolkata|ahmedabad|kochi|cochin|thiruvananthapuram|trivandrum|jaipur|chandigarh|indore|bhubaneswar|mysuru|mysore|mangaluru|mangalore|hubballi|hubli)\b/i;

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
    .replace(/<\/(?:p|div|h1|h2|h3|h4|h5|h6|ul|ol|section|article)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
}

function absoluteUrl(baseUrl: string, value: string): string {
  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return "";
  }
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

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function flattenJsonLd(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLd);
  }

  if (
    value &&
    typeof value === "object" &&
    "@graph" in value &&
    Array.isArray((value as { "@graph": unknown[] })["@graph"])
  ) {
    return flattenJsonLd(
      (value as { "@graph": unknown[] })["@graph"]
    );
  }

  return [value];
}

function extractJobPostingJsonLd(
  html: string
): JsonLdJobPosting | null {
  const scriptPattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(scriptPattern)) {
    const parsed = safeJsonParse(
      decodeHtmlEntities(match[1].trim())
    );

    for (const item of flattenJsonLd(parsed)) {
      if (
        item &&
        typeof item === "object" &&
        String((item as JsonLdJobPosting)["@type"])
          .toLowerCase() === "jobposting"
      ) {
        return item as JsonLdJobPosting;
      }
    }
  }

  return null;
}

function extractMetaContent(
  html: string,
  key: string
): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]).trim();
    }
  }

  return "";
}

function extractTitle(html: string): string {
  const heading =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";

  if (heading) {
    return stripHtml(heading);
  }

  return (
    extractMetaContent(html, "og:title") ||
    stripHtml(
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ""
    )
  );
}

function extractJobLinks(
  html: string,
  baseUrl: string
): string[] {
  const links = new Set<string>();
  const anchorPattern =
    /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = decodeHtmlEntities(match[1]).trim();

    if (
      !href ||
      href.startsWith("javascript:") ||
      href.startsWith("mailto:")
    ) {
      continue;
    }

    const url = absoluteUrl(baseUrl, href);

    if (!url) {
      continue;
    }

    const pathname = new URL(url).pathname.toLowerCase();

    const looksLikeJob =
      /\/job\//i.test(pathname) ||
      /\/jobdetail\//i.test(pathname) ||
      /\/jobdescription\//i.test(pathname);

    const looksLikeSearch =
      /\/search\//i.test(pathname) ||
      /\/search-jobs\//i.test(pathname);

    if (looksLikeJob && !looksLikeSearch) {
      links.add(url);
    }
  }

  return Array.from(links);
}

function buildSearchUrl(
  company: SuccessFactorsCompany,
  page: number
): string {
  const baseUrl = normalizeBaseUrl(company.careersUrl);
  const url = new URL(
    company.apiUrl?.trim() ||
      `${baseUrl}/search/`
  );

  const startRow = page * 25;

  if (!url.searchParams.has("q")) {
    url.searchParams.set("q", "");
  }

  if (!url.searchParams.has("locationsearch")) {
    url.searchParams.set("locationsearch", "");
  }

  url.searchParams.set("startrow", String(startRow));

  return url.toString();
}

function extractNextPageUrl(
  html: string,
  currentUrl: string
): string {
  const nextLinkPatterns = [
    /<a[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i,
    /<a[^>]+href=["']([^"']+)["'][^>]*>\s*(?:Next|›|»)\s*<\/a>/i,
    /<a[^>]+aria-label=["'][^"']*next[^"']*["'][^>]+href=["']([^"']+)["']/i,
  ];

  for (const pattern of nextLinkPatterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return absoluteUrl(currentUrl, match[1]);
    }
  }

  return "";
}

async function fetchHtml(
  url: string,
  companyName: string
): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (compatible; CorporateJobsNetwork/1.0)",
    },
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch SuccessFactors page for ${companyName}: ${response.status}`
    );
  }

  return response.text();
}

async function fetchAllJobLinks(
  company: SuccessFactorsCompany
): Promise<string[]> {
  const links = new Set<string>();
  const visited = new Set<string>();
  let currentUrl = buildSearchUrl(company, 0);

  for (
    let page = 0;
    page < MAX_SEARCH_PAGES && currentUrl;
    page += 1
  ) {
    if (visited.has(currentUrl)) {
      break;
    }

    visited.add(currentUrl);

    const html = await fetchHtml(
      currentUrl,
      company.name
    );

    const pageLinks = extractJobLinks(
      html,
      normalizeBaseUrl(company.careersUrl)
    );

    const sizeBefore = links.size;

    for (const link of pageLinks) {
      links.add(link);

      if (links.size >= MAX_JOB_LINKS) {
        return Array.from(links);
      }
    }

    const nextUrl = extractNextPageUrl(
      html,
      currentUrl
    );

    if (nextUrl && !visited.has(nextUrl)) {
      currentUrl = nextUrl;
      continue;
    }

    if (pageLinks.length === 0 || links.size === sizeBefore) {
      break;
    }

    currentUrl = buildSearchUrl(company, page + 1);
  }

  return Array.from(links);
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") {
    return stripHtml(value);
  }

  if (Array.isArray(value)) {
    return value
      .map(stringifyUnknown)
      .filter(Boolean)
      .join(", ");
  }

  if (value && typeof value === "object") {
    return Object.values(value)
      .map(stringifyUnknown)
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

function extractLocation(
  job: JsonLdJobPosting | null,
  html: string
): string {
  const structured = stringifyUnknown(
    job?.jobLocation ||
      job?.applicantLocationRequirements
  );

  if (structured) {
    return structured;
  }

  const locationMeta =
    extractMetaContent(html, "job:location") ||
    extractMetaContent(html, "og:locality");

  if (locationMeta) {
    return locationMeta;
  }

  const visibleText = stripHtml(html);
  const match = visibleText.match(
    /(?:location|job location)\s*[:\-]\s*([^\n]{2,120})/i
  );

  return match?.[1]?.trim() || "Not Mentioned";
}

function extractCountry(location: string): string {
  if (INDIA_PATTERN.test(location)) {
    return "India";
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.at(-1) || "Not Mentioned";
}

function formatSalary(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value !== "object") {
    return "";
  }

  const text = stringifyUnknown(value);
  return text.replace(/\s+/g, " ").trim();
}

function extractSourceJobId(
  url: string,
  job: JsonLdJobPosting | null
): string {
  const identifier = job?.identifier;

  if (typeof identifier === "string" && identifier.trim()) {
    return identifier.trim();
  }

  if (
    identifier &&
    typeof identifier === "object" &&
    identifier.value?.trim()
  ) {
    return identifier.value.trim();
  }

  const pathname = new URL(url).pathname;
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments.at(-1) || "";

  const numericMatch = pathname.match(
    /(?:job|jobdetail|jobdescription)[^/]*\/(?:[^/]+\/)*?(\d+)(?:\/|$)/i
  );

  return (
    numericMatch?.[1] ||
    lastSegment ||
    pathname
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

function getWorkMode(
  job: JsonLdJobPosting | null,
  description: string
): string {
  if (
    String(job?.jobLocationType || "")
      .toUpperCase()
      .includes("TELECOMMUTE")
  ) {
    return "Remote";
  }

  if (/\bhybrid\b/i.test(description)) {
    return "Hybrid";
  }

  if (
    /\bremote\b|\bwork from home\b|\bwfh\b/i.test(
      description
    )
  ) {
    return "Remote";
  }

  if (
    /\bon[- ]site\b|\boffice based\b/i.test(
      description
    )
  ) {
    return "On-site";
  }

  return "Not Mentioned";
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

function normalizeEmploymentType(
  value: string | string[] | undefined
): string {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ") ||
      "Not Mentioned";
  }

  return value?.trim() || "Not Mentioned";
}

async function parseJob(
  company: SuccessFactorsCompany,
  url: string
): Promise<NormalizedImportedJob> {
  const html = await fetchHtml(url, company.name);
  const job = extractJobPostingJsonLd(html);

  const role =
    stripHtml(job?.title || "") ||
    extractTitle(html) ||
    "Role Not Mentioned";

  const description =
    stripHtml(job?.description || "") ||
    extractMetaContent(html, "description") ||
    stripHtml(html);

  const responsibilities =
    stripHtml(job?.responsibilities || "");

  const eligibility =
    stripHtml(job?.qualifications || "");

  const location = extractLocation(job, html);
  const sourceJobId = extractSourceJobId(url, job);
  const employmentType = normalizeEmploymentType(
    job?.employmentType
  );

  const structuredSkills = stringifyUnknown(job?.skills)
    .split(/[,;\n]/)
    .map((skill) => skill.trim())
    .filter(Boolean);

  const detectedSkills = extractSkills(
    `${description}\n${eligibility}`
  );

  const skills = Array.from(
    new Set([...structuredSkills, ...detectedSkills])
  ).slice(0, 15);

  const structuredSalary = formatSalary(job?.baseSalary);

  return {
    uniqueKey:
      `successfactors_${company.slug}_${sourceJobId}`,

    source: "successfactors",
    sourceJobId,
    sourceCompanyId:
      company.tenant?.trim() ||
      company.siteId?.trim() ||
      company.boardId?.trim() ||
      company.slug,
    sourceUrl: url,

    company:
      job?.hiringOrganization?.name?.trim() ||
      company.name,
    companySlug: company.slug,
    companyLogo:
      job?.hiringOrganization?.logo?.trim() ||
      company.logo ||
      "",

    role,
    location,
    country: extractCountry(location),

    description,
    responsibilities,
    eligibility,
    benefits: "",
    selectionProcess: "",

    experience:
      stringifyUnknown(job?.experienceRequirements) ||
      extractByPattern(
        description,
        EXPERIENCE_PATTERNS,
        "Not Mentioned"
      ),

    education:
      stringifyUnknown(job?.educationRequirements) ||
      extractByPattern(
        `${eligibility}\n${description}`,
        EDUCATION_PATTERNS,
        "Not Mentioned"
      ),

    salary:
      structuredSalary ||
      extractByPattern(
        description,
        SALARY_PATTERNS,
        "Salary Not Disclosed"
      ),

    skills,
    requiredSkills: extractSkills(
      `${eligibility}\n${description}`
    ),

    jobType: employmentType || "Private Job",
    category: determineJobCategory(
      role,
      description,
      location
    ),

    applyLink: url,

    workMode: getWorkMode(job, description),
    employmentType,
    lastDate: job?.validThrough?.trim() || "",

    importedAutomatically: true,
    trustedCompany: company.trusted,

    reviewStatus: "pending",
    processingStatus: "completed",

    status: "draft",
    isActive: true,

    sourceCreatedAt: toIsoDate(job?.datePosted),
    sourceUpdatedAt: null,

    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchSuccessFactorsJobs(
  company: SuccessFactorsCompany
): Promise<NormalizedImportedJob[]> {
  const jobLinks = await fetchAllJobLinks(company);
  const jobs: NormalizedImportedJob[] = [];
  const seen = new Set<string>();

  for (const jobLink of jobLinks) {
    try {
      const job = await parseJob(company, jobLink);

      if (!job.sourceJobId || seen.has(job.uniqueKey)) {
        continue;
      }

      seen.add(job.uniqueKey);
      jobs.push(job);
    } catch (error) {
      console.error(
        `Skipped SuccessFactors job for ${company.name}:`,
        error
      );
    }
  }

  return jobs;
}