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

interface SkillAlias {
  label: string;
  patterns: RegExp[];
}

const INDIA_LOCATION_PATTERN =
  /\b(india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|new delhi|noida|gurugram|gurgaon|kolkata|ahmedabad|kochi|cochin|trivandrum|thiruvananthapuram|jaipur|chandigarh|indore|bhubaneswar|mysuru|mysore|mangaluru|mangalore|hubballi|hubli)\b/i;

const SECTION_HEADINGS = [
  "about the role",
  "about this role",
  "job description",
  "role overview",
  "job summary",
  "position summary",
  "about the team",
  "who we are",
  "our story",
  "life at company",
  "company overview",
  "the opportunity",
  "responsibilities",
  "job responsibilities",
  "roles and responsibilities",
  "key responsibilities",
  "your responsibilities",
  "what you will do",
  "what you'll do",
  "what you’ll do",
  "day to day",
  "day-to-day",
  "what you will focus on",
  "requirements",
  "minimum requirements",
  "required qualifications",
  "minimum qualifications",
  "preferred qualifications",
  "desired qualifications",
  "qualifications",
  "eligibility",
  "who you are",
  "what we are looking for",
  "what we're looking for",
  "what we’re looking for",
  "skills and experience",
  "experience",
  "education",
  "benefits",
  "benefits and perks",
  "benefits & perks",
  "perks",
  "what we offer",
  "why join",
  "why join us",
  "selection process",
  "interview process",
  "hiring process",
];

const BOILERPLATE_START_PATTERNS = [
  /^equal employment opportunity/i,
  /^equal opportunity employer/i,
  /^we are an equal opportunity/i,
  /^diversity/i,
  /^inclusion/i,
  /^accessibility/i,
  /^privacy notice/i,
  /^privacy policy/i,
  /^applicant privacy/i,
  /^cookie policy/i,
  /^terms and conditions/i,
  /^legal/i,
  /^follow us on/i,
  /^connect with us on/i,
  /^know more about .* here/i,
  /^learn more/i,
  /^visit our website/i,
  /^about the company/i,
  /^about company/i,
  /^about meesho/i,
  /^about paytm/i,
  /^our mission/i,
  /^culture and total rewards/i,
  /^total rewards/i,
  /^#li[-_]/i,
  /^#remote/i,
  /^life at meesho/i,
  /^life at paytm/i,
  /^curious about life at/i,
  /^know more about/i,
  /^welcome to meesho/i,
  /^welcome to paytm/i,
];


const RESPONSIBILITY_ACTION_PATTERN =
  /^(?:handle|prepare|assist|work|support|coordinate|manage|perform|develop|design|build|maintain|lead|execute|monitor|review|analyse|analyze|identify|create|implement|ensure|deliver|drive|partner|collaborate|own|manage|conduct|track|resolve|provide|define|plan|operate|improve|establish|evaluate|process|reconcile|file|respond|liaise|oversee|participate|contribute|communicate|present|research|draft|maintain|organize|organise|follow|complete|achieve|meet|enable|facilitate|supervise|mentor|train|report|recommend|document|validate|test|deploy|troubleshoot|investigate|optimize|optimise|administer)\b/i;

const ELIGIBILITY_SIGNAL_PATTERN =
  /\b(?:degree|graduate|graduation|bachelor|master|b\.?\s*tech|m\.?\s*tech|b\.?\s*e\.?|m\.?\s*e\.?|bca|mca|bba|mba|b\.?\s*com|m\.?\s*com|diploma|experience|knowledge|skills?|qualification|certification|certified|proficient|proficiency|ability|must|required|preferred|familiarity|understanding|expertise|competency|competencies|excellent|strong|good command|willingness|sql|java|python|excel|erp|gst|finance|accounting|communication|analytical|problem[- ]solving)\b/i;

const BENEFIT_SIGNAL_PATTERN =
  /\b(?:health insurance|medical insurance|life insurance|paid leave|annual leave|holiday leave|parental leave|maternity leave|paternity leave|learning budget|development budget|flexible work|hybrid work|remote work|work from home|wellness|employee assistance|esop|stock options?|equity|bonus|retirement benefits?|provident fund|gratuity|meal allowance|travel allowance|internet allowance|recognition rewards?|priority pass|paid time off|pto)\b/i;

