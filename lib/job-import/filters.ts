import { looksLikeNonJobPage } from "@/lib/job-content-cleaner";

import { isStillActiveJob } from "./job-date-filter";

import type {
  ImportedJobCategory,
  NormalizedImportedJob,
} from "./types";

const INDIA_LOCATION_KEYWORDS = [
  "india",
  "bengaluru",
  "bangalore",
  "hyderabad",
  "pune",
  "chennai",
  "mumbai",
  "noida",
  "gurugram",
  "gurgaon",
  "delhi",
  "new delhi",
  "kolkata",
  "mysuru",
  "mysore",
  "kochi",
  "cochin",
  "ahmedabad",
  "jaipur",
  "bhubaneswar",
  "trivandrum",
  "thiruvananthapuram",
  "mangaluru",
  "mangalore",
  "hubballi",
  "hubli",
  "remote india",
  "remote - india",
  "remote, india",
  "india remote",
];

const FRESHER_KEYWORDS = [
  "fresher",
  "freshers",
  "entry level",
  "entry-level",
  "new graduate",
  "new graduates",
  "recent graduate",
  "recent graduates",
  "new grad",
  "new grads",
  "early career",
  "early careers",
  "campus hiring",
  "campus recruitment",
  "graduate program",
  "graduate programme",
  "graduate engineer trainee",
  "0 year",
  "0 years",
  "0-1 year",
  "0–1 year",
  "0 to 1 year",
  "no experience required",
];

const FRESHERS_AND_EXPERIENCED_KEYWORDS = [
  "freshers and experienced",
  "freshers & experienced",
  "fresher and experienced",
  "fresher & experienced",
  "0-2 years",
  "0–2 years",
  "0 to 2 years",
  "0-3 years",
  "0–3 years",
  "0 to 3 years",
  "0-4 years",
  "0–4 years",
  "0 to 4 years",
];

const WORK_FROM_HOME_KEYWORDS = [
  "work from home",
  "work-from-home",
  "remote india",
  "remote - india",
  "remote, india",
  "india remote",
  "fully remote",
];

const WALK_IN_KEYWORDS = [
  "walk-in",
  "walk in",
  "walkin",
  "walk-in drive",
  "walk in drive",
  "walkin drive",
];

const EXPERIENCED_ROLE_KEYWORDS = [
  "senior",
  "lead",
  "manager",
  "architect",
  "principal",
  "director",
  "specialist",
  "consultant",
  "staff engineer",
];

const BLOCKED_ROLE_TITLES = [
  "our culture",
  "recruitment fraud alert",
  "recruitment fraud",
  "hear from our employees",
  "employee stories",
  "about us",
  "talent pulse report",
  "alumni",
  "experienced professionals",
  "explore opportunities",
  "explore openings",
  "apply now",
  "contact us",
  "privacy policy",
  "terms and conditions",
  "cookie policy",
];

const MINIMUM_DESCRIPTION_LENGTH = 80;

function normalizeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function includesAny(
  value: string,
  keywords: string[]
): boolean {
  const normalizedValue = normalizeText(value);

  return keywords.some((keyword) =>
    normalizedValue.includes(
      normalizeText(keyword)
    )
  );
}

function hasExperiencedRequirement(
  value: string
): boolean {
  const normalizedValue = normalizeText(value);

  const experiencedPatterns = [
    /\b[1-9]\d*\s*\+\s*years?\b/,
    /\b[1-9]\d*\s*(?:-|–|to)\s*[1-9]\d*\s*years?\b/,
    /\bminimum\s+(?:of\s+)?[1-9]\d*\s*years?\b/,
    /\bat\s+least\s+[1-9]\d*\s*years?\b/,
    /\b[1-9]\d*\s*years?\s+of\s+experience\b/,
  ];

  return experiencedPatterns.some((pattern) =>
    pattern.test(normalizedValue)
  );
}

function hasFresherRoleSignal(
  role: string,
  description: string
): boolean {
  const normalizedRole = normalizeText(role);
  const normalizedDescription =
    normalizeText(description);

  const fresherRolePatterns = [
    /\bjunior\b/,
    /\bentry[- ]level\b/,
    /\bassociate software engineer\b/,
    /\bassociate engineer\b/,
    /\bgraduate engineer trainee\b/,
    /\bnew graduate\b/,
    /\bearly career\b/,
  ];

  if (
    fresherRolePatterns.some((pattern) =>
      pattern.test(normalizedRole)
    )
  ) {
    return true;
  }

  const explicitDescriptionPatterns = [
    /\bnew graduates?\b/,
    /\brecent graduates?\b/,
    /\bearly careers?\b/,
    /\bentry[- ]level candidates?\b/,
    /\bjunior career path\b/,
    /\b0\s*(?:-|–|to)\s*[12]\s*years?\b/,
    /\bno experience required\b/,
  ];

  return explicitDescriptionPatterns.some(
    (pattern) =>
      pattern.test(normalizedDescription)
  );
}

function hasJobSignals(
  job: NormalizedImportedJob
): boolean {
  const text = normalizeText(
    [
      job.role,
      job.description,
      job.responsibilities,
      job.eligibility,
      job.education,
      job.experience,
      Array.isArray(job.skills)
        ? job.skills.join(" ")
        : "",
      Array.isArray(job.requiredSkills)
        ? job.requiredSkills.join(" ")
        : "",
    ].join(" ")
  );

  const signals = [
    "responsibilities",
    "requirements",
    "qualifications",
    "experience",
    "skills",
    "job description",
    "role",
    "degree",
    "candidate",
    "apply",
  ];

  return (
    signals.filter((signal) =>
      text.includes(signal)
    ).length >= 2
  );
}

