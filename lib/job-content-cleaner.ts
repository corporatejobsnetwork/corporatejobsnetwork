import { parseJobSections } from "@/lib/job-section-parser";

type CleanedJobContent = {
  description: string;
  responsibilities: string;
  eligibility: string;
  benefits: string;
  selectionProcess: string;
};

const NOISE_LINE_PATTERNS: RegExp[] = [
  /^home$/i,
  /^about us$/i,
  /^contact us$/i,
  /^careers?$/i,
  /^jobs?$/i,
  /^search$/i,
  /^apply$/i,
  /^apply now$/i,
  /^explore opportunities$/i,
  /^discover$/i,
  /^discover \d+$/i,
  /^experience$/i,
  /^our culture$/i,
  /^alumni$/i,
  /^industries$/i,
  /^platforms$/i,
  /^services$/i,
  /^talent pulse report$/i,
  /^recruitment fraud alert$/i,
  /^recruitment fraud$/i,
  /^privacy policy$/i,
  /^terms(?: and conditions| of use)?$/i,
  /^cookie policy$/i,
  /^accessibility$/i,
  /^sitemap$/i,
  /^sign in$/i,
  /^login$/i,
  /^register$/i,
  /^follow us$/i,
  /^share$/i,
  /^back$/i,
  /^next$/i,
  /^previous$/i,
  /^menu$/i,
  /^close$/i,
  /^skip to (?:main )?content$/i,
  /^hit enter to search or esc to close$/i,
  /^learn more$/i,
  /^read more$/i,
  /^view all$/i,
  /^explore life at .*$/i,
];

const COUNTRY_ONLY_PATTERN =
  /^(?:india|united states|usa|canada|mexico|brazil|argentina|united kingdom|uk|ireland|france|germany|italy|spain|portugal|netherlands|belgium|switzerland|sweden|norway|denmark|finland|poland|austria|czech republic|romania|hungary|greece|turkey|uae|united arab emirates|saudi arabia|qatar|kuwait|bahrain|oman|singapore|malaysia|indonesia|philippines|thailand|vietnam|china|japan|south korea|australia|new zealand|south africa)$/i;

const SECTION_HEADING_PATTERN =
  /^(?:job description|role overview|about the role|responsibilities|roles and responsibilities|key responsibilities|requirements|qualifications|eligibility|skills|required skills|preferred skills|experience|education|benefits|what we offer|selection process|employment type|work mode|location|salary|compensation)$/i;

const NON_JOB_PAGE_TITLES = [
  "our culture",
  "recruitment fraud alert",
  "recruitment fraud",
  "hear from our employees",
  "employee stories",
  "about us",
  "talent pulse report",
  "alumni",
  "experienced professionals",
  "internships",
];

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    );
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|section|article|h1|h2|h3|h4|h5|h6|li|ul|ol|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ");
}

function normalizeLine(line: string): string {
  return line
    .replace(/^\s*(?:-->|→|»|›)+\s*/g, "")
    .replace(/^\s*[•·▪◦‣]+\s*$/g, "")
    .replace(/^\s*[•·▪◦‣]+\s*/g, "• ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoiseLine(line: string): boolean {
  if (!line) return true;

  if (
    line === "•" ||
    line === "-" ||
    line === "--" ||
    line === "-->" ||
    line === "→"
  ) {
    return true;
  }

  if (NOISE_LINE_PATTERNS.some((pattern) => pattern.test(line))) {
    return true;
  }

  if (COUNTRY_ONLY_PATTERN.test(line)) {
    return true;
  }

  if (
    /^(?:facebook|linkedin|instagram|youtube|twitter|x)$/i.test(
      line
    )
  ) {
    return true;
  }

  if (/^(?:©|copyright)\s+\d{4}/i.test(line)) {
    return true;
  }

  if (/^(?:all rights reserved)/i.test(line)) {
    return true;
  }

  return false;
}

function removeRepeatedLines(lines: string[]): string[] {
  const seen = new Set<string>();

  return lines.filter((line) => {
    const key = line.toLowerCase().replace(/\s+/g, " ").trim();

    if (!key) return false;

    if (SECTION_HEADING_PATTERN.test(line)) {
      return true;
    }

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function cleanRawDescription(rawDescription: string): string {
  const plainText = stripHtml(rawDescription)
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\t+/g, " ");

  const cleanedLines = plainText
    .split("\n")
    .map(normalizeLine)
    .filter((line) => !isNoiseLine(line));

  return removeRepeatedLines(cleanedLines)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeSection(value: string): string {
  return removeRepeatedLines(
    value
      .split("\n")
      .map(normalizeLine)
      .filter((line) => !isNoiseLine(line))
  )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function looksLikeNonJobPage(
  role?: string,
  description?: string
): boolean {
  const title = (role || "").trim().toLowerCase();
  const body = (description || "").trim().toLowerCase();

  if (
    NON_JOB_PAGE_TITLES.some(
      (value) => title === value || title.startsWith(`${value} `)
    )
  ) {
    return true;
  }

  const navigationHits = [
    "about us",
    "our culture",
    "alumni",
    "industries",
    "platforms",
    "services",
    "recruitment fraud alert",
    "talent pulse report",
  ].filter((value) => body.includes(value)).length;

  const jobSignalHits = [
    "responsibilities",
    "requirements",
    "qualifications",
    "experience",
    "skills",
    "job description",
    "apply",
  ].filter((value) => body.includes(value)).length;

  return navigationHits >= 4 && jobSignalHits <= 2;
}

export function cleanImportedJobContent(
  rawDescription?: string
): CleanedJobContent {
  const cleanedSource = cleanRawDescription(
    rawDescription || ""
  );

  const parsed = parseJobSections(cleanedSource);

  return {
    description: sanitizeSection(parsed.description),
    responsibilities: sanitizeSection(
      parsed.responsibilities
    ),
    eligibility: sanitizeSection(parsed.requirements),
    benefits: sanitizeSection(parsed.benefits),
    selectionProcess: sanitizeSection(
      parsed.selectionProcess
    ),
  };
}