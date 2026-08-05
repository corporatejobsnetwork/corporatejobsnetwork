import { determineJobCategory } from "../filters";
import type {
  NormalizedImportedJob,
  WorkdayCompany,
} from "../types";

interface SkillAlias {
  label: string;
  patterns: RegExp[];
}

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
    country?: string | { descriptor?: string; id?: string } | null;
    remoteType?: string;
  };
}

const PAGE_SIZE = 20;
const MAX_PAGES = 100;


const SECTION_HEADINGS = [
  "about the role",
  "about this role",
  "job description",
  "role overview",
  "job summary",
  "position summary",
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
  "what we need to see",
  "what you'll bring",
  "what you’ll bring",
  "what you will bring",
  "your impact",
  "your role",
  "job duties",
  "requirements",
  "minimum requirements",
  "required qualifications",
  "minimum qualifications",
  "preferred qualifications",
  "desired qualifications",
  "qualifications",
  "eligibility",
  "eligibility criteria",
  "who you are",
  "what we are looking for",
  "what we're looking for",
  "what we’re looking for",
  "skills and experience",
  "what we need to see",
  "what you'll bring",
  "what you’ll bring",
  "what you will bring",
  "must have",
  "nice to have",
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
  /^learn more/i,
  /^visit our website/i,
  /^about the company/i,
  /^about company/i,
  /^our mission/i,
  /^our values/i,
  /^about salesforce/i,
  /^about nvidia/i,
  /^about qualcomm/i,
  /^job category/i,
  /^job details/i,
  /^locations?$/i,
  /^additional information/i,
  /^applications accepted until/i,
  /^application deadline/i,
  /^closing date/i,
  /^life at /i,
  /^#li[-_]/i,
  /^#remote/i,
];

const RESPONSIBILITY_ACTION_PATTERN =
  /^(?:handle|prepare|assist|work|support|coordinate|manage|perform|develop|design|build|maintain|lead|execute|monitor|review|analyse|analyze|identify|create|implement|ensure|deliver|drive|partner|collaborate|own|conduct|track|resolve|provide|define|plan|operate|improve|establish|evaluate|process|reconcile|file|respond|liaise|oversee|participate|contribute|communicate|present|research|draft|organize|organise|follow|complete|achieve|meet|enable|facilitate|supervise|mentor|train|report|recommend|document|validate|test|deploy|troubleshoot|investigate|optimize|optimise|administer)\b/i;

const ELIGIBILITY_SIGNAL_PATTERN =
  /\b(?:degree|graduate|graduation|bachelor|master|b\.?\s*tech|m\.?\s*tech|b\.?\s*e\.?|m\.?\s*e\.?|bca|mca|bba|mba|b\.?\s*com|m\.?\s*com|diploma|experience|knowledge|skills?|qualification|certification|certified|proficient|proficiency|ability|must|required|preferred|familiarity|understanding|expertise|competency|competencies|excellent|strong|good command|willingness|sql|java|python|excel|erp|finance|accounting|communication|analytical|problem[- ]solving)\b/i;

const BENEFIT_SIGNAL_PATTERN =
  /\b(?:health insurance|medical insurance|life insurance|paid leave|annual leave|holiday leave|parental leave|maternity leave|paternity leave|learning budget|development budget|flexible work|hybrid work|remote work|work from home|wellness|employee assistance|esop|stock options?|equity|bonus|retirement benefits?|provident fund|gratuity|meal allowance|travel allowance|internet allowance|recognition rewards?|priority pass|paid time off|pto)\b/i;

const COMPANY_PROMOTIONAL_PATTERN =
  /\b(?:our mission is|company mission|our story|our values|registered users|million users|largest .* platform|largest .* ecosystem|we are proud to|life at|why join us|who we are)\b/i;