function isBlockedRole(role: string): boolean {
  const normalizedRole = normalizeText(role);

  return BLOCKED_ROLE_TITLES.some(
    (blockedTitle) =>
      normalizedRole === blockedTitle ||
      normalizedRole.startsWith(
        `${blockedTitle} `
      )
  );
}

export function isIndiaJob(
  location: string,
  country = ""
): boolean {
  const searchableLocation =
    `${location} ${country}`.trim();

  if (!searchableLocation) {
    return false;
  }

  return includesAny(
    searchableLocation,
    INDIA_LOCATION_KEYWORDS
  );
}

export function inferExperience(
  role: string,
  description: string,
  existingExperience = ""
): string {
  const currentExperience =
    existingExperience.trim();

  if (
    currentExperience &&
    !/^not mentioned$/i.test(
      currentExperience
    )
  ) {
    return currentExperience;
  }

  const normalizedRole =
    normalizeText(role);

  const normalizedDescription =
    normalizeText(description);

  const combinedText =
    `${normalizedRole} ${normalizedDescription}`;

  if (
    /\b(intern|internship)\b/.test(
      normalizedRole
    )
  ) {
    return "Internship";
  }

  if (
    hasFresherRoleSignal(
      role,
      description
    )
  ) {
    return "0-2 years";
  }

  const rangeMatch = combinedText.match(
    /\b(\d+)\s*(?:-|–|to)\s*(\d+)\s*years?\b/
  );

  if (rangeMatch) {
    return `${rangeMatch[1]}-${rangeMatch[2]} years`;
  }

  const plusMatch = combinedText.match(
    /\b(\d+)\s*\+\s*years?\b/
  );

  if (plusMatch) {
    return `${plusMatch[1]}+ years`;
  }

  const minimumMatch = combinedText.match(
    /\b(?:minimum\s+(?:of\s+)?|at\s+least\s+)(\d+)\s*years?\b/
  );

  if (minimumMatch) {
    return `${minimumMatch[1]}+ years`;
  }

  if (
    /\bprincipal\b|\bdirector\b|\bhead of\b|\bvice president\b|\bvp\b/.test(
      normalizedRole
    )
  ) {
    return "10+ years";
  }

  if (
    /\bstaff engineer\b|\blead\b|\bmanager\b|\barchitect\b/.test(
      normalizedRole
    )
  ) {
    return "7+ years";
  }

  if (
    /\bsenior\b|\bspecialist\b|\bconsultant\b/.test(
      normalizedRole
    )
  ) {
    return "5+ years";
  }

  if (
    /\bexperience (?:programming|working|building|developing|designing|managing|leading|with|in)\b/.test(
      normalizedDescription
    ) ||
    /\byou have experience\b|\bproven experience\b|\brelevant experience\b/.test(
      normalizedDescription
    )
  ) {
    return "Relevant Experience Preferred";
  }

  return "Not Mentioned";
}

export function determineJobCategory(
  role: string,
  description: string,
  location: string
): ImportedJobCategory {
  const searchableText =
    `${role} ${description} ${location}`;

  const normalizedRole =
    normalizeText(role);

  if (
    /\b(intern|internship|apprentice|apprenticeship)\b/.test(
      normalizedRole
    ) ||
    /\bthis is an internship\b|\binternship opportunity\b|\bapprenticeship opportunity\b/i.test(
      searchableText
    )
  ) {
    return "internship";
  }

  if (
    includesAny(
      searchableText,
      WALK_IN_KEYWORDS
    )
  ) {
    return "walk-in-drive";
  }

  if (
    includesAny(
      searchableText,
      WORK_FROM_HOME_KEYWORDS
    )
  ) {
    return "work-from-home";
  }

  if (
    includesAny(
      searchableText,
      FRESHERS_AND_EXPERIENCED_KEYWORDS
    )
  ) {
    return "freshers-experienced";
  }

  if (
    includesAny(
      searchableText,
      FRESHER_KEYWORDS
    ) ||
    hasFresherRoleSignal(
      role,
      description
    )
  ) {
    return "freshers";
  }

  if (
    hasExperiencedRequirement(searchableText) ||
    includesAny(
      role,
      EXPERIENCED_ROLE_KEYWORDS
    )
  ) {
    return "experienced";
  }

  return "experienced";
}

export function shouldImportJob(
  job: NormalizedImportedJob
): boolean {
  const role = job.role?.trim() || "";
  const company = job.company?.trim() || "";
  const applyLink =
    job.applyLink?.trim() || "";
  const sourceJobId =
    job.sourceJobId?.trim() || "";
  const description =
    job.description?.trim() || "";

  if (!role || !company) {
    return false;
  }

  if (!applyLink || !sourceJobId) {
    return false;
  }

  if (isBlockedRole(role)) {
    return false;
  }

  if (
    looksLikeNonJobPage(
      role,
      description
    )
  ) {
    return false;
  }

  if (
    description.length <
      MINIMUM_DESCRIPTION_LENGTH &&
    !job.responsibilities?.trim() &&
    !job.eligibility?.trim()
  ) {
    return false;
  }

  if (!hasJobSignals(job)) {
    return false;
  }

  if (!isStillActiveJob(job.lastDate)) {
    return false;
  }

  return true;
}