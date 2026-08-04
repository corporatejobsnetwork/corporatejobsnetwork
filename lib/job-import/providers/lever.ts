import { determineJobCategory } from "../filters";
import type {
  LeverCompany,
  NormalizedImportedJob,
} from "../types";

interface LeverCategories {
  location?: string;
  allLocations?: string[];
  commitment?: string;
  team?: string;
  department?: string;
  level?: string;
}

interface LeverList {
  text?: string;
  content?: string;
}

interface LeverSalaryRange {
  currency?: string;
  interval?: string;
  min?: number;
  max?: number;
}

interface LeverJob {
  id: string;
  text: string;

  categories?: LeverCategories;
  country?: string | null;

  opening?: string;
  openingPlain?: string;

  description?: string;
  descriptionPlain?: string;

  descriptionBody?: string;
  descriptionBodyPlain?: string;

  lists?: LeverList[];

  additional?: string;
  additionalPlain?: string;

  hostedUrl?: string;
  applyUrl?: string;

  workplaceType?: "unspecified" | "on-site" | "remote" | "hybrid";

  salaryRange?: LeverSalaryRange;
  salaryDescription?: string;
  salaryDescriptionPlain?: string;

  createdAt?: number;
}

const INDIA_LOCATION_PATTERN =
  /\b(india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|noida|gurugram|gurgaon|kolkata|ahmedabad|kochi|cochin|trivandrum|thiruvananthapuram|jaipur|chandigarh|indore|bhubaneswar|mysuru|mysore|mangaluru|mangalore|hubballi|hubli)\b/i;

const EXPERIENCE_PATTERNS = [
  /\b(\d+)\s*(?:-|–|—|to)\s*(\d+)\s*\+?\s*years?(?:\s+of\s+experience)?\b/i,
  /\b(?:minimum\s+(?:of\s+)?|at\s+least\s+)?(\d+)\s*\+\s*years?(?:\s+of\s+experience)?\b/i,
  /\b(?:minimum\s+(?:of\s+)?|at\s+least\s+)(\d+)\s*years?(?:\s+of\s+experience)?\b/i,
  /\b(\d+)\s*years?\s+of\s+experience\b/i,
  /\b(freshers?)\b/i,
  /\b(entry[- ]level)\b/i,
  /\b(no experience required)\b/i,
];