const ROLE_DESCRIPTION_START_PATTERN =
  /^(?:we are looking for|we'?re looking for|as an?|this role|in this role|the role|your role|you will|you'll|you’ll|the successful candidate|the ideal candidate|the position|this position|we seek|we are seeking|we'?re seeking|join our team|your mission)\b/i;

const COMPANY_INTRO_HEADING_PATTERN =
  /^(?:about us|about the company|about company|about the team|who we are|our story|our mission|our values|life at .+|culture|company overview|why join(?: us)?|welcome to .+|about salesforce|about nvidia|about qualcomm|job category|job details)\s*:?\s*$/i;

const COMPANY_INTRO_SENTENCE_PATTERN =
  /\b(?:founded in \d{4}|headquartered in|we are one of|we are india'?s|is india'?s|our company has|our journey|our story began|our mission is|registered users|million users|largest .* platform|largest .* ecosystem|work hard and party harder|founder mindset|curious about life at|when you join salesforce|we bring the power of|agentforce is)\b/i;

const LAST_DATE_PATTERNS = [
  /\bapplications? accepted until\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})\b/i,
  /\bapplications? close(?:s|d)?(?: on)?\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})\b/i,
  /\bapplication deadline\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})\b/i,
  /\bclosing date\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})\b/i,
  /\bapply (?:before|by)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})\b/i,
  /\bapplications? accepted until\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/i,
  /\bapplication deadline\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/i,
];

const SALARY_METADATA_LINE_PATTERN =
  /\b(?:base salary|salary range|pay range|compensation range|annual salary|annual compensation|hourly rate)\b/i;

const APPLICATION_METADATA_LINE_PATTERN =
  /\b(?:applications? accepted until|application deadline|closing date|apply before|apply by|this posting is for an existing vacancy|uses? ai tools?|artificial intelligence tools?)\b/i;

const EXPERIENCE_PATTERNS = [
  /\b(\d+)\s*(?:-|–|—|to)\s*(\d+)\s*\+?\s*years?(?:\s+of\s+(?:relevant\s+)?experience)?\b/i,
  /\b(?:minimum\s+(?:of\s+)?|at\s+least\s+)?(\d+)\s*\+\s*years?(?:\s+of\s+(?:relevant\s+)?experience)?\b/i,
  /\b(?:minimum\s+(?:of\s+)?|at\s+least\s+)(\d+)\s*years?(?:\s+of\s+(?:relevant\s+)?experience)?\b/i,
  /\b(\d+)\s*years?\s+of\s+(?:relevant\s+)?experience\b/i,
  /\b(freshers?)\b/i,
  /\b(entry[- ]level)\b/i,
  /\b(no experience required)\b/i,
];

const EDUCATION_PATTERNS = [
  /\b(?:bachelor'?s?|master'?s?)\s+(?:degree\s+)?(?:in\s+)?[^.\n;]{2,120}/i,
  /\b(?:B\.?\s*Tech|M\.?\s*Tech|B\.?\s*E\.?|M\.?\s*E\.?|BCA|MCA|BBA|MBA|B\.?\s*Com|M\.?\s*Com)\b[^.\n;]{0,100}/i,
  /\b(?:graduate|graduation|undergraduate|postgraduate|diploma)\b[^.\n;]{0,100}/i,
];

