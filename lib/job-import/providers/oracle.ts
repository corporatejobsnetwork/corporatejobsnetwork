import { determineJobCategory } from "../filters";
import type {
  NormalizedImportedJob,
  OracleCompany,
} from "../types";

interface OracleLocation {
  city?: string;
  state?: string;
  country?: string;
  name?: string;
}

interface OracleRequisitionListItem {
  Id?: string | number;
  id?: string | number;
  RequisitionId?: string | number;
  requisitionId?: string | number;
  Title?: string;
  title?: string;
  JobTitle?: string;
  jobTitle?: string;
  PrimaryLocation?: string;
  primaryLocation?: string;
  Locations?: OracleLocation[];
  locations?: OracleLocation[];
  PostedDate?: string;
  postedDate?: string;
  ExternalPostedStartDate?: string;
  externalPostedStartDate?: string;
  ExternalPostedEndDate?: string;
  externalPostedEndDate?: string;
  JobFunction?: string;
  jobFunction?: string;
  WorkerType?: string;
  workerType?: string;
  EmploymentType?: string;
  employmentType?: string;
  JobFamily?: string;
  jobFamily?: string;
  JobCategory?: string;
  jobCategory?: string;
  ApplyUrl?: string;
  applyUrl?: string;
  JobUrl?: string;
  jobUrl?: string;
  CanonicalUrl?: string;
  canonicalUrl?: string;
}

interface OracleRequisitionDetail
  extends OracleRequisitionListItem {
  Description?: string;
  description?: string;
  JobDescription?: string;
  jobDescription?: string;
  Responsibilities?: string;
  responsibilities?: string;
  Qualifications?: string;
  qualifications?: string;
  MinimumQualifications?: string;
  minimumQualifications?: string;
  PreferredQualifications?: string;
  preferredQualifications?: string;
  Skills?: string | string[];
  skills?: string | string[];
  EducationRequirements?: string;
  educationRequirements?: string;
  ExperienceRequirements?: string;
  experienceRequirements?: string;
  Salary?: string;
  salary?: string;
  Compensation?: string;
  compensation?: string;
  Benefits?: string;
  benefits?: string;
  HiringOrganization?: string;
  hiringOrganization?: string;
  OrganizationName?: string;
  organizationName?: string;
}

interface OracleApiResponse {
  items?: OracleRequisitionListItem[];
  Items?: OracleRequisitionListItem[];
  count?: number;
  Count?: number;
  totalResults?: number;
  TotalResults?: number;
  hasMore?: boolean;
  HasMore?: boolean;
  links?: Array<{
    rel?: string;
    href?: string;
  }>;
}

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

const PAGE_SIZE = 25;
const MAX_PAGES = 200;
const MAX_JOBS = 5000;

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

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return String(value);
    }
  }

  return "";
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
    Array.isArray(
      (value as { "@graph": unknown[] })["@graph"]
    )
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
        String(
          (item as JsonLdJobPosting)["@type"]
        ).toLowerCase() === "jobposting"
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
  const escaped = key.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

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

function formatSalary(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return stringifyUnknown(value)
    .replace(/\s+/g, " ")
    .trim();
}

function getSiteNumber(
  company: OracleCompany
): string {
  return (
    company.siteNumber?.trim() ||
    company.boardId?.trim() ||
    "CX_1"
  );
}

function getApiBaseUrl(
  company: OracleCompany
): string {
  if (company.apiUrl?.trim()) {
    return company.apiUrl.trim().replace(/\/+$/, "");
  }

  const careersUrl = normalizeBaseUrl(
    company.careersUrl
  );
  const parsed = new URL(careersUrl);

  return `${parsed.origin}/hcmRestApi/resources/latest`;
}

function buildSearchEndpoints(
  company: OracleCompany,
  offset: number
): string[] {
  const baseUrl = getApiBaseUrl(company);
  const siteNumber = getSiteNumber(company);

  const commonParams = new URLSearchParams({
    finder: `findReqs;siteNumber=${siteNumber}`,
    limit: String(PAGE_SIZE),
    offset: String(offset),
    onlyData: "true",
  });

  const endpoints = [
    `${baseUrl}/recruitingCEJobRequisitions?${commonParams.toString()}`,
    `${baseUrl}/recruitingCEJobRequisitions?limit=${PAGE_SIZE}&offset=${offset}&onlyData=true&siteNumber=${encodeURIComponent(
      siteNumber
    )}`,
    `${baseUrl}/recruitingCEJobRequisitions?limit=${PAGE_SIZE}&offset=${offset}&onlyData=true`,
  ];

  return Array.from(new Set(endpoints));
}