const EDUCATION_PATTERNS = [
  /\b(?:bachelor'?s?|master'?s?)\s+(?:degree\s+)?(?:in\s+)?[^.\n;]{2,120}/i,
  /\b(?:B\.?\s*Tech|M\.?\s*Tech|BCA|MCA|BBA|MBA|B\.?\s*Com|M\.?\s*Com)\b[^.\n;]{0,120}/i,
  /\b(?:B\.?\s*E\.?|M\.?\s*E\.?)\b[^.\n;]{0,120}/,
  /\b(?:graduate|graduation|undergraduate|postgraduate|post graduation|diploma)\b[^.\n;]{0,120}/i,
  /\b(?:degree|qualification)\s+(?:in|from)\s+[^.\n;]{2,120}/i,
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
    .replace(/<\/(?:p|div|h1|h2|h3|h4|h5|h6|ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanText(value?: string): string {
  return stripHtml(value || "");
}

function uniqueLines(values: string[]): string[] {
  const seen = new Set<string>();

  return values
    .map((value) => value.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function listContent(job: LeverJob, names: RegExp[]): string {
  const matched = (job.lists || [])
    .filter((list) =>
      names.some((pattern) => pattern.test(list.text?.trim() || ""))
    )
    .flatMap((list) => cleanText(list.content).split("\n"));

  return uniqueLines(matched).slice(0, 30).join("\n");
}

function buildDescription(job: LeverJob): string {
  const sections = [
    job.openingPlain || cleanText(job.opening),
    job.descriptionBodyPlain || cleanText(job.descriptionBody),
    !job.descriptionBodyPlain && !job.descriptionBody
      ? job.descriptionPlain || cleanText(job.description)
      : "",
    ...(job.lists || []).map((list) => {
      const title = list.text?.trim() || "";
      const content = cleanText(list.content);

      return [title, content].filter(Boolean).join("\n");
    }),
    job.additionalPlain || cleanText(job.additional),
  ];

  return uniqueLines(
    sections
      .filter(Boolean)
      .join("\n\n")
      .split("\n")
  ).join("\n");
}

function normalizeExperienceValue(
  value: string
): string {
  const normalized = value
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Not Mentioned";
  }

  if (/^freshers?$/i.test(normalized)) {
    return "Freshers";
  }

  if (
    /^(entry[- ]level|no experience required)$/i.test(
      normalized
    )
  ) {
    return "0-2 years";
  }

  const rangeMatch = normalized.match(
    /\b(\d+)\s*(?:-|to)\s*(\d+)\s*years?\b/i
  );

  if (rangeMatch) {
    return `${rangeMatch[1]}-${rangeMatch[2]} years`;
  }

  const plusMatch = normalized.match(
    /\b(\d+)\s*\+\s*years?\b/i
  );

  if (plusMatch) {
    return `${plusMatch[1]}+ years`;
  }

  const singleMatch = normalized.match(
    /\b(\d+)\s*years?\b/i
  );

  if (singleMatch) {
    const years = Number(singleMatch[1]);

    return years >= 5
      ? `${years}+ years`
      : `${years} years`;
  }

  return normalized;
}

function inferExperienceFromRole(
  role: string
): string {
  const value = role.toLowerCase();

  if (
    /\b(intern|internship|apprentice|trainee)\b/.test(
      value
    )
  ) {
    return "Internship";
  }

  if (
    /\b(graduate|junior|entry[- ]level|associate)\b/.test(
      value
    )
  ) {
    return "0-2 years";
  }

  if (
    /\b(chief|principal|director|head|vice president|vp)\b/.test(
      value
    )
  ) {
    return "10+ years";
  }

  if (
    /\b(team leader|team lead|lead|manager|architect|staff)\b/.test(
      value
    )
  ) {
    return "7+ years";
  }

  if (
    /\b(senior|specialist|consultant|account executive|sales executive)\b/.test(
      value
    )
  ) {
    return "5+ years";
  }

  if (
    /\b(engineer|developer|administrator|analyst|designer|executive|officer|coordinator)\b/.test(
      value
    )
  ) {
    return "3-5 years";
  }

  return "Not Mentioned";
}

function extractExperience(
  text: string,
  role = ""
): string {
  const normalizedText = text
    .replace(/[–—]/g, "-")
    .replace(
      /\b(\d)\s*(\d)\s*years?\b/g,
      "$1-$2 years"
    );

  const rangeMatch = normalizedText.match(
    /\b(\d+)\s*(?:-|to)\s*(\d+)\s*\+?\s*years?(?:\s+of\s+experience)?\b/i
  );

  if (rangeMatch) {
    return `${rangeMatch[1]}-${rangeMatch[2]} years`;
  }

  for (const pattern of EXPERIENCE_PATTERNS) {
    const match = normalizedText.match(pattern);

    if (!match) {
      continue;
    }

    if (match[2]) {
      return normalizeExperienceValue(
        `${match[1]}-${match[2]} years`
      );
    }

    if (match[1]) {
      const capturedValue = match[1];

      if (/^\d+$/.test(capturedValue)) {
        const fullMatch = match[0];

        if (/\+\s*years?/i.test(fullMatch)) {
          return `${capturedValue}+ years`;
        }

        return `${capturedValue} years`;
      }

      return normalizeExperienceValue(
        capturedValue
      );
    }
  }

  const experienceSignals = [
    /\bproven experience\b/i,
    /\brelevant experience\b/i,
    /\bprevious experience\b/i,
    /\bdemonstrated experience\b/i,
    /\bexperience in\b/i,
    /\bexperience with\b/i,
    /\btrack record\b/i,
  ];

  const signalCount =
    experienceSignals.filter((pattern) =>
      pattern.test(normalizedText)
    ).length;

  if (signalCount >= 2) {
    return "3-5 years";
  }

  const roleFallback =
    inferExperienceFromRole(role);

  if (roleFallback !== "Not Mentioned") {
    return roleFallback;
  }

  if (signalCount === 1) {
    return "2-5 years";
  }

  return "Not Mentioned";
}

function cleanEducationCandidate(
  value: string
): string {
  return value
    .replace(/^[-•*]\s*/, "")
    .replace(/\s+/g, " ")
    .replace(
      /^(education|qualification|qualifications)\s*:\s*/i,
      ""
    )
    .trim();
}

function isValidEducationCandidate(
  value: string
): boolean {
  const normalized = value.toLowerCase();

  if (value.length < 4 || value.length > 180) {
    return false;
  }

  if (
    /should be able|must be able|ability to|communication of plans|targets to the team|be the voice|be a part of the story|become an expert|build a strong pipeline/i.test(
      value
    )
  ) {
    return false;
  }

  return (
    /\b(bachelor|master|degree|graduate|graduation|undergraduate|postgraduate|post graduation|diploma|b\.?\s*tech|m\.?\s*tech|bca|mca|bba|mba|b\.?\s*com|m\.?\s*com)\b/i.test(
      normalized
    ) ||
    /\b(?:B\.?\s*E\.?|M\.?\s*E\.?)\b/.test(
      value
    )
  );
}

function extractEducation(text: string): string {
  const lines = text
    .split("\n")
    .map(cleanEducationCandidate)
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (
      /^(education|qualification|qualifications)\s*:?\s*$/i.test(
        line
      )
    ) {
      const nextLine = lines[index + 1] || "";

      if (isValidEducationCandidate(nextLine)) {
        return nextLine;
      }
    }

    if (isValidEducationCandidate(line)) {
      for (const pattern of EDUCATION_PATTERNS) {
        const match = line.match(pattern);

        if (match?.[0]) {
          return cleanEducationCandidate(
            match[0]
          );
        }
      }

      return line;
    }
  }

  for (const pattern of EDUCATION_PATTERNS) {
    const match = text.match(pattern);

    if (
      match?.[0] &&
      isValidEducationCandidate(match[0])
    ) {
      return cleanEducationCandidate(
        match[0]
      );
    }
  }

  return "Not Mentioned";
}

function formatSalaryRange(range?: LeverSalaryRange): string {
  if (
    !range ||
    typeof range.min !== "number" ||
    typeof range.max !== "number"
  ) {
    return "";
  }

  const currency = range.currency?.trim() || "";
  const interval = range.interval?.trim() || "";

  const formatter = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  });

  const min = formatter.format(range.min);
  const max = formatter.format(range.max);

  return `${currency} ${min} - ${max}${interval ? ` ${interval}` : ""}`.trim();
}

function extractSalary(job: LeverJob, text: string): string {
  const plainSalary =
    job.salaryDescriptionPlain ||
    cleanText(job.salaryDescription) ||
    formatSalaryRange(job.salaryRange);

  if (plainSalary.trim()) {
    return plainSalary.replace(/\s+/g, " ").trim();
  }

  for (const pattern of SALARY_PATTERNS) {
    const match = text.match(pattern);

    if (match?.[0]) {
      return match[0].replace(/\s+/g, " ").trim();
    }
  }

  return "Salary Not Disclosed";
}

function extractSkills(text: string): string[] {
  return SKILLS.filter(([, patterns]) =>
    patterns.some((pattern) => pattern.test(text))
  )
    .map(([label]) => label)
    .slice(0, 15);
}

function getLocation(job: LeverJob): string {
  const allLocations = job.categories?.allLocations || [];
  const locations = uniqueLines([
    job.categories?.location || "",
    ...allLocations,
  ]);

  return locations.join(", ") || "Not Mentioned";
}

function getCountry(job: LeverJob, location: string): string {
  if (job.country?.toUpperCase() === "IN") {
    return "India";
  }

  if (INDIA_LOCATION_PATTERN.test(location)) {
    return "India";
  }

  return job.country?.trim() || "Not Mentioned";
}

function getJobType(job: LeverJob): string {
  return job.categories?.commitment?.trim() || "Private Job";
}

function getEmploymentType(job: LeverJob): string {
  return job.categories?.commitment?.trim() || "Not Mentioned";
}

function getWorkMode(job: LeverJob): string {
  switch (job.workplaceType) {
    case "remote":
      return "Remote";
    case "hybrid":
      return "Hybrid";
    case "on-site":
      return "On-site";
    default:
      return "Not Mentioned";
  }
}

function toIsoDate(timestamp?: number): string | null {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return null;
  }

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function fetchLeverJobs(
  company: LeverCompany
): Promise<NormalizedImportedJob[]> {
  const site = encodeURIComponent(company.boardId);
  const url = `https://api.lever.co/v0/postings/${site}?mode=json`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "CorporateJobsNetwork/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch Lever jobs for ${company.name}: ${response.status}`
    );
  }

  const jobs = (await response.json()) as LeverJob[];

  if (!Array.isArray(jobs)) {
    throw new Error(
      `Invalid Lever response received for ${company.name}.`
    );
  }

  return jobs.map((job) => {
    const description = buildDescription(job);
    const location = getLocation(job);

    const responsibilities = listContent(job, [
      /responsibilit/i,
      /what you(?:'|’)ll do/i,
      /what you will do/i,
      /day[- ]to[- ]day/i,
    ]);

    const eligibility = listContent(job, [
      /requirement/i,
      /qualification/i,
      /eligibility/i,
      /what we(?:'|’)re looking for/i,
      /who you are/i,
    ]);

    const benefits = listContent(job, [
      /benefit/i,
      /perk/i,
      /what we offer/i,
      /why join/i,
    ]);

    const selectionProcess = listContent(job, [
      /selection process/i,
      /interview process/i,
      /hiring process/i,
    ]);

    const requiredSkillsSource =
      eligibility || description;

    const hostedUrl =
      job.hostedUrl?.trim() ||
      `https://jobs.lever.co/${company.boardId}/${job.id}`;

    const applyLink =
      job.applyUrl?.trim() ||
      `${hostedUrl}/apply`;

    return {
      uniqueKey: `lever_${company.boardId}_${job.id}`,

      source: "lever",
      sourceJobId: job.id,
      sourceCompanyId: company.boardId,
      sourceUrl: hostedUrl,

      company: company.name,
      companySlug: company.slug,
      companyLogo: company.logo || "",

      role: job.text?.trim() || "Role Not Mentioned",
      location,
      country: getCountry(job, location),

      description,
      responsibilities,
      eligibility,
      benefits,
      selectionProcess,

      experience: extractExperience(
        description,
        job.text || ""
      ),
      education: extractEducation(description),
      salary: extractSalary(job, description),

      skills: extractSkills(description),
      requiredSkills: extractSkills(requiredSkillsSource),

      jobType: getJobType(job),
      category: determineJobCategory(
        job.text || "",
        description,
        location
      ),

      applyLink,

      workMode: getWorkMode(job),
      employmentType: getEmploymentType(job),
      lastDate: "",

      importedAutomatically: true,
      trustedCompany: company.trusted,

      reviewStatus: "pending",
      processingStatus: "completed",

      status: "draft",
      isActive: true,

      sourceCreatedAt: toIsoDate(job.createdAt),
      sourceUpdatedAt: null,

      fetchedAt: new Date().toISOString(),
    };
  });
}