import {
  determineJobCategory,
  shouldImportJob,
} from "../filters";
import {
  cleanImportedJobContent,
  looksLikeNonJobPage,
} from "@/lib/job-content-cleaner";
import type {
  CustomCompany,
  NormalizedImportedJob,
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
  url?: string;
}

const MAX_PAGES = 100;
const MAX_JOBS = 3000;

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

function extractAllJobPostings(
  html: string
): JsonLdJobPosting[] {
  const jobs: JsonLdJobPosting[] = [];
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
        jobs.push(item as JsonLdJobPosting);
      }
    }
  }

  return jobs;
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

function extractTitle(html: string): string {
  const heading =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ||
    html.match(/<h2[^>]*class=["'][^"']*(?:job-title|title)[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i)?.[1] ||
    "";

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

function extractIdentifier(
  job: JsonLdJobPosting | null,
  url: string
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

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname
      .split("/")
      .filter(Boolean);

    return (
      segments.at(-1) ||
      parsed.pathname
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  } catch {
    return url
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
}

function extractLocationFromText(text: string): string {
  const patterns = [
    /(?:job location|location)\s*[:\-]\s*([^\n]{2,120})/i,
    /(?:based in|work location)\s*[:\-]?\s*([^\n]{2,120})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function extractCountry(location: string): string {
  if (
    /\b(india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|new delhi|noida|gurugram|gurgaon|kolkata|ahmedabad|kochi|cochin|thiruvananthapuram|trivandrum|jaipur|chandigarh|indore|bhubaneswar|mysuru|mysore|mangaluru|mangalore|hubballi|hubli)\b/i.test(
      location
    )
  ) {
    return "India";
  }

  const parts = location
    .split(/[,|]/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.at(-1) || "Not Mentioned";
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

const BLOCKED_LINK_TEXT_PATTERNS: RegExp[] = [
  /^careers?$/i,
  /^jobs?$/i,
  /^search(?: jobs?)?$/i,
  /^explore(?: opportunities| openings)?$/i,
  /^explore opportunities by location$/i,
  /^graduates?$/i,
  /^experienced professionals?$/i,
  /^internships?$/i,
  /^our culture$/i,
  /^hear from our employees$/i,
  /^employee stories$/i,
  /^recruitment fraud(?: alert)?$/i,
  /^about us$/i,
  /^apply(?: now)?$/i,
  /^join us$/i,
  /^learn more$/i,
  /^view all$/i,
];

const JOB_LINK_TEXT_SIGNALS = [
  "engineer",
  "developer",
  "analyst",
  "consultant",
  "architect",
  "manager",
  "specialist",
  "associate",
  "executive",
  "lead",
  "director",
  "intern",
  "trainee",
  "designer",
  "scientist",
  "administrator",
  "coordinator",
  "officer",
  "recruiter",
];

function normalizeAnchorText(value: string): string {
  return stripHtml(value)
    .replace(/\s+/g, " ")
    .trim();
}

function hasJobIdentifier(url: URL): boolean {
  const value = `${url.pathname}${url.search}`.toLowerCase();

  return (
    /(?:^|[?&])(?:jobid|job_id|job|requisitionid|requisition_id|reqid|req_id|positionid|position_id)=?[^&]+/.test(
      value
    ) ||
    /\/(?:job|jobs|position|positions|requisition|requisitions|vacancy|vacancies|opening|openings)\/[a-z0-9][a-z0-9._-]{2,}/i.test(
      url.pathname
    ) ||
    /\/[a-z0-9-]*(?:job|position|requisition|vacancy|opening)[-_][a-z0-9._-]+/i.test(
      url.pathname
    )
  );
}

function isBlockedJobUrl(url: URL): boolean {
  const value = `${url.pathname}${url.search}`.toLowerCase();

  return (
    /privacy|terms|cookie|login|register|profile|talent-community|fraud|culture|about-us|employee-stories|graduates?|internships?$/.test(
      value
    ) ||
    /\/(?:search|job-search|jobs-search)(?:\/|$)/.test(value) ||
    /\/(?:jobs?|careers?)(?:\/)?$/.test(value)
  );
}

function looksLikeJobUrl(
  url: string,
  anchorText = ""
): boolean {
  try {
    const parsed = new URL(url);
    const normalizedText = normalizeAnchorText(anchorText);

    if (isBlockedJobUrl(parsed)) {
      return false;
    }

    if (
      normalizedText &&
      BLOCKED_LINK_TEXT_PATTERNS.some((pattern) =>
        pattern.test(normalizedText)
      )
    ) {
      return false;
    }

    if (hasJobIdentifier(parsed)) {
      return true;
    }

    const textValue = normalizedText.toLowerCase();
    const hasRoleSignal = JOB_LINK_TEXT_SIGNALS.some((signal) =>
      textValue.includes(signal)
    );

    const pathValue = parsed.pathname.toLowerCase();
    const hasJobPath =
      /\/(?:job|jobs|position|positions|requisition|requisitions|vacancy|vacancies|opening|openings)\//.test(
        pathValue
      );

    return hasJobPath && hasRoleSignal;
  } catch {
    return false;
  }
}

function extractJobLinks(
  html: string,
  baseUrl: string
): string[] {
  const links = new Set<string>();
  const anchorPattern =
    /<a\b([^>]*)href=["']([^"'#]+)["']([^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = decodeHtmlEntities(match[2]).trim();
    const anchorText = normalizeAnchorText(match[4] || "");

    if (
      !href ||
      href.startsWith("javascript:") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      continue;
    }

    const url = absoluteUrl(baseUrl, href);

    if (url && looksLikeJobUrl(url, anchorText)) {
      links.add(url);
    }
  }

  return Array.from(links);
}

function extractNextPageUrl(
  html: string,
  currentUrl: string
): string {
  const patterns = [
    /<a[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i,
    /<a[^>]+href=["']([^"']+)["'][^>]*>\s*(?:Next|›|»)\s*<\/a>/i,
    /<a[^>]+aria-label=["'][^"']*next[^"']*["'][^>]+href=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
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
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0 Safari/537.36",
    },
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch custom careers page for ${companyName}: ${response.status}`
    );
  }

 const html = await response.text();

if (companyName === "Infosys") {
  console.log("======================================");
  console.log("INFOSYS FETCH DEBUG");
  console.log("======================================");
  console.log("URL:", url);
  console.log("Final URL:", response.url);
  console.log("Status:", response.status);
  console.log(
    "Content-Type:",
    response.headers.get("content-type")
  );
  console.log("HTML Length:", html.length);
  console.log("First 1000 characters:");
  console.log(html.substring(0, 1000));
  console.log("======================================");
}

return html;
}

async function collectJobSources(
  company: CustomCompany
): Promise<
  Array<{
    url: string;
    embeddedJob?: JsonLdJobPosting;
  }>
> {
  const baseUrl = normalizeBaseUrl(
    company.apiUrl?.trim() ||
      company.careersUrl
  );

  const queue = [baseUrl];
  const visited = new Set<string>();
  const sources = new Map<
    string,
    {
      url: string;
      embeddedJob?: JsonLdJobPosting;
    }
  >();

  for (
    let page = 0;
    page < MAX_PAGES && queue.length > 0;
    page += 1
  ) {
    const currentUrl = queue.shift();

    if (!currentUrl || visited.has(currentUrl)) {
      continue;
    }

    visited.add(currentUrl);

    const html = await fetchHtml(
      currentUrl,
      company.name
    );

    const embeddedJobs = extractAllJobPostings(html);

    for (const embeddedJob of embeddedJobs) {
      const embeddedUrl = absoluteUrl(
        currentUrl,
        embeddedJob.url || ""
      );

      const sourceUrl =
        embeddedUrl ||
        currentUrl;

      sources.set(
        `${sourceUrl}_${extractIdentifier(
          embeddedJob,
          sourceUrl
        )}`,
        {
          url: sourceUrl,
          embeddedJob,
        }
      );

      if (sources.size >= MAX_JOBS) {
        return Array.from(sources.values());
      }
    }

    const jobLinks = extractJobLinks(
      html,
      currentUrl
    );

    for (const jobLink of jobLinks) {
      sources.set(jobLink, {
        url: jobLink,
      });

      if (sources.size >= MAX_JOBS) {
        return Array.from(sources.values());
      }
    }

    const nextPage = extractNextPageUrl(
      html,
      currentUrl
    );

    if (
      nextPage &&
      !visited.has(nextPage) &&
      !queue.includes(nextPage)
    ) {
      queue.push(nextPage);
    }
  }

  return Array.from(sources.values());
}

async function parseJob(
  company: CustomCompany,
  source: {
    url: string;
    embeddedJob?: JsonLdJobPosting;
  }
): Promise<NormalizedImportedJob> {
  let html = "";
  let job = source.embeddedJob || null;

  if (!job || !job.description) {
    html = await fetchHtml(
      source.url,
      company.name
    );

    job = extractJobPostingJsonLd(html) || job;
  }

  const fallbackText = html
    ? stripHtml(html)
    : "";

  const role =
    stripHtml(job?.title || "") ||
    extractTitle(html) ||
    "Role Not Mentioned";

  const rawDescription =
    stripHtml(job?.description || "") ||
    extractMetaContent(html, "description") ||
    fallbackText;

  const rawResponsibilities =
    stripHtml(job?.responsibilities || "");

  const rawEligibility =
    stripHtml(job?.qualifications || "");

  const cleanedContent = cleanImportedJobContent(
    [
      rawDescription,
      rawResponsibilities,
      rawEligibility,
    ]
      .filter(Boolean)
      .join("\n\n")
  );

  const description =
    cleanedContent.description ||
    rawDescription;

  const responsibilities =
    cleanedContent.responsibilities ||
    rawResponsibilities;

  const eligibility =
    cleanedContent.eligibility ||
    rawEligibility;

  const benefits =
    cleanedContent.benefits || "";

  const selectionProcess =
    cleanedContent.selectionProcess || "";

  const location =
    stringifyUnknown(
      job?.jobLocation ||
        job?.applicantLocationRequirements
    ) ||
    extractLocationFromText(
      `${description}\n${fallbackText}`
    ) ||
    company.defaultLocation ||
    "Not Mentioned";

  const sourceJobId = extractIdentifier(
    job,
    source.url
  );

  const employmentType =
    normalizeEmploymentType(
      job?.employmentType
    );

  const structuredSkills = stringifyUnknown(
    job?.skills
  )
    .split(/[,;\n|]/)
    .map((skill) => skill.trim())
    .filter(Boolean);

  const completeText = [
    description,
    responsibilities,
    eligibility,
    benefits,
    selectionProcess,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (
    looksLikeNonJobPage(
      role,
      completeText
    )
  ) {
    throw new Error(
      `Rejected non-job page: ${role}`
    );
  }

  const skills = Array.from(
    new Set([
      ...structuredSkills,
      ...extractSkills(completeText),
    ])
  ).slice(0, 15);

  const salary =
    formatSalary(job?.baseSalary) ||
    extractByPattern(
      completeText,
      SALARY_PATTERNS,
      "Salary Not Disclosed"
    );

  return {
    uniqueKey:
      `custom_${company.slug}_${sourceJobId}`,

    source: "custom",
    sourceJobId,
    sourceCompanyId:
      company.boardId?.trim() ||
      company.slug,
    sourceUrl: source.url,

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
    benefits,
    selectionProcess,

    experience:
      stringifyUnknown(
        job?.experienceRequirements
      ) ||
      extractByPattern(
        completeText,
        EXPERIENCE_PATTERNS,
        "Not Mentioned"
      ),

    education:
      stringifyUnknown(
        job?.educationRequirements
      ) ||
      extractByPattern(
        `${eligibility}\n${completeText}`,
        EDUCATION_PATTERNS,
        "Not Mentioned"
      ),

    salary,

    skills,
    requiredSkills: extractSkills(
      `${eligibility}\n${completeText}`
    ),

    jobType:
      employmentType || "Private Job",
    category: determineJobCategory(
      role,
      completeText,
      location
    ),

    applyLink: source.url,

    workMode: getWorkMode(
      job,
      completeText
    ),
    employmentType,
    lastDate: job?.validThrough?.trim() || "",

    importedAutomatically: true,
    trustedCompany: company.trusted,

    reviewStatus: "pending",
    processingStatus: "completed",

    status: "draft",
    isActive: true,

    sourceCreatedAt: toIsoDate(
      job?.datePosted
    ),
    sourceUpdatedAt: null,

    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchCustomJobs(
  company: CustomCompany
): Promise<NormalizedImportedJob[]> {
  const sources = await collectJobSources(
    company
  );

  const jobs: NormalizedImportedJob[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    try {
      const job = await parseJob(
        company,
        source
      );

      if (
        !job.sourceJobId ||
        seen.has(job.uniqueKey)
      ) {
        continue;
      }

      if (!shouldImportJob(job)) {
        continue;
      }

      seen.add(job.uniqueKey);
      jobs.push(job);
    } catch (error) {
      console.error(
        `Skipped custom job for ${company.name}:`,
        error
      );
    }
  }

  return jobs;
}