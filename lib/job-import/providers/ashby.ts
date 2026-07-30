import { determineJobCategory } from "../filters";
import type {
  AshbyCompany,
  NormalizedImportedJob,
} from "../types";

interface AshbyPostalAddress {
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

interface AshbySecondaryLocation {
  location?: string;
  address?: AshbyPostalAddress;
}

interface AshbyCompensation {
  compensationTierSummary?: string;
  scrapeableCompensationSalarySummary?: string;
}

interface AshbyJob {
  title: string;
  location?: string;
  secondaryLocations?: AshbySecondaryLocation[];

  department?: string;
  team?: string;

  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;

  descriptionHtml?: string;
  descriptionPlain?: string;

  publishedAt?: string;
  employmentType?: string;

  address?: {
    postalAddress?: AshbyPostalAddress;
  };

  jobUrl?: string;
  applyUrl?: string;

  compensation?: AshbyCompensation;
}

interface AshbyResponse {
  apiVersion?: string;
  jobs?: AshbyJob[];
}

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

function cleanLine(value: string): string {
  return value
    .replace(/^[-•*#:\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeading(value: string): string {
  return cleanLine(value)
    .replace(/[:\-–—]\s*$/, "")
    .toLowerCase();
}

function extractSection(
  text: string,
  headings: string[]
): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const normalizedHeadings = headings.map((heading) =>
    normalizeHeading(heading)
  );

  const knownHeadings = [
    "about the role",
    "job description",
    "responsibilities",
    "roles and responsibilities",
    "requirements",
    "qualifications",
    "eligibility",
    "skills",
    "benefits",
    "perks",
    "selection process",
    "interview process",
  ];

  const result: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const normalized = normalizeHeading(line);

    const isTarget = normalizedHeadings.some(
      (heading) =>
        normalized === heading ||
        normalized.startsWith(`${heading}:`) ||
        normalized.startsWith(`${heading} -`)
    );

    if (isTarget) {
      collecting = true;

      const separatorIndex = line.search(/[:\-–—]/);

      if (separatorIndex >= 0) {
        const sameLineValue = cleanLine(
          line.slice(separatorIndex + 1)
        );

        if (sameLineValue) {
          result.push(sameLineValue);
        }
      }

      continue;
    }

    if (!collecting) {
      continue;
    }

    if (
      knownHeadings.some((heading) => normalized === heading)
    ) {
      break;
    }

    const cleaned = cleanLine(line);

    if (cleaned) {
      result.push(cleaned);
    }
  }

  return Array.from(new Set(result)).slice(0, 30).join("\n");
}

function extractExperience(text: string): string {
  for (const pattern of EXPERIENCE_PATTERNS) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].replace(/\s+/g, " ").trim();
    }
  }

  return "Not Mentioned";
}

function extractEducation(text: string): string {
  for (const pattern of EDUCATION_PATTERNS) {
    const match = text.match(pattern);

    if (match?.[0]) {
      return match[0].replace(/\s+/g, " ").trim();
    }
  }

  return "Not Mentioned";
}

function extractSalary(
  compensation: AshbyCompensation | undefined,
  text: string
): string {
  const compensationValue =
    compensation?.scrapeableCompensationSalarySummary ||
    compensation?.compensationTierSummary ||
    "";

  if (compensationValue.trim()) {
    return compensationValue.trim();
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

function getLocation(job: AshbyJob): string {
  const locations = [
    job.location || "",
    ...(job.secondaryLocations || []).map(
      (location) => location.location || ""
    ),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(locations)).join(", ") ||
    "Not Mentioned";
}

function getCountry(job: AshbyJob): string {
  const country =
    job.address?.postalAddress?.addressCountry ||
    job.secondaryLocations?.find(
      (location) => location.address?.addressCountry
    )?.address?.addressCountry ||
    "";

  return country.trim() || "Not Mentioned";
}

function getWorkMode(job: AshbyJob): string {
  if (job.workplaceType?.trim()) {
    return job.workplaceType.trim();
  }

  return job.isRemote ? "Remote" : "Not Mentioned";
}

function getJobId(job: AshbyJob): string {
  const source =
    job.jobUrl ||
    job.applyUrl ||
    `${job.title}_${job.location || ""}`;

  const fromUrl = source
    .split("/")
    .filter(Boolean)
    .pop();

  return (
    fromUrl ||
    source
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

function isValidDate(value?: string): boolean {
  if (!value) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

export async function fetchAshbyJobs(
  company: AshbyCompany
): Promise<NormalizedImportedJob[]> {
  const boardName = encodeURIComponent(company.boardId);
  const url =
    `https://api.ashbyhq.com/posting-api/job-board/${boardName}` +
    "?includeCompensation=true";

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "CorporateJobsNetwork/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch Ashby jobs for ${company.name}: ${response.status}`
    );
  }

  const data = (await response.json()) as AshbyResponse;

  if (!Array.isArray(data.jobs)) {
    throw new Error(
      `Invalid Ashby response received for ${company.name}.`
    );
  }

  return data.jobs
    .filter((job) => job.isListed !== false)
    .map((job) => {
      const description =
        job.descriptionPlain?.trim() ||
        stripHtml(job.descriptionHtml || "");

      const location = getLocation(job);
      const sourceJobId = getJobId(job);

      const responsibilities = extractSection(description, [
        "responsibilities",
        "roles and responsibilities",
        "key responsibilities",
        "what you will do",
        "what you'll do",
      ]);

      const eligibility = extractSection(description, [
        "eligibility",
        "requirements",
        "qualifications",
        "required qualifications",
        "minimum requirements",
        "who you are",
      ]);

      const benefits = extractSection(description, [
        "benefits",
        "benefits and perks",
        "perks",
        "what we offer",
        "why join us",
      ]);

      const selectionProcess = extractSection(description, [
        "selection process",
        "interview process",
        "hiring process",
      ]);

      const skills = extractSkills(description);
      const requiredSkills = extractSkills(
        eligibility || description
      );

      return {
        uniqueKey: `ashby_${company.boardId}_${sourceJobId}`,

        source: "ashby",
        sourceJobId,
        sourceCompanyId: company.boardId,
        sourceUrl: job.jobUrl?.trim() || job.applyUrl?.trim() || "",

        company: company.name,
        companySlug: company.slug,
        companyLogo: company.logo || "",

        role: job.title?.trim() || "Role Not Mentioned",
        location,
        country: getCountry(job),

        description,
        responsibilities,
        eligibility,
        benefits,
        selectionProcess,

        experience: extractExperience(description),
        education: extractEducation(description),
        salary: extractSalary(job.compensation, description),

        skills,
        requiredSkills,

        jobType: job.employmentType?.trim() || "Private Job",
        category: determineJobCategory(
          job.title || "",
          description,
          location
        ),

        applyLink:
          job.applyUrl?.trim() ||
          job.jobUrl?.trim() ||
          "",

        workMode: getWorkMode(job),
        employmentType:
          job.employmentType?.trim() || "Not Mentioned",
        lastDate: "",

        importedAutomatically: true,
        trustedCompany: company.trusted,

        reviewStatus: "pending",
        processingStatus: "completed",

        status: "draft",
        isActive: true,

        sourceCreatedAt: isValidDate(job.publishedAt)
          ? new Date(job.publishedAt as string).toISOString()
          : null,
        sourceUpdatedAt: null,

        fetchedAt: new Date().toISOString(),
      };
    });
}