const SALARY_PATTERNS = [
  /₹\s?[\d,.]+\s*(?:-|–|—|to)\s*₹?\s?[\d,.]+\s*(?:per month|monthly|per annum|annually|lpa|lakhs?|ctc)?/i,
  /\bINR\s?[\d,.]+\s*(?:-|–|—|to)\s*(?:INR\s?)?[\d,.]+\s*(?:per month|monthly|per annum|annually|lpa|lakhs?|ctc)?\b/i,
  /\b\d+(?:\.\d+)?\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?\s*(?:LPA|lakhs?(?: per annum)?|CTC)\b/i,
  /(?:\$|€|£)\s?[\d,.]+\s*(?:-|–|—|to)\s*(?:\$|€|£)?\s?[\d,.]+\s*(?:per year|annually|per annum|per month|monthly|hourly|per hour)?/i,
  /\b(?:USD|EUR|GBP)\s?[\d,.]+\s*(?:-|–|—|to)\s*(?:USD|EUR|GBP)?\s?[\d,.]+\s*(?:per year|annually|per annum|per month|monthly|hourly|per hour)?\b/i,
  /\b[\d,.]+\s*(?:-|–|—|to)\s*[\d,.]+\s*(?:USD|EUR|GBP)\b/i,
  /\b(?:salary range|pay range|compensation range|base salary)\s*[:\-]\s*(?=[^.\n]*(?:₹|INR|LPA|lakhs?|CTC|\$|USD|€|EUR|£|GBP))[^.\n]{3,180}/i,
];

const INDIA_LOCATION_PATTERN =
  /\b(india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|new delhi|noida|gurugram|gurgaon|kolkata|ahmedabad|kochi|cochin|thiruvananthapuram|trivandrum|jaipur|chandigarh|indore|bhubaneswar|mysuru|mysore|mangaluru|mangalore|hubballi|hubli)\b/i;

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
    BOILERPLATE_START_PATTERNS.some((pattern) =>
      pattern.test(cleaned)
    ) ||
    COMPANY_PROMOTIONAL_PATTERN.test(cleaned) ||
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

  const normalizedTargets =
    headings.map(normalizeHeading);

  const results: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const normalizedLine =
      normalizeHeading(line);

    const isTargetHeading =
      normalizedTargets.some(
        (heading) =>
          normalizedLine === heading ||
          normalizedLine.startsWith(
            `${heading}:`
          ) ||
          normalizedLine.startsWith(
            `${heading} -`
          )
      );

    if (isTargetHeading) {
      collecting = true;

      const separatorIndex =
        line.search(/[:\-–—]/);

      if (separatorIndex >= 0) {
        const sameLineContent =
          cleanSectionLine(
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

    if (
      isKnownHeading(line) ||
      isBoilerplateStart(line)
    ) {
      break;
    }

    const cleaned =
      cleanSectionLine(line);

    if (cleaned) {
      results.push(cleaned);
    }

    if (results.length >= maxLines) {
      break;
    }
  }

  return uniqueLines(results).slice(
    0,
    maxLines
  );
}

function extractJobDescription(
  text: string
): string {
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
    "what we need to see",
    "what you'll bring",
    "what you’ll bring",
    "what you will bring",
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

    if (
      !isBoilerplateStart(line) &&
      !SALARY_METADATA_LINE_PATTERN.test(line) &&
      !APPLICATION_METADATA_LINE_PATTERN.test(line)
    ) {
      result.push(line);
    }

    if (result.length >= 45) {
      break;
    }
  }

  return uniqueLines(result).join("\n").trim() || text;
}