async function fetchJson(
  url: string,
  companyName: string
): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (compatible; CorporateJobsNetwork/1.0)",
    },
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Oracle Recruiting request failed for ${companyName}: ${response.status}`
    );
  }

  return response.json();
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
      `Unable to fetch Oracle job page for ${companyName}: ${response.status}`
    );
  }

  return response.text();
}

function asOracleResponse(
  value: unknown
): OracleApiResponse {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as OracleApiResponse;
}

async function fetchListPage(
  company: OracleCompany,
  offset: number
): Promise<OracleApiResponse> {
  const endpoints = buildSearchEndpoints(
    company,
    offset
  );

  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const result = await fetchJson(
        endpoint,
        company.name
      );

      const parsed = asOracleResponse(result);
      const items = parsed.items || parsed.Items;

      if (Array.isArray(items)) {
        return parsed;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        `Unable to fetch Oracle Recruiting jobs for ${company.name}.`
      );
}

async function fetchAllListItems(
  company: OracleCompany
): Promise<OracleRequisitionListItem[]> {
  const jobs: OracleRequisitionListItem[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await fetchListPage(
      company,
      offset
    );

    const items = response.items || response.Items || [];

    if (items.length === 0) {
      break;
    }

    jobs.push(...items);

    if (jobs.length >= MAX_JOBS) {
      return jobs.slice(0, MAX_JOBS);
    }

    const hasMore =
      response.hasMore ??
      response.HasMore ??
      false;

    if (!hasMore && items.length < PAGE_SIZE) {
      break;
    }

    offset += items.length;
  }

  return jobs;
}

function getSourceJobId(
  item: OracleRequisitionListItem
): string {
  return firstString(
    item.RequisitionId,
    item.requisitionId,
    item.Id,
    item.id
  );
}

function getJobUrl(
  company: OracleCompany,
  item: OracleRequisitionListItem
): string {
  const directUrl = firstString(
    item.CanonicalUrl,
    item.canonicalUrl,
    item.JobUrl,
    item.jobUrl,
    item.ApplyUrl,
    item.applyUrl
  );

  if (directUrl) {
    return absoluteUrl(
      normalizeBaseUrl(company.careersUrl),
      directUrl
    );
  }

  const sourceJobId = getSourceJobId(item);
  const careersUrl = normalizeBaseUrl(
    company.careersUrl
  );

  if (!sourceJobId) {
    return careersUrl;
  }

  const base = careersUrl.replace(/\/+$/, "");

  if (/\/job\//i.test(base)) {
    return `${base}/${encodeURIComponent(
      sourceJobId
    )}`;
  }

  return `${base}/job/${encodeURIComponent(
    sourceJobId
  )}`;
}

async function fetchDetailFromApi(
  company: OracleCompany,
  sourceJobId: string
): Promise<OracleRequisitionDetail | null> {
  if (!sourceJobId) {
    return null;
  }

  const baseUrl = getApiBaseUrl(company);
  const siteNumber = getSiteNumber(company);

  const candidates = [
    `${baseUrl}/recruitingCEJobRequisitions/${encodeURIComponent(
      sourceJobId
    )}?onlyData=true`,
    `${baseUrl}/recruitingCEJobRequisitions?finder=findReqs;siteNumber=${encodeURIComponent(
      siteNumber
    )},requisitionId=${encodeURIComponent(
      sourceJobId
    )}&onlyData=true`,
  ];

  for (const url of candidates) {
    try {
      const result = await fetchJson(
        url,
        company.name
      );

      if (
        result &&
        typeof result === "object" &&
        !Array.isArray(result)
      ) {
        const objectResult = result as {
          items?: OracleRequisitionDetail[];
        };

        if (Array.isArray(objectResult.items)) {
          return objectResult.items[0] || null;
        }

        return result as OracleRequisitionDetail;
      }
    } catch {
      // Continue to the next detail endpoint.
    }
  }

  return null;
}

function getLocationFromApi(
  detail: OracleRequisitionDetail
): string {
  const direct = firstString(
    detail.PrimaryLocation,
    detail.primaryLocation
  );

  if (direct) {
    return direct;
  }

  const locations =
    detail.Locations ||
    detail.locations ||
    [];

  const parts = locations
    .map((location) =>
      firstString(
        location.name,
        [
          location.city,
          location.state,
          location.country,
        ]
          .filter(Boolean)
          .join(", ")
      )
    )
    .filter(Boolean);

  return Array.from(new Set(parts)).join(" | ");
}

function extractCountry(location: string): string {
  const parts = location
    .split(/[,|]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (
    /\b(india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|noida|gurugram|gurgaon|kolkata|ahmedabad|kochi|mysuru|mysore|mangaluru|mangalore|hubballi|hubli)\b/i.test(
      location
    )
  ) {
    return "India";
  }

  return parts.at(-1) || "Not Mentioned";
}

function getWorkMode(
  jobLocationType: string,
  description: string
): string {
  if (
    jobLocationType
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

function extractIdentifier(
  job: JsonLdJobPosting | null
): string {
  const identifier = job?.identifier;

  if (typeof identifier === "string") {
    return identifier.trim();
  }

  return identifier?.value?.trim() || "";
}

function mergeSkills(
  structured: string,
  text: string
): string[] {
  const provided = structured
    .split(/[,;\n|]/)
    .map((skill) => skill.trim())
    .filter(Boolean);

  return Array.from(
    new Set([...provided, ...extractSkills(text)])
  ).slice(0, 15);
}

async function parseJob(
  company: OracleCompany,
  item: OracleRequisitionListItem
): Promise<NormalizedImportedJob> {
  const sourceJobId = getSourceJobId(item);

  if (!sourceJobId) {
    throw new Error(
      `Oracle job id is missing for ${company.name}.`
    );
  }

  const apiDetail: OracleRequisitionDetail = {
    ...(item as OracleRequisitionDetail),
    ...((await fetchDetailFromApi(
      company,
      sourceJobId
    )) ?? {}),
  };

  const sourceUrl = getJobUrl(company, apiDetail);

  let html = "";
  let jsonLd: JsonLdJobPosting | null = null;

  try {
    html = await fetchHtml(
      sourceUrl,
      company.name
    );
    jsonLd = extractJobPostingJsonLd(html);
  } catch {
    // API data can still be used if the public page is unavailable.
  }

  const role =
    firstString(
      apiDetail.Title,
      apiDetail.title,
      apiDetail.JobTitle,
      apiDetail.jobTitle,
      jsonLd?.title,
      extractMetaContent(html, "og:title")
    ) || "Role Not Mentioned";

  const description = stripHtml(
    firstString(
      apiDetail.Description,
      apiDetail.description,
      apiDetail.JobDescription,
      apiDetail.jobDescription,
      jsonLd?.description,
      extractMetaContent(html, "description")
    )
  );

  const responsibilities = stripHtml(
    firstString(
      apiDetail.Responsibilities,
      apiDetail.responsibilities,
      jsonLd?.responsibilities
    )
  );

  const eligibility = stripHtml(
    [
      firstString(
        apiDetail.Qualifications,
        apiDetail.qualifications,
        apiDetail.MinimumQualifications,
        apiDetail.minimumQualifications,
        jsonLd?.qualifications
      ),
      firstString(
        apiDetail.PreferredQualifications,
        apiDetail.preferredQualifications
      ),
    ]
      .filter(Boolean)
      .join("\n\n")
  );

  const structuredLocation =
    getLocationFromApi(apiDetail);

  const jsonLdLocation = stringifyUnknown(
    jsonLd?.jobLocation ||
      jsonLd?.applicantLocationRequirements
  );

  const location =
    structuredLocation ||
    jsonLdLocation ||
    "Not Mentioned";

  const employmentType =
    normalizeEmploymentType(
      jsonLd?.employmentType
    ) !== "Not Mentioned"
      ? normalizeEmploymentType(
          jsonLd?.employmentType
        )
      : firstString(
          apiDetail.EmploymentType,
          apiDetail.employmentType,
          apiDetail.WorkerType,
          apiDetail.workerType
        ) || "Not Mentioned";

  const structuredSkills = stringifyUnknown(
    apiDetail.Skills ||
      apiDetail.skills ||
      jsonLd?.skills
  );

  const completeText = [
    description,
    responsibilities,
    eligibility,
  ]
    .filter(Boolean)
    .join("\n\n");

  const experience =
    firstString(
      apiDetail.ExperienceRequirements,
      apiDetail.experienceRequirements,
      stringifyUnknown(
        jsonLd?.experienceRequirements
      )
    ) ||
    extractByPattern(
      completeText,
      EXPERIENCE_PATTERNS,
      "Not Mentioned"
    );

  const education =
    firstString(
      apiDetail.EducationRequirements,
      apiDetail.educationRequirements,
      stringifyUnknown(
        jsonLd?.educationRequirements
      )
    ) ||
    extractByPattern(
      completeText,
      EDUCATION_PATTERNS,
      "Not Mentioned"
    );

  const structuredSalary =
    firstString(
      apiDetail.Salary,
      apiDetail.salary,
      apiDetail.Compensation,
      apiDetail.compensation
    ) || formatSalary(jsonLd?.baseSalary);

  const sourceCreatedAt =
    toIsoDate(
      firstString(
        apiDetail.PostedDate,
        apiDetail.postedDate,
        apiDetail.ExternalPostedStartDate,
        apiDetail.externalPostedStartDate,
        jsonLd?.datePosted
      )
    );

  const lastDate =
    firstString(
      apiDetail.ExternalPostedEndDate,
      apiDetail.externalPostedEndDate,
      jsonLd?.validThrough
    );

  const applyLink =
    firstString(
      apiDetail.ApplyUrl,
      apiDetail.applyUrl
    )
      ? absoluteUrl(
          normalizeBaseUrl(company.careersUrl),
          firstString(
            apiDetail.ApplyUrl,
            apiDetail.applyUrl
          )
        )
      : sourceUrl;

  const finalSourceJobId =
    extractIdentifier(jsonLd) ||
    sourceJobId;

  return {
    uniqueKey:
      `oracle_${company.slug}_${finalSourceJobId}`,

    source: "oracle",
    sourceJobId: finalSourceJobId,
    sourceCompanyId:
      company.siteNumber?.trim() ||
      company.boardId?.trim() ||
      company.slug,
    sourceUrl,

    company:
      firstString(
        apiDetail.HiringOrganization,
        apiDetail.hiringOrganization,
        apiDetail.OrganizationName,
        apiDetail.organizationName,
        jsonLd?.hiringOrganization?.name
      ) || company.name,
    companySlug: company.slug,
    companyLogo:
      jsonLd?.hiringOrganization?.logo?.trim() ||
      company.logo ||
      "",

    role,
    location,
    country: extractCountry(location),

    description,
    responsibilities,
    eligibility,
    benefits: stripHtml(
      firstString(
        apiDetail.Benefits,
        apiDetail.benefits
      )
    ),
    selectionProcess: "",

    experience,
    education,
    salary:
      structuredSalary ||
      extractByPattern(
        completeText,
        SALARY_PATTERNS,
        "Salary Not Disclosed"
      ),

    skills: mergeSkills(
      structuredSkills,
      completeText
    ),
    requiredSkills: extractSkills(
      `${eligibility}\n${completeText}`
    ),

    jobType: employmentType || "Private Job",
    category: determineJobCategory(
      role,
      completeText,
      location
    ),

    applyLink,

    workMode: getWorkMode(
      jsonLd?.jobLocationType || "",
      completeText
    ),
    employmentType,
    lastDate,

    importedAutomatically: true,
    trustedCompany: company.trusted,

    reviewStatus: "pending",
    processingStatus: "completed",

    status: "draft",
    isActive: true,

    sourceCreatedAt,
    sourceUpdatedAt: null,

    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchOracleJobs(
  company: OracleCompany
): Promise<NormalizedImportedJob[]> {
  const listItems = await fetchAllListItems(company);
  const jobs: NormalizedImportedJob[] = [];
  const seen = new Set<string>();

  for (const item of listItems) {
    try {
      const job = await parseJob(company, item);

      if (
        !job.sourceJobId ||
        seen.has(job.uniqueKey)
      ) {
        continue;
      }

      seen.add(job.uniqueKey);
      jobs.push(job);
    } catch (error) {
      console.error(
        `Skipped Oracle job for ${company.name}:`,
        error
      );
    }
  }

  return jobs;
}