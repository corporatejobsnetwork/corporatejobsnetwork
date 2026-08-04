import { determineJobCategory } from "../filters";
import type {
  GreenhouseCompany,
  NormalizedImportedJob,
} from "../types";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  first_published?: string;
  application_deadline?: string | null;
  location?: {
    name?: string;
  };
  content?: string;
  metadata?: Array<{
    name?: string;
    value?: unknown;
    value_type?: string;
  }>;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

interface SkillAlias {
  label: string;
  patterns: RegExp[];
}

const SECTION_HEADINGS = [
  "about the role",
  "about this role",
  "job description",
  "responsibilities",
  "roles and responsibilities",
  "key responsibilities",
  "your responsibilities",
  "what you will do",
  "what you'll do",
  "what you’ll do",
  "day to day",
  "day-to-day",
  "what your day will look like",
  "what you will focus on",
  "what you deliver",
  "what you will deliver",
  "key deliverables",
  "your impact",
  "what you will achieve",
  "requirements",
  "minimum requirements",
  "required qualifications",
  "required skills",
  "preferred requirements",
  "preferred qualifications",
  "preferred skills",
  "qualifications",
  "eligibility",
  "who you are",
  "what we are looking for",
  "what we're looking for",
  "what we’re looking for",
  "experience",
  "education",
  "skills",
  "technical skills",
  "nice-to-have skills",
  "nice to have skills",
  "good to have skills",
  "preferred experience",
  "technical and professional requirements",
  "educational qualification",
  "educational qualifications",
  "eligibility criteria",
  "benefits",
  "benefits and perks",
  "benefits & perks",
  "perks",
  "what we offer",
  "what we offer you",
  "why join us",
  "why razorpay",
  "our offer",
  "employee benefits",
  "rewards and benefits",
  "about the company",
  "about company",
  "about canonical",
  "selection process",
  "interview process",
];

const BOILERPLATE_START_PATTERNS = [
  /^equal employment opportunity/i,
  /^equal opportunity employer/i,
  /^we are an equal opportunity/i,
  /^razorpay believes in and follows an equal employment/i,
  /^we welcome interests and applications/i,
  /^follow us on/i,
  /^connect with us on/i,
  /^privacy notice/i,
  /^privacy policy/i,
  /^applicant privacy/i,
  /^accommodation/i,
  /^disclaimer/i,
  /^about razorpay/i,
  /^about canonical/i,
  /^about the company/i,
  /^about company/i,
  /^diversity/i,
  /^inclusion/i,
  /^#li[-_]/i,
  /^#remote/i,
  /^canonical is an equal opportunity employer/i,
];