const COMPANY_PROMOTIONAL_PATTERN =
  /\b(?:it'?s no secret that|making massive leaps|work hard and party harder|largest .* ecosystem|registered users|merchants|our mission is|democrati[sz]ing|where every story begins|pioneer of the mobile qr|welcome to meesho|welcome to paytm|curious about life at|know more about|life at meesho|life at paytm)\b/i;


const ROLE_DESCRIPTION_START_PATTERN =
  /^(?:we are looking for|we'?re looking for|as an?|this role|in this role|the role|your role|you will|you'll|you’ll|the successful candidate|the ideal candidate|the position|this position|we seek|we are seeking|we'?re seeking)\b/i;

const COMPANY_INTRO_HEADING_PATTERN =
  /^(?:about us|about the company|about company|about the team|who we are|our story|our mission|life at .+|culture|company overview|why join(?: us)?|welcome to .+)\s*:?\s*$/i;

const COMPANY_INTRO_SENTENCE_PATTERN =
  /\b(?:founded in \d{4}|headquartered in|we are one of|we are india'?s|is india'?s|our company has|our journey|our story began|our mission is|registered users|million users|mn\+ users|merchants|largest .* platform|largest .* ecosystem|work hard and party harder|founder mindset|curious about life at)\b/i;

const EXPERIENCE_PATTERNS = [
  /\b(\d+\s*(?:-|–|—|to)\s*\d+\s*(?:\+?\s*)?years?(?:\s+of\s+experience)?)\b/i,
  /\b(\d+\+\s*years?(?:\s+of\s+experience)?)\b/i,
  /\b(?:minimum\s+(?:of\s+)?|at\s+least\s+)(\d+\s*years?(?:\s+of\s+experience)?)\b/i,
  /\b(\d+\s+years?\s+of\s+experience)\b/i,
  /\b(0\s*(?:-|–|—|to)\s*[12]\s*years?)\b/i,
  /\b(freshers?)\b/i,
  /\b(entry[- ]level)\b/i,
  /\b(no experience required)\b/i,
];

const SALARY_PATTERNS = [
  /₹\s?[\d,.]+\s*(?:-|–|—|to)\s*₹?\s?[\d,.]+\s*(?:per month|monthly|per annum|annually|lpa|lakhs?|ctc)?/i,
  /\bINR\s?[\d,.]+\s*(?:-|–|—|to)\s*(?:INR\s?)?[\d,.]+\s*(?:per month|monthly|per annum|annually|lpa|lakhs?|ctc)?\b/i,
  /\b\d+(?:\.\d+)?\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?\s*(?:LPA|lakhs?(?: per annum)?|CTC)\b/i,
  /(?:\$|€|£)\s?[\d,.]+\s*(?:-|–|—|to)\s*(?:\$|€|£)?\s?[\d,.]+\s*(?:per year|annually|per annum|per month|monthly)?/i,
  /\b(?:USD|EUR|GBP)\s?[\d,.]+\s*(?:-|–|—|to)\s*(?:USD|EUR|GBP)?\s?[\d,.]+\s*(?:per year|annually|per annum|per month|monthly)?\b/i,
  /\b(?:salary range|pay range|compensation range)\s*[:\-]\s*(?=[^.\n]*(?:₹|INR|LPA|lakhs?|CTC|\$|USD|€|EUR|£|GBP))[^.\n]{3,140}/i,
];

const SKILL_ALIASES: SkillAlias[] = [
  { label: "Java", patterns: [/\bjava\b/i] },
  { label: "JavaScript", patterns: [/\bjavascript\b/i, /\bjs\b/i] },
  { label: "TypeScript", patterns: [/\btypescript\b/i] },
  { label: "React", patterns: [/\breact(?:\.js)?\b/i] },
  { label: "Angular", patterns: [/\bangular(?:\.js)?\b/i] },
  { label: "Vue.js", patterns: [/\bvue(?:\.js)?\b/i] },
  { label: "Node.js", patterns: [/\bnode(?:\.js)?\b/i] },
  { label: "Python", patterns: [/\bpython\b/i] },
  { label: "PHP", patterns: [/\bphp\b/i] },
  { label: ".NET", patterns: [/(?:^|[^a-z0-9])\.net(?:[^a-z0-9]|$)/i] },
  { label: "C#", patterns: [/(?:^|[^a-z0-9])c#(?:[^a-z0-9]|$)/i] },
  { label: "C++", patterns: [/(?:^|[^a-z0-9])c\+\+(?:[^a-z0-9]|$)/i] },
  { label: "Go", patterns: [/\bgolang\b/i, /\bgo language\b/i] },
  { label: "Ruby", patterns: [/\bruby\b/i] },
  { label: "Ruby on Rails", patterns: [/\bruby on rails\b/i, /\brails\b/i] },
  { label: "Kotlin", patterns: [/\bkotlin\b/i] },
  { label: "Swift", patterns: [/\bswift\b/i] },
  { label: "SQL", patterns: [/\bsql\b/i] },
  { label: "MySQL", patterns: [/\bmysql\b/i] },
  { label: "PostgreSQL", patterns: [/\bpostgres(?:ql)?\b/i] },
  { label: "MongoDB", patterns: [/\bmongodb\b/i] },
  { label: "Oracle", patterns: [/\boracle database\b/i, /\boracle sql\b/i] },
  { label: "Redis", patterns: [/\bredis\b/i] },
  { label: "Spring Boot", patterns: [/\bspring\s*boot\b/i] },
  { label: "Spring", patterns: [/\bspring framework\b/i, /\bspring mvc\b/i] },
  { label: "Django", patterns: [/\bdjango\b/i] },
  { label: "Flask", patterns: [/\bflask\b/i] },
  { label: "AWS", patterns: [/\baws\b/i, /\bamazon web services\b/i] },
  { label: "Azure", patterns: [/\bazure\b/i] },
  { label: "GCP", patterns: [/\bgcp\b/i, /\bgoogle cloud(?: platform)?\b/i] },
  { label: "Docker", patterns: [/\bdocker\b/i] },
  { label: "Kubernetes", patterns: [/\bkubernetes\b/i, /\bk8s\b/i] },
  { label: "Linux", patterns: [/\blinux\b/i] },
  { label: "Git", patterns: [/\bgit\b/i] },
  { label: "GitHub", patterns: [/\bgithub\b/i] },
  { label: "Jenkins", patterns: [/\bjenkins\b/i] },
  { label: "CI/CD", patterns: [/\bci\s*\/?\s*cd\b/i] },
  { label: "REST APIs", patterns: [/\brest(?:ful)?\s+apis?\b/i] },
  { label: "GraphQL", patterns: [/\bgraphql\b/i] },
  { label: "Microservices", patterns: [/\bmicroservices?\b/i] },
  { label: "API Integration", patterns: [/\bapi integrations?\b/i] },
  { label: "Data Analysis", patterns: [/\bdata analysis\b/i, /\bdata analytics\b/i] },
  { label: "Machine Learning", patterns: [/\bmachine learning\b/i] },
  { label: "Artificial Intelligence", patterns: [/\bartificial intelligence\b/i, /\bgenerative ai\b/i] },
  { label: "Excel", patterns: [/\bmicrosoft excel\b/i, /\bms excel\b/i, /\bexcel\b/i] },
  { label: "Power BI", patterns: [/\bpower\s*bi\b/i] },
  { label: "Tableau", patterns: [/\btableau\b/i] },
  {
    label: "Communication Skills",
    patterns: [
      /\bcommunication skills?\b/i,
      /\bverbal and written communication\b/i,
      /\bwritten and verbal communication\b/i,
      /\bexcellent communication\b/i,
      /\bstrong communication\b/i,
    ],
  },
  { label: "Presentation Skills", patterns: [/\bpresentation skills?\b/i, /\bpresentation abilities\b/i] },
  { label: "Problem Solving", patterns: [/\bproblem[- ]solving\b/i, /\bsolve complex problems?\b/i] },
  { label: "Analytical Skills", patterns: [/\banalytical skills?\b/i, /\bstrong analytical\b/i, /\banalytical thinking\b/i] },
  { label: "Customer Facing", patterns: [/\bcustomer[- ]facing\b/i, /\bclient[- ]facing\b/i] },
  { label: "Stakeholder Management", patterns: [/\bstakeholder management\b/i, /\bmanage stakeholders?\b/i] },
  { label: "Project Management", patterns: [/\bproject management\b/i] },
  {
    label: "Team Collaboration",
    patterns: [
      /\bteam collaboration\b/i,
      /\bcollaborate with cross[- ]functional teams?\b/i,
      /\bcross[- ]functional collaboration\b/i,
    ],
  },
  { label: "Fintech", patterns: [/\bfintech\b/i, /\bfinancial technology\b/i] },
];

function decodeHtmlEntities(value: string): string {
  let decoded = value;

  for (let index = 0; index < 3; index += 1) {
    const nextValue = decoded
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

    if (nextValue === decoded) {
      break;
    }

    decoded = nextValue;
  }

  return decoded;
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

function normalizeHeading(value: string): string {
  return value
    .replace(/^[\s•◦▪▫◆◇♦◊■□●○►▶➤➢➣✓✔☑*+#:-]+/, "")
    .replace(/[:\-–—]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanSectionLine(value: string): string {
  return value
    .replace(/^[\s•◦▪▫◆◇♦◊■□●○►▶➤➢➣✓✔☑*+-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isKnownHeading(line: string): boolean {
  const normalized = normalizeHeading(line);

  return SECTION_HEADINGS.some(
    (heading) =>
      normalized === heading ||
      normalized.startsWith(`${heading}:`) ||
      normalized.startsWith(`${heading} -`)
  );
}

function isBoilerplateStart(line: string): boolean {
  const cleaned = cleanSectionLine(line);

  return (
    BOILERPLATE_START_PATTERNS.some((pattern) => pattern.test(cleaned)) ||
    /\bhttps?:\/\/\S+|\bwww\.\S+/i.test(cleaned)
  );
}

function uniqueLines(values: string[]): string[] {
  const unique = new Map<string, string>();

  for (const value of values) {
    const cleaned = cleanSectionLine(value);

    if (!cleaned) {
      continue;
    }

    unique.set(cleaned.toLowerCase(), cleaned);
  }

  return Array.from(unique.values());
}

function extractSection(
  text: string,
  headings: string[],
  maxLines = 25
): string[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const normalizedTargets = headings.map(normalizeHeading);
  const results: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const normalizedLine = normalizeHeading(line);
    const isTargetHeading = normalizedTargets.some(
      (heading) =>
        normalizedLine === heading ||
        normalizedLine.startsWith(`${heading}:`) ||
        normalizedLine.startsWith(`${heading} -`)
    );

    if (isTargetHeading) {
      collecting = true;

      const separatorIndex = line.search(/[:\-–—]/);

      if (separatorIndex >= 0) {
        const sameLineContent = cleanSectionLine(
          line.slice(separatorIndex + 1)
        );

        if (sameLineContent) {
          results.push(sameLineContent);
        }
      }

      continue;
    }

    if (!collecting) {
      continue;
    }

    if (isKnownHeading(line) || isBoilerplateStart(line)) {
      break;
    }

    const cleaned = cleanSectionLine(line);

    if (cleaned) {
      results.push(cleaned);
    }

    if (results.length >= maxLines) {
      break;
    }
  }

  return uniqueLines(results).slice(0, maxLines);
}

function buildCompleteDescription(job: LeverJob): string {
  const sections = [
    job.openingPlain || cleanText(job.opening),
    job.descriptionBodyPlain || cleanText(job.descriptionBody),
    job.descriptionPlain || cleanText(job.description),
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

function extractJobDescription(text: string): string {
  const stopHeadings = [
    "responsibilities",
    "job responsibilities",
    "roles and responsibilities",
    "key responsibilities",
    "what you will do",
    "what you'll do",
    "what you’ll do",
    "day to day",
    "day-to-day",
    "what you will focus on",
    "requirements",
    "minimum requirements",
    "required qualifications",
    "minimum qualifications",
    "preferred qualifications",
    "desired qualifications",
    "qualifications",
    "eligibility",
    "who you are",
    "what we are looking for",
    "what we're looking for",
    "what we’re looking for",
    "skills and experience",
    "benefits",
    "what we offer",
    "why join",
    "selection process",
    "interview process",
    "hiring process",
  ].map(normalizeHeading);

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const result: string[] = [];

  for (const line of lines) {
    const normalized = normalizeHeading(line);

    if (
      stopHeadings.some(
        (heading) =>
          normalized === heading ||
          normalized.startsWith(`${heading}:`) ||
          normalized.startsWith(`${heading} -`)
      )
    ) {
      break;
    }

    if (!isBoilerplateStart(line)) {
      result.push(line);
    }

    if (result.length >= 45) {
      break;
    }
  }

  return uniqueLines(result).join("\n").trim() || text;
}

function cleanExtractedSection(
  lines: string[]
): string[] {
  const unique = new Map<string, string>();

  for (const line of lines) {
    const cleaned = cleanSectionLine(line);

    if (
      !cleaned ||
      isBoilerplateStart(cleaned) ||
      /^#li[-_]/i.test(cleaned) ||
      /^about (?:the )?company\b/i.test(cleaned) ||
      /^about meesho\b/i.test(cleaned) ||
      /^about paytm\b/i.test(cleaned) ||
      /^life at meesho\b/i.test(cleaned) ||
      /^life at paytm\b/i.test(cleaned) ||
      COMPANY_PROMOTIONAL_PATTERN.test(cleaned) ||
      /equal opportunity employer/i.test(cleaned)
    ) {
      continue;
    }

    unique.set(
      cleaned.toLowerCase(),
      cleaned
    );
  }

  return Array.from(
    unique.values()
  ).slice(0, 30);
}

function cleanResponsibilityLines(
  lines: string[]
): string[] {
  const cleaned = cleanExtractedSection(lines);

  const actionLines = cleaned.filter(
    (line) =>
      RESPONSIBILITY_ACTION_PATTERN.test(line) &&
      !ELIGIBILITY_SIGNAL_PATTERN.test(line) &&
      !COMPANY_PROMOTIONAL_PATTERN.test(line)
  );

  /*
   * Some employers write responsibilities as noun phrases instead of
   * commands. Preserve the cleaned section when strict filtering would
   * remove everything.
   */
  return (
    actionLines.length > 0
      ? actionLines
      : cleaned.filter(
          (line) =>
            !COMPANY_PROMOTIONAL_PATTERN.test(line)
        )
  ).slice(0, 25);
}

function cleanEligibilityLines(
  lines: string[]
): string[] {
  return cleanExtractedSection(lines)
    .filter((line) =>
      ELIGIBILITY_SIGNAL_PATTERN.test(line)
    )
    .filter(
      (line) =>
        !RESPONSIBILITY_ACTION_PATTERN.test(line) ||
        /\b(?:experience|knowledge|skills?|qualification|certification|required|preferred|proficient|ability|familiarity|understanding|expertise|degree|graduate|bachelor|master|diploma)\b/i.test(
          line
        )
    )
    .filter(
      (line) =>
        !COMPANY_PROMOTIONAL_PATTERN.test(line)
    )
    .slice(0, 25);
}

function cleanBenefitLines(
  lines: string[]
): string[] {
  return cleanExtractedSection(lines)
    .filter((line) =>
      BENEFIT_SIGNAL_PATTERN.test(line)
    )
    .filter(
      (line) =>
        !COMPANY_PROMOTIONAL_PATTERN.test(line)
    )
    .slice(0, 15);
}

function cleanLeverDescription(
  description: string
): string {
  const sourceLines = description
    .split("\n")
    .map(cleanSectionLine)
    .filter(Boolean);

  const candidates: string[] = [];
  let sawCompanyIntroduction = false;

  for (const line of sourceLines) {
    const normalized = normalizeHeading(line);

    if (
      COMPANY_INTRO_HEADING_PATTERN.test(line)
    ) {
      sawCompanyIntroduction = true;
      continue;
    }

    if (
      isBoilerplateStart(line) ||
      COMPANY_PROMOTIONAL_PATTERN.test(line)
    ) {
      sawCompanyIntroduction = true;
      continue;
    }

    if (
      isKnownHeading(line) &&
      !/^(?:about the role|about this role|job description|role overview|job summary|position summary|the opportunity)$/i.test(
        normalized
      )
    ) {
      break;
    }

    if (
      COMPANY_INTRO_SENTENCE_PATTERN.test(line)
    ) {
      sawCompanyIntroduction = true;
      continue;
    }

    candidates.push(line);

    if (candidates.length >= 45) {
      break;
    }
  }

  if (candidates.length === 0) {
    return description;
  }

  /*
   * Only trim text before the first role-specific sentence when we actually
   * detected company-introduction material. Otherwise preserve all valid
   * opening context so legitimate job details are never lost.
   */
  if (sawCompanyIntroduction) {
    const roleStartIndex = candidates.findIndex(
      (line) =>
        ROLE_DESCRIPTION_START_PATTERN.test(
          line
        )
    );

    if (roleStartIndex > 0) {
      candidates.splice(0, roleStartIndex);
    }
  }

  return Array.from(
    new Map(
      candidates.map((line) => [
        line.toLowerCase(),
        line,
      ])
    ).values()
  )
    .slice(0, 35)
    .join("\n");
}

function normalizeExperienceValue(value: string): string {
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

  if (/^(entry[- ]level|no experience required)$/i.test(normalized)) {
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

function extractExperience(text: string): string {
  const preferredText = [
    ...extractSection(text, [
      "experience",
      "requirements",
      "minimum requirements",
      "required qualifications",
      "minimum qualifications",
      "preferred qualifications",
      "desired qualifications",
      "qualifications",
      "eligibility",
      "skills and experience",
    ]),
    text,
  ].join(" ");

  const normalizedText = preferredText
    .replace(/[–—]/g, "-")
    .replace(/\b(\d)\s+(\d)\s+years?\b/g, "$1-$2 years");

  for (const pattern of EXPERIENCE_PATTERNS) {
    const match = normalizedText.match(pattern);

    if (match?.[1]) {
      return normalizeExperienceValue(match[1]);
    }
  }

  return "Not Mentioned";
}

function inferLeverExperience(
  role: string,
  completeDescription: string,
  extractedExperience: string
): string {
  const normalizedExtracted =
    normalizeExperienceValue(extractedExperience);

  if (normalizedExtracted !== "Not Mentioned") {
    return normalizedExtracted;
  }

  const normalizedRole = normalizeHeading(role);
  const normalizedDescription = completeDescription
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const combinedText =
    `${normalizedRole} ${normalizedDescription}`;

  const exactRange = combinedText.match(
    /\b(\d+)\s*(?:-|–|—|to)\s*(\d+)\s*years?\b/i
  );

  if (exactRange) {
    return `${exactRange[1]}-${exactRange[2]} years`;
  }

  const plusYears = combinedText.match(
    /\b(\d+)\s*\+\s*years?\b/i
  );

  if (plusYears) {
    return `${plusYears[1]}+ years`;
  }

  const minimumYears = combinedText.match(
    /\b(?:minimum\s+(?:of\s+)?|at\s+least\s+)(\d+)\s*years?\b/i
  );

  if (minimumYears) {
    return `${minimumYears[1]}+ years`;
  }

  const singleYear = combinedText.match(
    /\b(\d+)\s+years?\s+of\s+experience\b/i
  );

  if (singleYear) {
    const years = Number(singleYear[1]);

    return years >= 5
      ? `${years}+ years`
      : `${years} years`;
  }

  if (
    /\b(intern|internship|apprentice|apprenticeship|trainee)\b/i.test(
      normalizedRole
    )
  ) {
    return "Internship";
  }

  if (
    /\bgraduate\b|\bnew graduate\b|\brecent graduate\b|\bcampus\b/i.test(
      normalizedRole
    )
  ) {
    return "Freshers";
  }

  if (
    /\bjunior\b|\bentry[- ]level\b|\bassociate\b|\bearly career\b/i.test(
      normalizedRole
    )
  ) {
    return "0-2 years";
  }

  if (
    /\bchief\b|\bprincipal\b|\bdirector\b|\bhead of\b|\bvice president\b|\bvp\b/i.test(
      normalizedRole
    )
  ) {
    return "10+ years";
  }

  if (
    /\bstaff\b|\blead\b|\barchitect\b|\bmanager\b/i.test(
      normalizedRole
    )
  ) {
    return "7+ years";
  }

  if (
    /\bsenior\b|\bspecialist\b|\bconsultant\b|\baccount executive\b|\bsales executive\b|\bcustomer success manager\b|\bbusiness development executive\b/i.test(
      normalizedRole
    )
  ) {
    return "5+ years";
  }

  if (
    /\bnew graduates?\b|\brecent graduates?\b|\bearly careers?\b|\bgraduate programme\b|\bgraduate program\b|\bno experience required\b/i.test(
      normalizedDescription
    )
  ) {
    return "Freshers";
  }

  const experienceSignals = [
    /\byou have experience\b/i,
    /\bproven experience\b/i,
    /\brelevant experience\b/i,
    /\bdemonstrated experience\b/i,
    /\bprevious experience\b/i,
    /\bprofessional experience\b/i,
    /\bexperience driving\b/i,
    /\bexperience managing\b/i,
    /\bexperience building\b/i,
    /\bexperience developing\b/i,
    /\bexperience designing\b/i,
    /\bexperience working\b/i,
    /\bexperience programming\b/i,
    /\bexperience supporting\b/i,
    /\bexperience delivering\b/i,
    /\bexperience with\b/i,
    /\btrack record\b/i,
  ];

  const signalCount =
    experienceSignals.filter((pattern) =>
      pattern.test(normalizedDescription)
    ).length;

  if (signalCount >= 2) {
    return "3-5 years";
  }

  if (
    /\bsoftware engineer\b|\bsystem software engineer\b|\bbackend engineer\b|\bfrontend engineer\b|\bfull[- ]stack engineer\b|\bdevops engineer\b|\bsecurity engineer\b|\bqa engineer\b|\bautomation engineer\b|\bcloud engineer\b|\bsystems? engineer\b|\bplatform engineer\b|\bsupport engineer\b|\bsite reliability engineer\b|\bdeveloper\b|\badministrator\b|\banalyst\b|\bdesigner\b/i.test(
      normalizedRole
    )
  ) {
    return "3-5 years";
  }

  if (
    /\bsales development representative\b|\bbusiness development representative\b|\bsales representative\b|\bmarketing executive\b|\boffice administrator\b|\bproject coordinator\b|\boperations coordinator\b/i.test(
      normalizedRole
    )
  ) {
    return "2-5 years";
  }

  if (signalCount === 1) {
    return "3-5 years";
  }

  return "2-5 years";
}

function containsEducationQualification(line: string): boolean {
  const normalized = line.toLowerCase();

  const degreeWords =
    /\b(bachelor'?s?|master'?s?|degree|graduate|graduation|undergraduate|postgraduate|post graduation|diploma)\b/i.test(
      normalized
    );

  const abbreviatedDegree =
    /\b(B\.?\s*Tech|M\.?\s*Tech|B\.?\s*E\.|M\.?\s*E\.|BCA|MCA|BBA|MBA|B\.?\s*Com|M\.?\s*Com)\b/i.test(
      line
    );

  return degreeWords || abbreviatedDegree;
}

function summarizeEducationCandidate(
  value: string
): string {
  const cleaned = cleanSectionLine(value);

  if (cleaned.length <= 110) {
    return cleaned;
  }

  const labels: string[] = [];

  const degreePatterns: Array<
    [string, RegExp]
  > = [
    ["B.Tech", /\bB\.?\s*Tech\b/i],
    ["M.Tech", /\bM\.?\s*Tech\b/i],
    ["B.E.", /\bB\.?\s*E\.\b/],
    ["M.E.", /\bM\.?\s*E\.\b/],
    ["BCA", /\bBCA\b/i],
    ["MCA", /\bMCA\b/i],
    ["BBA", /\bBBA\b/i],
    ["MBA", /\bMBA\b/i],
    ["B.Com", /\bB\.?\s*Com\b/i],
    ["M.Com", /\bM\.?\s*Com\b/i],
    ["Bachelor's Degree", /\bbachelor'?s?(?:\s+degree)?\b/i],
    ["Master's Degree", /\bmaster'?s?(?:\s+degree)?\b/i],
    ["Postgraduate", /\bpost[- ]?graduat(?:e|ion)\b/i],
    ["Graduate", /\bgraduate|graduation\b/i],
    ["Diploma", /\bdiploma\b/i],
  ];

  for (const [label, pattern] of degreePatterns) {
    if (
      pattern.test(cleaned) &&
      !labels.includes(label)
    ) {
      labels.push(label);
    }
  }

  return labels.length > 0
    ? labels.slice(0, 4).join(" / ")
    : cleaned.slice(0, 180).trim();
}

function extractEducation(text: string): string {
  const preferredSections = [
    ...extractSection(text, ["education"]),
    ...extractSection(text, [
      "qualifications",
      "required qualifications",
      "minimum qualifications",
      "preferred qualifications",
      "desired qualifications",
      "minimum requirements",
      "requirements",
      "eligibility",
      "skills and experience",
    ]),
  ];

  const allLines = text
    .split("\n")
    .map(cleanSectionLine)
    .filter(Boolean);

  const candidates = [...preferredSections, ...allLines]
    .filter(containsEducationQualification)
    .filter((line) => !isBoilerplateStart(line))
    .filter((line) => line.length >= 6 && line.length <= 220)
    .filter(
      (line) =>
        !/should be able|must be able|ability to|be the voice|be a part of the story|become an expert|build a strong pipeline/i.test(
          line
        )
    );

  const uniqueCandidates = Array.from(
    new Map(
      candidates.map((line) => [line.toLowerCase(), line])
    ).values()
  );

  return uniqueCandidates[0]
    ? summarizeEducationCandidate(
        uniqueCandidates[0]
      )
    : "Not Mentioned";
}

function formatSalaryRange(
  range?: LeverSalaryRange
): string {
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

  return `${currency} ${min} - ${max}${
    interval ? ` ${interval}` : ""
  }`.trim();
}

function isSpecificSalary(value: string): boolean {
  return (
    (
      /₹|\bINR\b|\bUSD\b|\bEUR\b|\bGBP\b|\$|€|£/i.test(value) &&
      /\d/.test(value)
    ) ||
    /\b\d+(?:\.\d+)?\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?\s*(?:LPA|lakhs?|CTC)\b/i.test(
      value
    )
  );
}

function extractSalary(
  job: LeverJob,
  text: string
): string {
  const structuredSalary =
    formatSalaryRange(job.salaryRange);

  if (structuredSalary) {
    return structuredSalary;
  }

  const plainSalary =
    job.salaryDescriptionPlain ||
    cleanText(job.salaryDescription);

  if (
    plainSalary.trim() &&
    isSpecificSalary(plainSalary)
  ) {
    return plainSalary.replace(/\s+/g, " ").trim();
  }

  for (const pattern of SALARY_PATTERNS) {
    const match = text.match(pattern);

    if (
      match?.[0] &&
      isSpecificSalary(match[0])
    ) {
      return match[0].replace(/\s+/g, " ").trim();
    }
  }

  return "Salary Not Disclosed";
}

function findSkillsInText(text: string): string[] {
  const normalizedText = cleanSectionLine(text);

  const discoveredSkills = SKILL_ALIASES
    .filter(({ patterns }) =>
      patterns.some((pattern) =>
        pattern.test(normalizedText)
      )
    )
    .map(({ label }) => label);

  let uniqueSkills = Array.from(
    new Map(
      discoveredSkills.map((skill) => [
        skill.toLowerCase(),
        skill,
      ])
    ).values()
  );

  if (
    uniqueSkills.includes("Spring Boot") &&
    uniqueSkills.includes("Spring")
  ) {
    uniqueSkills = uniqueSkills.filter(
      (skill) => skill !== "Spring"
    );
  }

  if (
    uniqueSkills.includes("Ruby on Rails") &&
    uniqueSkills.includes("Ruby")
  ) {
    uniqueSkills = uniqueSkills.filter(
      (skill) => skill !== "Ruby"
    );
  }

  if (
    uniqueSkills.includes("MySQL") ||
    uniqueSkills.includes("PostgreSQL")
  ) {
    uniqueSkills = uniqueSkills.filter(
      (skill) => skill !== "SQL"
    );
  }

  return uniqueSkills;
}

function extractSkills(text: string): string[] {
  return findSkillsInText(text).slice(0, 15);
}

function extractRequiredSkills(text: string): string[] {
  const requiredSections = extractSection(text, [
    "required skills",
    "technical skills",
    "minimum requirements",
    "requirements",
    "required qualifications",
    "minimum qualifications",
    "preferred qualifications",
    "desired qualifications",
    "qualifications",
    "eligibility",
    "who you are",
    "what we are looking for",
    "what we're looking for",
    "what we’re looking for",
    "skills and experience",
  ]);

  const requiredSkills =
    findSkillsInText(requiredSections.join(" "));

  if (requiredSkills.length === 0) {
    return findSkillsInText(text).slice(0, 15);
  }

  return requiredSkills.slice(0, 15);
}

function getLocation(job: LeverJob): string {
  const allLocations =
    job.categories?.allLocations || [];

  const locations = uniqueLines([
    job.categories?.location || "",
    ...allLocations,
  ]);

  return locations.join(", ") || "Not Mentioned";
}

function getCountry(
  job: LeverJob,
  location: string
): string {
  if (job.country?.toUpperCase() === "IN") {
    return "India";
  }

  if (INDIA_LOCATION_PATTERN.test(location)) {
    return "India";
  }

  if (/\bemea\b/i.test(location)) {
    return "EMEA";
  }

  if (/\bamericas?\b/i.test(location)) {
    return "Americas";
  }

  if (/\bapac\b|\basia pacific\b/i.test(location)) {
    return "APAC";
  }

  return job.country?.trim() || "Not Mentioned";
}

function getJobType(job: LeverJob): string {
  return (
    job.categories?.commitment?.trim() ||
    "Private Job"
  );
}

function getEmploymentType(job: LeverJob): string {
  return (
    job.categories?.commitment?.trim() ||
    "Not Mentioned"
  );
}

function getWorkMode(
  job: LeverJob,
  location: string,
  description: string
): string {
  switch (job.workplaceType) {
    case "remote":
      return "Remote";
    case "hybrid":
      return "Hybrid";
    case "on-site":
      return "On-site";
    default:
      break;
  }

  const searchableText =
    `${location} ${description}`;

  if (/\bhybrid\b/i.test(searchableText)) {
    return "Hybrid";
  }

  if (
    /\bremote\b|\bhome based\b|\bhome-based\b|\bwork from home\b|\bwfh\b/i.test(
      searchableText
    )
  ) {
    return "Remote";
  }

  return "On-site";
}

function determineLeverCategory(
  role: string,
  description: string,
  location: string,
  experience: string,
  workMode: string,
  country: string
): ReturnType<typeof determineJobCategory> {
  const title = role.toLowerCase();
  const combined =
    `${role} ${description} ${location} ${experience}`;

  if (
    /\b(intern|internship|apprentice|apprenticeship|student trainee)\b/i.test(
      title
    ) ||
    /\bthis is an internship\b|\binternship opportunity\b/i.test(
      combined
    )
  ) {
    return "internship";
  }

  if (
    /\bwalk[- ]?in(?: drive)?\b/i.test(combined)
  ) {
    return "walk-in-drive";
  }

  if (
    /\bwork from home\b|\bwfh\b/i.test(combined) ||
    (
      workMode === "Remote" &&
      country === "India"
    )
  ) {
    return "work-from-home";
  }

  if (
    /\bfreshers?\b|\bentry[- ]level\b|\brecent graduates?\b|\bnew graduates?\b|\bearly careers?\b|\bgraduate programme\b|\bgraduate program\b|\b0\s*(?:-|–|to)\s*[12]\s*years?\b/i.test(
      combined
    ) ||
    /\bgraduate\b|\bjunior\b|\bentry[- ]level\b|\bassociate\b|\bearly career\b/i.test(
      role
    ) ||
    /^(Freshers|0-2 years)$/i.test(experience)
  ) {
    return "freshers";
  }

  if (
    /\b0\s*(?:-|–|to)\s*[34]\s*years?\b/i.test(
      combined
    )
  ) {
    return "freshers-experienced";
  }

  return "experienced";
}

function toIsoDate(
  timestamp?: number
): string | null {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return null;
  }

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

export async function fetchLeverJobs(
  company: LeverCompany
): Promise<NormalizedImportedJob[]> {
  const boardId = company.boardId?.trim();

  if (!boardId) {
    throw new Error(
      `${company.name} is missing its Lever boardId.`
    );
  }

  const site = encodeURIComponent(boardId);
  const url =
    `https://api.lever.co/v0/postings/${site}?mode=json`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "CorporateJobsNetwork/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch Lever jobs for ${company.name}: ${response.status}`
    );
  }

  const data = (await response.json()) as LeverJob[];

  if (!Array.isArray(data)) {
    throw new Error(
      `Invalid Lever response received for ${company.name}.`
    );
  }

  const normalizedJobs: NormalizedImportedJob[] = [];
  const seenUniqueKeys = new Set<string>();

  const sortedJobs = [...data].sort(
    (first, second) =>
      (second.createdAt || 0) -
      (first.createdAt || 0)
  );

  for (const job of sortedJobs) {
    const sourceJobId =
      job.id?.trim() || "";
    const role =
      job.text?.trim() || "";
    const uniqueKey =
      `lever_${boardId}_${sourceJobId}`;

    if (
      !sourceJobId ||
      !role ||
      seenUniqueKeys.has(uniqueKey)
    ) {
      continue;
    }

    const completeDescription =
      buildCompleteDescription(job);

    if (!completeDescription) {
      continue;
    }

    const description =
      cleanLeverDescription(
        extractJobDescription(
          completeDescription
        )
      );

    const location = getLocation(job);
    const country =
      getCountry(job, location);

    const responsibilities =
      extractSection(
        completeDescription,
        [
          "responsibilities",
          "job responsibilities",
          "roles and responsibilities",
          "key responsibilities",
          "your responsibilities",
          "what you will do",
          "what you'll do",
          "what you’ll do",
          "day to day",
          "day-to-day",
          "what you will focus on",
          "key duties",
        ],
        25
      );

    const eligibility =
      extractSection(
        completeDescription,
        [
          "requirements",
          "minimum requirements",
          "required qualifications",
          "minimum qualifications",
          "preferred qualifications",
          "desired qualifications",
          "qualifications",
          "eligibility",
          "who you are",
          "what we are looking for",
          "what we're looking for",
          "what we’re looking for",
          "skills and experience",
        ],
        25
      );

    const benefits =
      extractSection(
        completeDescription,
        [
          "benefits",
          "benefits and perks",
          "benefits & perks",
          "perks",
          "what we offer",
          "why join",
          "why join us",
        ],
        15
      );

    const selectionProcess =
      extractSection(
        completeDescription,
        [
          "selection process",
          "interview process",
          "hiring process",
        ],
        15
      );

    const extractedExperience =
      extractExperience(
        completeDescription
      );

    const experience =
      inferLeverExperience(
        role,
        completeDescription,
        extractedExperience
      );

    const workMode =
      getWorkMode(
        job,
        location,
        completeDescription
      );

    const hostedUrl =
      job.hostedUrl?.trim() ||
      `https://jobs.lever.co/${boardId}/${sourceJobId}`;

    const applyLink =
      job.applyUrl?.trim() ||
      `${hostedUrl}/apply`;

    const skills =
      extractSkills(
        completeDescription
      );

    const requiredSkills =
      extractRequiredSkills(
        completeDescription
      );

    seenUniqueKeys.add(uniqueKey);

    normalizedJobs.push({
      uniqueKey,

      source: "lever",
      sourceJobId,
      sourceCompanyId: boardId,
      sourceUrl: hostedUrl,

      company: company.name,
      companySlug: company.slug,
      companyLogo: company.logo || "",

      role,
      location,
      country,

      description,
      responsibilities:
        cleanResponsibilityLines(
          responsibilities
        ).join("\n"),
      eligibility:
        cleanEligibilityLines(
          eligibility
        ).join("\n"),
      benefits:
        cleanBenefitLines(
          benefits
        ).join("\n"),
      selectionProcess:
        uniqueLines(
          selectionProcess.filter(
            (line) =>
              !isBoilerplateStart(line)
          )
        ).join("\n"),

      experience,
      education:
        extractEducation(
          completeDescription
        ),
      salary:
        extractSalary(
          job,
          completeDescription
        ),

      skills,
      requiredSkills,

      jobType: getJobType(job),
      category:
        determineLeverCategory(
          role,
          completeDescription,
          location,
          experience,
          workMode,
          country
        ),

      applyLink,

      workMode,
      employmentType:
        getEmploymentType(job),
      lastDate: "",

      importedAutomatically: true,
      trustedCompany: company.trusted,

      reviewStatus: "pending",
      processingStatus: "completed",

      status: "draft",
      isActive: true,

      sourceCreatedAt:
        toIsoDate(job.createdAt),
      sourceUpdatedAt: null,

      fetchedAt:
        new Date().toISOString(),
    });
  }

  return normalizedJobs;
}