function cleanWorkdayDescription(
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
      COMPANY_PROMOTIONAL_PATTERN.test(line) ||
      SALARY_METADATA_LINE_PATTERN.test(line) ||
      APPLICATION_METADATA_LINE_PATTERN.test(line)
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

  if (sawCompanyIntroduction) {
    const roleStartIndex = candidates.findIndex(
      (line) =>
        ROLE_DESCRIPTION_START_PATTERN.test(line)
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

function normalizeExperienceValue(
  value: string
): string {
  const normalized = value
    .replace(/[–—]/g, "-")
    .replace(
      /\b1\s*-\s*0\b/g,
      "0-1"
    )
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
    return "0-1 years";
  }

  if (
    /\b(graduate|junior|entry[- ]level|associate)\b/.test(
      value
    )
  ) {
    return "0-2 years";
  }

  if (
    /\b(chief|principal|director|head|vice president|vp|general manager|gm)\b/.test(
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
  role: string
): string {
  const normalizedText = text
    .replace(/[–—]/g, "-")
    .replace(
      /\b(\d)\s*(\d)\s*years?\b/g,
      "$1-$2 years"
    );

  for (const pattern of EXPERIENCE_PATTERNS) {
    const match =
      normalizedText.match(pattern);

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
        if (
          /\+\s*years?/i.test(match[0])
        ) {
          return `${capturedValue}+ years`;
        }

        return `${capturedValue} years`;
      }

      return normalizeExperienceValue(
        capturedValue
      );
    }
  }

  return inferExperienceFromRole(role);
}

function inferWorkdayExperience(
  role: string,
  completeDescription: string,
  extractedExperience: string
): string {
  const normalizedExtracted =
    normalizeExperienceValue(
      extractedExperience
    );

  if (
    normalizedExtracted !==
    "Not Mentioned"
  ) {
    return normalizedExtracted;
  }

  const normalizedRole =
    normalizeHeading(role);

  const normalizedDescription =
    completeDescription
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const combinedText =
    `${normalizedRole} ${normalizedDescription}`;

  const exactRange =
    combinedText.match(
      /\b(\d+)\s*(?:-|–|—|to)\s*(\d+)\s*years?\b/i
    );

  if (exactRange) {
    return `${exactRange[1]}-${exactRange[2]} years`;
  }

  const plusYears =
    combinedText.match(
      /\b(\d+)\s*\+\s*years?\b/i
    );

  if (plusYears) {
    return `${plusYears[1]}+ years`;
  }

  const minimumYears =
    combinedText.match(
      /\b(?:minimum\s+(?:of\s+)?|at\s+least\s+)(\d+)\s*years?\b/i
    );

  if (minimumYears) {
    return `${minimumYears[1]}+ years`;
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
    experienceSignals.filter(
      (pattern) =>
        pattern.test(
          normalizedDescription
        )
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

  if (signalCount === 1) {
    return "3-5 years";
  }

  return "2-5 years";
}

function containsEducationQualification(
  line: string
): boolean {
  const normalized =
    line.toLowerCase();

  const degreeWords =
    /\b(bachelor'?s?|master'?s?|degree|graduate|graduation|undergraduate|postgraduate|post graduation|diploma)\b/i.test(
      normalized
    );

  const abbreviatedDegree =
    /\b(B\.?\s*Tech|M\.?\s*Tech|B\.?\s*E\.|M\.?\s*E\.|B\.?\s*S\.?|M\.?\s*S\.?|BCA|MCA|BBA|MBA|B\.?\s*Com|M\.?\s*Com)\b/i.test(
      line
    );

  return (
    degreeWords ||
    abbreviatedDegree
  );
}

function summarizeEducationCandidate(
  value: string
): string {
  const cleaned =
    cleanSectionLine(value);

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
    ["B.S.", /\bB\.?\s*S\.?\b/],
    ["M.S.", /\bM\.?\s*S\.?\b/],
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

  for (
    const [label, pattern]
    of degreePatterns
  ) {
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

function extractEducation(
  text: string
): string {
  const preferredSections = [
    ...extractSection(text, [
      "education",
      "qualifications",
      "required qualifications",
      "minimum qualifications",
      "preferred qualifications",
      "desired qualifications",
      "requirements",
      "eligibility",
    ]),
  ];

  const allLines = text
    .split("\n")
    .map(cleanSectionLine)
    .filter(Boolean);

  const candidates = [
    ...preferredSections,
    ...allLines,
  ]
    .filter(
      containsEducationQualification
    )
    .filter(
      (line) =>
        !isBoilerplateStart(line)
    )
    .filter(
      (line) =>
        line.length >= 6 &&
        line.length <= 220
    )
    .filter(
      (line) =>
        !/should be able|must be able|ability to|be the voice|be a part of the story|become an expert/i.test(
          line
        )
    );

  const uniqueCandidates =
    Array.from(
      new Map(
        candidates.map((line) => [
          line.toLowerCase(),
          line,
        ])
      ).values()
    );

  return uniqueCandidates[0]
    ? summarizeEducationCandidate(
        uniqueCandidates[0]
      )
    : "Not Mentioned";
}

function isSpecificSalary(
  value: string
): boolean {
  return (
    (
      /₹|\bINR\b|\bUSD\b|\bEUR\b|\bGBP\b|\$|€|£/i.test(
        value
      ) &&
      /\d/.test(value)
    ) ||
    /\b\d+(?:\.\d+)?\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?\s*(?:LPA|lakhs?|CTC)\b/i.test(
      value
    )
  );
}

function extractSalary(
  text: string
): string {
  for (
    const pattern
    of SALARY_PATTERNS
  ) {
    const match = text.match(pattern);

    if (
      match?.[0] &&
      isSpecificSalary(match[0])
    ) {
      return match[0]
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return "Salary Not Disclosed";
}

function extractLastDate(
  text: string
): string {
  for (
    const pattern
    of LAST_DATE_PATTERNS
  ) {
    const match = text.match(pattern);

    if (!match?.[1]) {
      continue;
    }

    const rawValue =
      match[1].trim();

    const parsedDate =
      new Date(rawValue);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return rawValue;
    }

    return parsedDate
      .toISOString()
      .slice(0, 10);
  }

  return "";
}

function findSkillsInText(
  text: string
): string[] {
  const normalizedText =
    cleanSectionLine(text);

  const discoveredSkills =
    SKILL_ALIASES
      .filter(({ patterns }) =>
        patterns.some((pattern) =>
          pattern.test(
            normalizedText
          )
        )
      )
      .map(({ label }) => label);

  let uniqueSkills =
    Array.from(
      new Map(
        discoveredSkills.map(
          (skill) => [
            skill.toLowerCase(),
            skill,
          ]
        )
      ).values()
    );

  if (
    uniqueSkills.includes(
      "Spring Boot"
    ) &&
    uniqueSkills.includes("Spring")
  ) {
    uniqueSkills =
      uniqueSkills.filter(
        (skill) =>
          skill !== "Spring"
      );
  }

  if (
    uniqueSkills.includes(
      "Ruby on Rails"
    ) &&
    uniqueSkills.includes("Ruby")
  ) {
    uniqueSkills =
      uniqueSkills.filter(
        (skill) =>
          skill !== "Ruby"
      );
  }

  if (
    uniqueSkills.includes("MySQL") ||
    uniqueSkills.includes(
      "PostgreSQL"
    )
  ) {
    uniqueSkills =
      uniqueSkills.filter(
        (skill) =>
          skill !== "SQL"
      );
  }

  return uniqueSkills;
}

function extractSkills(
  text: string
): string[] {
  return findSkillsInText(text)
    .slice(0, 15);
}

function extractRequiredSkills(
  text: string
): string[] {
  const requiredSections =
    extractSection(text, [
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
      "what we need to see",
      "what you'll bring",
      "what you’ll bring",
      "what you will bring",
      "skills and experience",
    ]);

  const requiredSkills =
    findSkillsInText(
      requiredSections.join(" ")
    );

  if (
    requiredSkills.length === 0
  ) {
    return findSkillsInText(text)
      .slice(0, 15);
  }

  return requiredSkills.slice(0, 15);
}

function cleanResponsibilityLines(
  lines: string[]
): string[] {
  const cleaned = uniqueLines(
    lines.filter(
      (line) =>
        !isBoilerplateStart(line)
    )
  );

  const actionLines = cleaned.filter(
    (line) =>
      RESPONSIBILITY_ACTION_PATTERN.test(
        line
      ) &&
      !ELIGIBILITY_SIGNAL_PATTERN.test(
        line
      )
  );

  return (
    actionLines.length > 0
      ? actionLines
      : cleaned
  ).slice(0, 25);
}

function cleanEligibilityLines(
  lines: string[]
): string[] {
  return uniqueLines(
    lines.filter(
      (line) =>
        !isBoilerplateStart(line)
    )
  )
    .filter(
      (line) =>
        ELIGIBILITY_SIGNAL_PATTERN.test(
          line
        )
    )
    .filter(
      (line) =>
        !SALARY_METADATA_LINE_PATTERN.test(
          line
        )
    )
    .filter(
      (line) =>
        !APPLICATION_METADATA_LINE_PATTERN.test(
          line
        )
    )
    .filter(
      (line) =>
        !COMPANY_INTRO_SENTENCE_PATTERN.test(
          line
        )
    )
    .slice(0, 25);
}

function cleanBenefitLines(
  lines: string[]
): string[] {
  return uniqueLines(
    lines.filter(
      (line) =>
        !isBoilerplateStart(line)
    )
  )
    .filter((line) =>
      BENEFIT_SIGNAL_PATTERN.test(line)
    )
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

function getCountryValue(
  value: unknown
): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    value &&
    typeof value === "object" &&
    "descriptor" in value
  ) {
    const descriptor = (
      value as {
        descriptor?: unknown;
      }
    ).descriptor;

    if (typeof descriptor === "string") {
      return descriptor.trim();
    }
  }

  return "";
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

function cleanLocationValue(
  value: unknown
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(
      /^\s*(?:primary location|location)\s*[:\-]\s*/i,
      ""
    )
    .replace(
      /\b\d+\s+locations?\b/gi,
      ""
    )
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();
}

function formatWorkdayLocation(
  value: string
): string {
  const cleaned =
    cleanLocationValue(value);

  const stateCityMatch =
    cleaned.match(
      /^([^,]+?)\s*-\s*([^,]+)$/
    );

  if (stateCityMatch) {
    return `${stateCityMatch[2].trim()}, ${stateCityMatch[1].trim()}`;
  }

  return cleaned;
}

function getLocation(
  posting: WorkdayJobPosting,
  detail: WorkdayJobDetail
): string {
  const info =
    detail.jobPostingInfo;

  const rawValues = [
    info?.location || "",
    ...(info?.additionalLocations || []),
    posting.locationsText || "",
  ];

  const values = uniqueLines(
    rawValues
      .map(cleanLocationValue)
      .filter(Boolean)
      .map(formatWorkdayLocation)
      .filter(Boolean)
  );

  return (
    values.join(", ") ||
    "Not Mentioned"
  );
}

function getWorkMode(
  detail: WorkdayJobDetail,
  location: string,
  description: string
): string {
  const remoteType =
    detail.jobPostingInfo
      ?.remoteType;

  if (
    typeof remoteType === "string" &&
    remoteType.trim()
  ) {
    const normalized =
      remoteType.trim();

    if (/hybrid/i.test(normalized)) {
      return "Hybrid";
    }

    if (/remote/i.test(normalized)) {
      return "Remote";
    }

    if (
      /on[- ]?site|office/i.test(
        normalized
      )
    ) {
      return "On-site";
    }

    return normalized;
  }

  const searchableText =
    `${location} ${description}`;

  if (
    /\bhybrid\b/i.test(
      searchableText
    )
  ) {
    return "Hybrid";
  }

  if (
    /\bremote\b|\bhome based\b|\bhome-based\b|\bwork from home\b|\bwfh\b/i.test(
      searchableText
    )
  ) {
    return "Remote";
  }

  if (
    /\bon[- ]site\b|\bonsite\b|\boffice based\b|\boffice-based\b|\bin office\b/i.test(
      searchableText
    )
  ) {
    return "On-site";
  }

  return "Not Mentioned";
}

function determineExperienceCategory(
  experience: string
):
  | "freshers"
  | "freshers-experienced"
  | "experienced"
  | null {
  const normalized = experience
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(
      /\b1\s*-\s*0\b/g,
      "0-1"
    )
    .replace(/\s+/g, " ")
    .trim();

  if (
    !normalized ||
    normalized === "not mentioned"
  ) {
    return null;
  }

  if (
    normalized === "fresher" ||
    normalized === "freshers"
  ) {
    return "freshers";
  }

  const rangeMatch =
    normalized.match(
      /^(\d+)\s*-\s*(\d+)\s*years?$/
    );

  if (rangeMatch) {
    const minimumYears =
      Number(rangeMatch[1]);

    /*
     * Any range beginning at zero can accept
     * freshers and experienced candidates:
     * 0-1, 0-2, 0-5, 0-10, and normalized 1-0.
     */
    return minimumYears === 0
      ? "freshers-experienced"
      : "experienced";
  }

  const plusMatch =
    normalized.match(
      /^(\d+)\s*\+\s*years?$/
    );

  if (plusMatch) {
    return Number(plusMatch[1]) >= 1
      ? "experienced"
      : "freshers-experienced";
  }

  const singleYearMatch =
    normalized.match(
      /^(\d+)\s*years?$/
    );

  if (singleYearMatch) {
    return Number(
      singleYearMatch[1]
    ) >= 1
      ? "experienced"
      : "freshers";
  }

  return null;
}

function determineWorkdayCategory(
  role: string,
  description: string,
  location: string,
  experience: string,
  workMode: string,
  country: string
): ReturnType<
  typeof determineJobCategory
> {
  const title =
    role.toLowerCase();

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
    /\bwalk[- ]?in(?: drive)?\b/i.test(
      combined
    )
  ) {
    return "walk-in-drive";
  }

  /*
   * Experience has priority over title keywords.
   *
   * Freshers                  -> freshers
   * 0-1 / 1-0 / 0-N years    -> freshers-experienced
   * 1+ / 1-N / N years       -> experienced
   *
   * Remote and work-from-home jobs keep their
   * experience category here. They are also shown
   * on the Work From Home page through workMode.
   */
  const experienceCategory =
    determineExperienceCategory(
      experience
    );

  if (experienceCategory) {
    return experienceCategory;
  }

  if (
    /\bfreshers?\b|\brecent graduates?\b|\bnew graduates?\b|\bgraduate programme\b|\bgraduate program\b/i.test(
      combined
    )
  ) {
    return "freshers";
  }

  if (
    /\b0\s*(?:-|–|—|to)\s*\d+\s*years?\b/i.test(
      combined
    ) ||
    /\b1\s*(?:-|–|—|to)\s*0\s*years?\b/i.test(
      combined
    )
  ) {
    return "freshers-experienced";
  }

  if (
    /\b1\s*\+\s*years?\b|\b1\s*(?:-|–|—|to)\s*\d+\s*years?\b|\b[2-9]\d*\s*\+?\s*years?\b/i.test(
      combined
    )
  ) {
    return "experienced";
  }

  if (
    /\bgraduate\b|\bjunior\b|\bentry[- ]level\b|\bearly career\b/i.test(
      title
    )
  ) {
    return "freshers";
  }

  /*
   * "Associate" alone is not enough to classify a
   * job as fresher because many senior roles include it.
   */
  if (
    /\bsenior\b|\blead\b|\bstaff\b|\bmanager\b|\bprincipal\b|\bdirector\b|\barchitect\b|\bhead\b|\bvp\b|\bvice president\b/i.test(
      title
    )
  ) {
    return "experienced";
  }

  return "experienced";
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
  const normalizedPath =
    normalizeExternalPath(externalPath);

  /*
   * Workday search results normally return an externalPath that already
   * begins with "/job/...". Adding another "/job" creates
   * "/job/job/..." and every detail request returns 404.
   */
  const detailPath =
    normalizedPath.startsWith("/job/")
      ? normalizedPath
      : `/job${normalizedPath}`;

  const response = await fetch(
    `${createCxsBaseUrl(company)}${detailPath}`,
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
  const postings =
    await fetchAllPostings(company);

  const jobs:
    NormalizedImportedJob[] = [];

  const seenUniqueKeys =
    new Set<string>();

  const sortedPostings =
    [...postings].sort(
      (first, second) => {
        const firstDate =
          toIsoDate(first.postedOn);

        const secondDate =
          toIsoDate(second.postedOn);

        return (
          new Date(
            secondDate || 0
          ).getTime() -
          new Date(
            firstDate || 0
          ).getTime()
        );
      }
    );

  for (
    const posting
    of sortedPostings
  ) {
    const externalPath = posting.externalPath?.trim();
    if (!externalPath) continue;

    try {
      const detail = await fetchJobDetail(company, externalPath);
      const info = detail.jobPostingInfo;
      const completeDescription =
        stripHtml(
          info?.jobDescription || ""
        );

      const description =
        cleanWorkdayDescription(
          extractJobDescription(
            completeDescription
          )
        );
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

      const uniqueKey =
        `workday_${company.tenant}_${company.siteId}_${sourceJobId}`;

      if (
        seenUniqueKeys.has(
          uniqueKey
        )
      ) {
        continue;
      }

      const sourceUrl =
        createPublicJobUrl(
          company,
          externalPath
        );

      const employmentType =
        getEmploymentType(
          posting,
          detail
        );

      const responsibilities =
        cleanResponsibilityLines(
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
              "your impact",
              "your role",
              "job duties",
              "key duties",
            ],
            25
          )
        ).join("\n");

      const eligibility =
        cleanEligibilityLines(
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
              "eligibility criteria",
              "who you are",
              "what we are looking for",
              "what we're looking for",
              "what we’re looking for",
              "what we need to see",
              "what you'll bring",
              "what you’ll bring",
              "what you will bring",
              "must have",
              "nice to have",
              "skills and experience",
            ],
            25
          )
        ).join("\n");

      const benefits =
        cleanBenefitLines(
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
          )
        ).join("\n");

      const selectionProcess =
        uniqueLines(
          extractSection(
            completeDescription,
            [
              "selection process",
              "interview process",
              "hiring process",
            ],
            15
          ).filter(
            (line) =>
              !isBoilerplateStart(line)
          )
        ).join("\n");

      const extractedExperience =
        extractExperience(
          completeDescription,
          role
        );

      const experience =
        inferWorkdayExperience(
          role,
          completeDescription,
          extractedExperience
        );

      const requiredSkillsSource =
        eligibility ||
        completeDescription;

      const country =
        getCountryValue(
          info?.country
        ) ||
        (
          INDIA_LOCATION_PATTERN.test(
            location
          )
            ? "India"
            : "Not Mentioned"
        );

      const workMode =
        getWorkMode(
          detail,
          location,
          completeDescription
        );

      const lastDate =
        extractLastDate(
          completeDescription
        );

      seenUniqueKeys.add(
        uniqueKey
      );

      jobs.push({
        uniqueKey,
        source: "workday",
        sourceJobId,
        sourceCompanyId: `${company.tenant}:${company.siteId}`,
        sourceUrl,

        company: company.name,
        companySlug: company.slug,
        companyLogo: company.logo || "",

        role,
        location,
        country,

        description,
        responsibilities,
        eligibility,
        benefits,
        selectionProcess,

        experience,
        education:
          extractEducation(
            completeDescription
          ),
        salary:
          extractSalary(
            completeDescription
          ),

        skills:
          extractSkills(
            completeDescription
          ),
        requiredSkills:
          extractRequiredSkills(
            requiredSkillsSource
          ),

        jobType: employmentType || "Private Job",
        category:
          determineWorkdayCategory(
            role,
            completeDescription,
            location,
            experience,
            workMode,
            country
          ),

        applyLink: sourceUrl,
        workMode,
        employmentType,
        lastDate,

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