const EXPERIENCE_PATTERNS = [
  /\b(\d+\s*(?:-|–|—|to)\s*\d+\s*(?:\+?\s*)?years?(?:\s+of\s+experience)?)\b/i,
  /\b(\d+\+\s*years?(?:\s+of\s+experience)?)\b/i,
  /\b(?:minimum\s+(?:of\s+)?)?(\d+\s+years?(?:\s+of\s+experience)?)\b/i,
  /\b(0\s*(?:-|–|—|to)\s*1\s*years?)\b/i,
  /\b(freshers?)\b/i,
  /\b(entry[- ]level)\b/i,
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
  {
    label: "Java",
    patterns: [/\bjava\b/i],
  },
  {
    label: "JavaScript",
    patterns: [/\bjavascript\b/i, /\bjs\b/i],
  },
  {
    label: "TypeScript",
    patterns: [/\btypescript\b/i],
  },
  {
    label: "React",
    patterns: [/\breact(?:\.js)?\b/i],
  },
  {
    label: "Angular",
    patterns: [/\bangular(?:\.js)?\b/i],
  },
  {
    label: "Vue.js",
    patterns: [/\bvue(?:\.js)?\b/i],
  },
  {
    label: "Node.js",
    patterns: [/\bnode(?:\.js)?\b/i],
  },
  {
    label: "Python",
    patterns: [/\bpython\b/i],
  },
  {
    label: "PHP",
    patterns: [/\bphp\b/i],
  },
  {
    label: ".NET",
    patterns: [/(?:^|[^a-z0-9])\.net(?:[^a-z0-9]|$)/i],
  },
  {
    label: "C#",
    patterns: [/(?:^|[^a-z0-9])c#(?:[^a-z0-9]|$)/i],
  },
  {
    label: "C++",
    patterns: [/(?:^|[^a-z0-9])c\+\+(?:[^a-z0-9]|$)/i],
  },
  {
    label: "Go",
    patterns: [/\bgolang\b/i, /\bgo language\b/i],
  },
  {
    label: "Ruby",
    patterns: [/\bruby\b/i],
  },
  {
    label: "Ruby on Rails",
    patterns: [/\bruby on rails\b/i, /\brails\b/i],
  },
  {
    label: "Kotlin",
    patterns: [/\bkotlin\b/i],
  },
  {
    label: "Swift",
    patterns: [/\bswift\b/i],
  },
  {
    label: "SQL",
    patterns: [/\bsql\b/i],
  },
  {
    label: "MySQL",
    patterns: [/\bmysql\b/i],
  },
  {
    label: "PostgreSQL",
    patterns: [/\bpostgres(?:ql)?\b/i],
  },
  {
    label: "MongoDB",
    patterns: [/\bmongodb\b/i],
  },
  {
    label: "Oracle",
    patterns: [/\boracle database\b/i, /\boracle sql\b/i],
  },
  {
    label: "Redis",
    patterns: [/\bredis\b/i],
  },
  {
    label: "Spring Boot",
    patterns: [/\bspring\s*boot\b/i],
  },
  {
    label: "Spring",
    patterns: [/\bspring framework\b/i, /\bspring mvc\b/i],
  },
  {
    label: "Django",
    patterns: [/\bdjango\b/i],
  },
  {
    label: "Flask",
    patterns: [/\bflask\b/i],
  },
  {
    label: "AWS",
    patterns: [/\baws\b/i, /\bamazon web services\b/i],
  },
  {
    label: "Azure",
    patterns: [/\bazure\b/i],
  },
  {
    label: "GCP",
    patterns: [/\bgcp\b/i, /\bgoogle cloud(?: platform)?\b/i],
  },
  {
    label: "Docker",
    patterns: [/\bdocker\b/i],
  },
  {
    label: "Kubernetes",
    patterns: [/\bkubernetes\b/i, /\bk8s\b/i],
  },
  {
    label: "Linux",
    patterns: [/\blinux\b/i],
  },
  {
    label: "Git",
    patterns: [/\bgit\b/i],
  },
  {
    label: "GitHub",
    patterns: [/\bgithub\b/i],
  },
  {
    label: "Jenkins",
    patterns: [/\bjenkins\b/i],
  },
  {
    label: "CI/CD",
    patterns: [/\bci\s*\/?\s*cd\b/i],
  },
  {
    label: "REST APIs",
    patterns: [/\brest(?:ful)?\s+apis?\b/i],
  },
  {
    label: "GraphQL",
    patterns: [/\bgraphql\b/i],
  },
  {
    label: "Microservices",
    patterns: [/\bmicroservices?\b/i],
  },
  {
    label: "API Integration",
    patterns: [/\bapi integrations?\b/i],
  },
  {
    label: "Platform Integration",
    patterns: [/\bplatform integrations?\b/i],
  },
  {
    label: "System Integration",
    patterns: [/\bsystem integrations?\b/i],
  },
  {
    label: "Data Analysis",
    patterns: [/\bdata analysis\b/i, /\bdata analytics\b/i],
  },
  {
    label: "Machine Learning",
    patterns: [/\bmachine learning\b/i],
  },
  {
    label: "Artificial Intelligence",
    patterns: [/\bartificial intelligence\b/i, /\bgenerative ai\b/i],
  },
  {
    label: "Excel",
    patterns: [/\bmicrosoft excel\b/i, /\bms excel\b/i, /\bexcel\b/i],
  },
  {
    label: "Power BI",
    patterns: [/\bpower\s*bi\b/i],
  },
  {
    label: "Tableau",
    patterns: [/\btableau\b/i],
  },
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
  {
    label: "Presentation Skills",
    patterns: [
      /\bpresentation skills?\b/i,
      /\bpresentation abilities\b/i,
      /\bpresentation capability\b/i,
    ],
  },
  {
    label: "Problem Solving",
    patterns: [
      /\bproblem[- ]solving\b/i,
      /\bsolve complex problems?\b/i,
    ],
  },
  {
    label: "Analytical Skills",
    patterns: [
      /\banalytical skills?\b/i,
      /\bstrong analytical\b/i,
      /\banalytical thinking\b/i,
    ],
  },
  {
    label: "Customer Facing",
    patterns: [
      /\bcustomer[- ]facing\b/i,
      /\bclient[- ]facing\b/i,
    ],
  },
  {
    label: "Stakeholder Management",
    patterns: [
      /\bstakeholder management\b/i,
      /\bmanage stakeholders?\b/i,
    ],
  },
  {
    label: "Project Management",
    patterns: [/\bproject management\b/i],
  },
  {
    label: "Team Collaboration",
    patterns: [
      /\bteam collaboration\b/i,
      /\bcollaborate with cross[- ]functional teams?\b/i,
      /\bcross[- ]functional collaboration\b/i,
    ],
  },
  {
    label: "Fintech",
    patterns: [/\bfintech\b/i, /\bfinancial technology\b/i],
  },
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

function stripHtml(html: string): string {
  return decodeHtmlEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(
      /<\/(?:p|div|h1|h2|h3|h4|h5|h6|ul|ol)>/gi,
      "\n"
    )
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeHeading(value: string): string {
  return value
    .replace(/^[-•*#:\s]+/, "")
    .replace(/[:\-–—]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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
  const cleaned = line.replace(/^[-•*]\s*/, "").trim();

  return BOILERPLATE_START_PATTERNS.some((pattern) =>
    pattern.test(cleaned)
  );
}

function cleanSectionLine(value: string): string {
  return value
    .replace(/^[-•*]\s*/, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSection(
  text: string,
  headings: string[]
): string[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const normalizedTargets = headings.map((heading) =>
    normalizeHeading(heading)
  );

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

    if (cleaned && cleaned !== "&nbsp;") {
      results.push(cleaned);
    }
  }

  return Array.from(new Set(results)).slice(0, 25);
}

function extractExperience(text: string): string {
  const experienceSection = extractSection(text, [
    "experience",
    "requirements",
    "minimum requirements",
    "required qualifications",
    "qualifications",
  ]).join(" ");

  const searchableText = `${experienceSection} ${text}`;

  for (const pattern of EXPERIENCE_PATTERNS) {
    const match = searchableText.match(pattern);

    if (match?.[1]) {
      return match[1].replace(/\s+/g, " ").trim();
    }
  }

  return "Not Mentioned";
}

function normalizeExperienceValue(
  value: string
): string {
  const normalized = value
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Not Mentioned";
  }

  if (/^freshers?$/i.test(normalized)) {
    return "Freshers";
  }

  if (/^entry[- ]level$/i.test(normalized)) {
    return "0-2 years";
  }

  const rangeMatch = normalized.match(
    /\b(\d+)\s*(?:-|–|—|to)\s*(\d+)\s*years?\b/i
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

  const singleYearMatch = normalized.match(
    /\b(\d+)\s*years?\b/i
  );

  if (singleYearMatch) {
    const years = Number(singleYearMatch[1]);

    return years >= 5
      ? `${years}+ years`
      : `${years} years`;
  }

  return normalized;
}

function inferGreenhouseExperience(
  role: string,
  description: string,
  extractedExperience: string
): string {
  const normalizedExtracted =
    normalizeExperienceValue(
      extractedExperience
    );

  if (
    normalizedExtracted !==
      "Not Mentioned" &&
    normalizedExtracted !==
      "Relevant Experience Preferred"
  ) {
    return normalizedExtracted;
  }

  const normalizedRole =
    normalizeHeading(role);

  const normalizedDescription =
    description
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const combinedText =
    `${normalizedRole} ${normalizedDescription}`;

  /*
   * Priority 1: exact experience stated by the employer.
   */
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

  /*
   * Priority 2: internship, graduate and early-career titles.
   */
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

  /*
   * Priority 3: seniority and leadership titles.
   */
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
    /\bmid[- ]level\b|\bintermediate\b/i.test(
      normalizedRole
    )
  ) {
    return "3-5 years";
  }

  /*
   * Priority 4: strong fresher language in the description.
   */
  if (
    /\bnew graduates?\b|\brecent graduates?\b|\bearly careers?\b|\bgraduate programme\b|\bgraduate program\b|\bjunior career path\b|\bno experience required\b/i.test(
      normalizedDescription
    )
  ) {
    return "Freshers";
  }

  /*
   * Priority 5: experience language when years are not stated.
   */
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

  /*
   * Priority 6: safe role-based fallbacks.
   */
  if (
    /\bsoftware engineer\b|\bsystem software engineer\b|\bbackend engineer\b|\bfrontend engineer\b|\bfull[- ]stack engineer\b|\bdevops engineer\b|\bsecurity engineer\b|\bqa engineer\b|\bautomation engineer\b|\bcloud engineer\b|\bsystems? engineer\b|\bplatform engineer\b|\bkernel engineer\b|\bsupport engineer\b|\bsite reliability engineer\b|\bdeveloper\b|\badministrator\b|\banalyst\b|\bdesigner\b/i.test(
      normalizedRole
    )
  ) {
    return "3-5 years";
  }

  if (
    /\bsales development representative\b|\bbusiness development representative\b|\bchannel partner sales executive\b|\bsales representative\b|\bmarketing executive\b|\boffice administrator\b|\bproject coordinator\b|\boperations coordinator\b/i.test(
      normalizedRole
    )
  ) {
    return "2-5 years";
  }

  if (signalCount === 1) {
    return "3-5 years";
  }

  /*
   * Final fallback: keep a useful value rather than a vague label.
   */
  return "2-5 years";
}


function containsEducationQualification(
  line: string
): boolean {
  const normalized = line.toLowerCase();

  const degreeWords =
    /\b(bachelor'?s?|master'?s?|degree|graduate|graduation|undergraduate|postgraduate|diploma)\b/i.test(
      normalized
    );

  const abbreviatedDegree =
    /\b(B\.?\s*Tech|M\.?\s*Tech|B\.?\s*E\.|M\.?\s*E\.|BCA|MCA|BBA|MBA|B\.?\s*Com|M\.?\s*Com)\b/i.test(
      line
    );

  return degreeWords || abbreviatedDegree;
}

function extractEducation(text: string): string {
  const preferredSections = [
    ...extractSection(text, ["education"]),
    ...extractSection(text, [
      "qualifications",
      "required qualifications",
      "minimum requirements",
      "requirements",
      "eligibility",
    ]),
  ];

  const allLines = text
    .split("\n")
    .map((line) => cleanSectionLine(line))
    .filter(Boolean);

  const candidates = [...preferredSections, ...allLines]
    .filter(containsEducationQualification)
    .filter((line) => !isBoilerplateStart(line))
    .filter((line) => line.length >= 6 && line.length <= 220);

  const uniqueCandidates = Array.from(
    new Map(
      candidates.map((line) => [line.toLowerCase(), line])
    ).values()
  );

  return uniqueCandidates[0] || "Not Mentioned";
}

function extractSalary(text: string): string {
  for (const pattern of SALARY_PATTERNS) {
    const match = text.match(pattern);

    if (match?.[0]) {
      return match[0].replace(/\s+/g, " ").trim();
    }
  }

  return "Salary Not Disclosed";
}

function findSkillsInText(text: string): string[] {
  const normalizedText = cleanSectionLine(text);

  const discoveredSkills = SKILL_ALIASES.filter(({ patterns }) =>
    patterns.some((pattern) => pattern.test(normalizedText))
  ).map(({ label }) => label);

  const uniqueSkills = Array.from(
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
    return uniqueSkills.filter((skill) => skill !== "Spring");
  }

  if (
    uniqueSkills.includes("Ruby on Rails") &&
    uniqueSkills.includes("Ruby")
  ) {
    return uniqueSkills.filter((skill) => skill !== "Ruby");
  }

  if (
    uniqueSkills.includes("MySQL") ||
    uniqueSkills.includes("PostgreSQL")
  ) {
    return uniqueSkills.filter((skill) => skill !== "SQL");
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
    "qualifications",
    "who you are",
    "what we are looking for",
    "what we're looking for",
    "what we’re looking for",
  ]);

  const cleanedRequiredSections = requiredSections
    .map((item) => cleanSectionLine(item))
    .filter((item) => item.length >= 3)
    .filter((item) => !isBoilerplateStart(item));

  const requiredSectionText = cleanedRequiredSections.join(" ");

  const requiredSkills = findSkillsInText(requiredSectionText);

  /*
   * Some Greenhouse jobs do not use a clear Requirements heading.
   * In that case, use skills found in the complete description rather
   * than returning long requirement sentences.
   */
  if (requiredSkills.length === 0) {
    return findSkillsInText(text).slice(0, 15);
  }

  return requiredSkills.slice(0, 15);
}



function parseDate(value?: string | null): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function getGreenhouseJobDate(
  job: GreenhouseJob
): Date | null {
  return (
    parseDate(job.updated_at) ||
    parseDate(job.first_published)
  );
}


function isActiveGreenhouseJob(
  job: GreenhouseJob
): boolean {
  if (!job.application_deadline) {
    // The public Greenhouse Job Board API normally returns only open jobs.
    return true;
  }

  const deadline = parseDate(
    job.application_deadline
  );

  if (!deadline) {
    return true;
  }

  deadline.setHours(23, 59, 59, 999);

  return deadline.getTime() >= Date.now();
}



const INDIA_LOCATION_PATTERNS = [
  /\bindia\b/i,
  /\bbengaluru\b/i,
  /\bbangalore\b/i,
  /\bhyderabad\b/i,
  /\bchennai\b/i,
  /\bpune\b/i,
  /\bmumbai\b/i,
  /\bnoida\b/i,
  /\bgurugram\b/i,
  /\bgurgaon\b/i,
  /\bnew delhi\b/i,
  /\bdelhi\b/i,
  /\bkolkata\b/i,
  /\bkochi\b/i,
  /\bcochin\b/i,
  /\bahmedabad\b/i,
  /\bjaipur\b/i,
  /\bbhubaneswar\b/i,
  /\bthiruvananthapuram\b/i,
  /\btrivandrum\b/i,
  /\bmangaluru\b/i,
  /\bmangalore\b/i,
  /\bhubballi\b/i,
  /\bhubli\b/i,
];

function detectCountry(location: string): string {
  if (INDIA_LOCATION_PATTERNS.some((pattern) => pattern.test(location))) {
    return "India";
  }

  if (/\bemea\b/i.test(location)) {
    return "EMEA";
  }

  if (/\bamericas?\b/i.test(location)) {
    return "Americas";
  }

  if (/\beurope\b/i.test(location)) {
    return "Europe";
  }

  if (/\bapac\b|\basia pacific\b/i.test(location)) {
    return "APAC";
  }

  if (/\bunited states\b|\busa\b|\bu\.s\.\b/i.test(location)) {
    return "United States";
  }

  if (/\bunited kingdom\b|\buk\b/i.test(location)) {
    return "United Kingdom";
  }

  if (/\bcanada\b/i.test(location)) {
    return "Canada";
  }

  if (/\baustralia\b/i.test(location)) {
    return "Australia";
  }

  if (/\bsingapore\b/i.test(location)) {
    return "Singapore";
  }

  return "Global";
}

function normalizeLocation(location: string): string {
  const value = location.replace(/\s+/g, " ").trim();

  const regions: string[] = [];

  if (/\bemea\b/i.test(value)) regions.push("EMEA");
  if (/\bamericas?\b/i.test(value)) regions.push("Americas");
  if (/\bapac\b|\basia pacific\b/i.test(value)) regions.push("APAC");
  if (INDIA_LOCATION_PATTERNS.some((pattern) => pattern.test(value))) {
    regions.push("India");
  }

  const isRemote =
    /\bremote\b|\bhome based\b|\bhome-based\b|\bwork from home\b|\bwfh\b/i.test(
      value
    );

  if (isRemote && regions.length > 0) {
    return `Remote (${Array.from(new Set(regions)).join(", ")})`;
  }

  if (
    isRemote &&
    /worldwide|global|every time zone|all time zones/i.test(
      value
    )
  ) {
    return "Remote (Worldwide)";
  }

  if (isRemote) {
    return "Remote";
  }

  return value || "Global";
}

function detectWorkMode(location: string, description: string): string {
  const searchableText = `${location} ${description}`;

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

function extractEmploymentType(job: GreenhouseJob, description: string): string {
  const metadataValue = job.metadata?.find((item) =>
    /employment (?:length|type)|job type/i.test(item.name || "")
  )?.value;

  if (typeof metadataValue === "string" && metadataValue.trim()) {
    return metadataValue.trim();
  }

  const searchableText = `${job.title} ${description}`;

  if (/\bpart[- ]time\b/i.test(searchableText)) return "Part-time";
  if (/\bcontract(?:or)?\b/i.test(searchableText)) return "Contract";
  if (/\btemporary\b/i.test(searchableText)) return "Temporary";
  if (/\bapprentice(?:ship)?\b/i.test(searchableText)) return "Apprenticeship";
  if (/\bintern(?:ship)?\b/i.test(job.title)) return "Internship";

  return "Full-time";
}

function determineGreenhouseCategory(
  role: string,
  description: string,
  location: string,
  experience: string
): ReturnType<typeof determineJobCategory> {
  const title = role.toLowerCase();
  const combined = `${role} ${description} ${location} ${experience}`;

  // Internship must be explicit. Do not classify ordinary roles merely
  // because the description mentions graduates, learning or development.
  if (
    /\b(intern|internship|apprentice|apprenticeship|student trainee)\b/i.test(
      title
    ) ||
    /\bthis is an internship\b|\binternship opportunity\b/i.test(combined)
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
    (/\bremote\b/i.test(location) && detectCountry(location) === "India")
  ) {
    return "work-from-home";
  }

  if (
    /\bfreshers?\b|\bentry[- ]level\b|\brecent graduates?\b|\bnew graduates?\b|\bearly careers?\b|\bgraduate programme\b|\bgraduate program\b|\bjunior career path\b|\b0\s*(?:-|–|to)\s*[12]\s*years?\b/i.test(
      combined
    ) ||
    /\bgraduate\b|\bjunior\b|\bentry[- ]level\b|\bassociate\b|\bearly career\b/i.test(
      role
    ) ||
    /^(Freshers|0-2 years)$/i.test(
      experience
    )
  ) {
    return "freshers";
  }

  if (
    /\b0\s*(?:-|–|to)\s*[34]\s*years?\b/i.test(combined)
  ) {
    return "freshers-experienced";
  }

  return "experienced";
}

function extractJobDescription(text: string): string {
  const stopHeadings = [
    "responsibilities",
    "roles and responsibilities",
    "key responsibilities",
    "what you will do",
    "what you'll do",
    "what you’ll do",
    "what your day will look like",
    "what you will focus on",
    "what you deliver",
    "what you will deliver",
    "key deliverables",
    "your impact",
    "requirements",
    "qualifications",
    "required qualifications",
    "what we are looking for",
    "what we're looking for",
    "what we’re looking for",
    "what we are looking for in you",
    "eligibility",
    "eligibility criteria",
    "benefits",
    "what we offer",
    "what we offer you",
    "what we offer colleagues",
    "our offer",
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
  }

  return result.join("\n").trim() || text;
}

function cleanExtractedSection(lines: string[]): string[] {
  const unique = new Map<string, string>();

  for (const line of lines) {
    const cleaned = cleanSectionLine(line);

    if (
      !cleaned ||
      isBoilerplateStart(cleaned) ||
      /^#li[-_]/i.test(cleaned) ||
      /^about (?:the )?company\b/i.test(cleaned) ||
      /^about canonical\b/i.test(cleaned) ||
      /equal opportunity employer/i.test(cleaned)
    ) {
      continue;
    }

    unique.set(cleaned.toLowerCase(), cleaned);
  }

  return Array.from(unique.values()).slice(0, 30);
}

function normalizeGreenhouseJob(
  company: GreenhouseCompany,
  job: GreenhouseJob
): NormalizedImportedJob | null {
  const sourceJobId = String(job.id || "").trim();
  const role = job.title?.trim() || "";
  const applyLink = job.absolute_url?.trim() || "";

  if (!sourceJobId || !role || !applyLink) {
    return null;
  }

  const completeDescription = stripHtml(job.content || "");

  const rawLocation =
    job.location?.name?.trim() ||
    company.defaultLocation ||
    "Global";

  const location = normalizeLocation(rawLocation);
  const country = detectCountry(rawLocation);
  const description = extractJobDescription(
    completeDescription
  );

  const responsibilities = extractSection(completeDescription, [
    "responsibilities",
    "roles and responsibilities",
    "key responsibilities",
    "your responsibilities",
    "what you will do",
    "what you'll do",
    "what you’ll do",
    "day to day",
    "day-to-day",
    "what your day will look like",
    "what you deliver",
    "what you will deliver",
    "key deliverables",
    "your impact",
    "what you will achieve",
  ]);

  const eligibility = extractSection(completeDescription, [
    "eligibility",
    "qualifications",
    "required qualifications",
    "minimum requirements",
    "requirements",
    "who you are",
    "what we are looking for",
    "what we're looking for",
    "what we’re looking for",
    "what we are looking for in you",
    "what we are looking for",
    "technical and professional requirements",
    "eligibility criteria",
    "educational qualification",
    "educational qualifications",
  ]);

  const benefits = extractSection(completeDescription, [
    "benefits",
    "benefits and perks",
    "benefits & perks",
    "perks",
    "what we offer",
    "what we offer colleagues",
    "why join us",
    "why razorpay",
    "our offer",
    "employee benefits",
    "rewards and benefits",
  ]);

  const selectionProcess = extractSection(completeDescription, [
    "selection process",
    "interview process",
  ]);

  const requiredSkills =
    extractRequiredSkills(completeDescription);

  const skills = extractSkills(completeDescription);

  const cleanedResponsibilities =
    cleanExtractedSection(responsibilities);

  const cleanedEligibility =
    cleanExtractedSection(eligibility);

  const cleanedBenefits =
    cleanExtractedSection(benefits);

  const cleanedSelectionProcess =
    cleanExtractedSection(selectionProcess);

  const extractedExperience =
    extractExperience(
      completeDescription
    );

  const experience =
    inferGreenhouseExperience(
      role,
      completeDescription,
      extractedExperience
    );

  const sourceCreatedAt =
    parseDate(job.first_published)?.toISOString() ||
    null;

  const sourceUpdatedAt =
    parseDate(job.updated_at)?.toISOString() ||
    sourceCreatedAt;

  return {
    uniqueKey:
      `greenhouse_${company.boardId}_${sourceJobId}`,

    source: "greenhouse",
    sourceJobId,
    sourceCompanyId: company.boardId,
    sourceUrl: applyLink,

    company: company.name,
    companySlug: company.slug,
    companyLogo: company.logo || "",

    role,
    location,
    country,

    description,
    responsibilities:
      cleanedResponsibilities.join("\n"),
    eligibility:
      cleanedEligibility.join("\n"),
    benefits: cleanedBenefits.join("\n"),
    selectionProcess:
      cleanedSelectionProcess.join("\n"),

    experience,
    education: extractEducation(
      completeDescription
    ),
    salary: extractSalary(
      completeDescription
    ),

    skills,
    requiredSkills,

    jobType: "Private Job",
    category: determineGreenhouseCategory(
      role,
      completeDescription,
      location,
      experience
    ),

    applyLink,

    workMode: detectWorkMode(
      rawLocation,
      completeDescription
    ),

    employmentType: extractEmploymentType(
      job,
      completeDescription
    ),
    lastDate:
      job.application_deadline?.trim() || "",

    importedAutomatically: true,
    trustedCompany: company.trusted,

    reviewStatus: "pending",
    processingStatus: "completed",
    status: "draft",
    isActive: true,

    sourceCreatedAt,
    sourceUpdatedAt,

    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchGreenhouseJobs(
  company: GreenhouseCompany
): Promise<NormalizedImportedJob[]> {
  const boardId = company.boardId?.trim();

  if (!boardId) {
    throw new Error(
      `${company.name} is missing its Greenhouse boardId.`
    );
  }

  const url =
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
      boardId
    )}/jobs?content=true`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "CorporateJobsNetwork/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch jobs for ${company.name}: ${response.status}`
    );
  }

  const data: GreenhouseResponse =
    await response.json();

  if (!Array.isArray(data.jobs)) {
    throw new Error(
      `${company.name} Greenhouse API returned an unexpected response.`
    );
  }

  const jobs: NormalizedImportedJob[] = [];
  const seenUniqueKeys = new Set<string>();

  const eligibleJobs = data.jobs
    .filter(isActiveGreenhouseJob)
    .sort((first, second) => {
      const firstTime =
        getGreenhouseJobDate(first)?.getTime() || 0;
      const secondTime =
        getGreenhouseJobDate(second)?.getTime() || 0;

      return secondTime - firstTime;
    });

  for (const job of eligibleJobs) {
    const normalized = normalizeGreenhouseJob(
      company,
      job
    );

    if (
      !normalized ||
      seenUniqueKeys.has(normalized.uniqueKey)
    ) {
      continue;
    }

    seenUniqueKeys.add(normalized.uniqueKey);
    jobs.push(normalized);
  }

  return jobs;
}