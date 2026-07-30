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
  "remote india",
  "remote - india",
];

const FRESHER_KEYWORDS = [
  "fresher",
  "freshers",
  "entry level",
  "entry-level",
  "new graduate",
  "recent graduate",
  "campus hiring",
  "campus recruitment",
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

const INTERNSHIP_KEYWORDS = [
  "intern",
  "internship",
  "apprentice",
  "apprenticeship",
  "graduate trainee",
  "management trainee",
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

function normalizeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function includesAny(value: string, keywords: string[]): boolean {
  const normalizedValue = normalizeText(value);

  return keywords.some((keyword) =>
    normalizedValue.includes(normalizeText(keyword))
  );
}

function hasExperiencedRequirement(value: string): boolean {
  const normalizedValue = normalizeText(value);

  const experiencedPatterns = [
    /\b[1-9]\d*\s*\+\s*years?\b/,
    /\b[1-9]\d*\s*(?:-|–|to)\s*[1-9]\d*\s*years?\b/,
    /\bminimum\s+(?:of\s+)?[1-9]\d*\s*years?\b/,
    /\bat\s+least\s+[1-9]\d*\s*years?\b/,
    /\b[1-9]\d*\s*years?\s+of\s+experience\b/,
  ];

  return experiencedPatterns.some((pattern) => pattern.test(normalizedValue));
}

export function isIndiaJob(location: string): boolean {
  if (!location.trim()) {
    return false;
  }

  return includesAny(location, INDIA_LOCATION_KEYWORDS);
}

export function determineJobCategory(
  role: string,
  description: string,
  location: string
): ImportedJobCategory {
  const searchableText = `${role} ${description} ${location}`;

  if (includesAny(searchableText, INTERNSHIP_KEYWORDS)) {
    return "internship";
  }

  if (includesAny(searchableText, WALK_IN_KEYWORDS)) {
    return "walk-in-drive";
  }

  if (includesAny(searchableText, WORK_FROM_HOME_KEYWORDS)) {
    return "work-from-home";
  }

  if (includesAny(searchableText, FRESHERS_AND_EXPERIENCED_KEYWORDS)) {
    return "freshers-experienced";
  }

  if (includesAny(searchableText, FRESHER_KEYWORDS)) {
    return "freshers";
  }

  if (
    hasExperiencedRequirement(searchableText) ||
    includesAny(role, EXPERIENCED_ROLE_KEYWORDS)
  ) {
    return "experienced";
  }

  return "experienced";
}

export function shouldImportJob(job: NormalizedImportedJob): boolean {
  if (!job.role.trim()) {
    return false;
  }

  if (!job.company.trim()) {
    return false;
  }

  if (!job.applyLink.trim()) {
    return false;
  }

  if (!job.sourceJobId.trim()) {
    return false;
  }

  if (!isIndiaJob(job.location)) {
    return false;
  }

  return true;
}