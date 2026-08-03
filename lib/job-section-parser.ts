export type ParsedJobSections = {
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  selectionProcess: string;
};

type SectionName =
  | "description"
  | "responsibilities"
  | "requirements"
  | "benefits"
  | "selectionProcess";

const SECTION_HEADINGS: Record<SectionName, string[]> = {
  description: [
    "about the job",
    "about the role",
    "about this role",
    "job description",
    "role overview",
    "position overview",
    "overview",
    "the role",
    "role summary",
    "position summary",
    "about the position",
  ],

  responsibilities: [
    "responsibilities",
    "key responsibilities",
    "roles and responsibilities",
    "what you'll own",
    "what you’ll own",
    "what you will own",
    "what you'll do",
    "what you’ll do",
    "what you will do",
    "what you'll be doing",
    "what you’ll be doing",
    "your responsibilities",
    "your role",
    "key accountabilities",
    "what success looks like",
    "what you can expect",
    "day to day responsibilities",
  ],

  requirements: [
    "requirements",
    "required experience",
    "qualifications",
    "required qualifications",
    "basic qualifications",
    "minimum qualifications",
    "preferred qualifications",
    "skills required",
    "required skills",
    "preferred skills",
    "skills and experience",
    "experience required",
    "what you need",
    "what you'll need",
    "what you’ll need",
    "who you are",
    "who we're looking for",
    "who we are looking for",
    "desired experience",
    "preferred experience",
    "must have",
    "good to have",
    "technical requirements",
    "technical requirement",
    "professional requirements",
    "educational requirements",
    "education requirements",
  ],

  benefits: [
    "benefits",
    "perks",
    "why join us",
    "why join",
    "what we offer",
    "our benefits",
    "employee benefits",
    "benefits and perks",
    "rewards and benefits",
    "compensation and benefits",
    "why you'll love working here",
    "why you’ll love working here",
    "life at",
  ],

  selectionProcess: [
    "selection process",
    "interview process",
    "hiring process",
    "recruitment process",
    "assessment process",
    "next steps",
    "application process",
    "selection stages",
    "interview stages",
  ],
};

const STOP_PATTERNS = [
  /follow us on linkedin/i,
  /follow us on twitter/i,
  /follow us on facebook/i,
  /follow us on instagram/i,
  /privacy policy/i,
  /cookie policy/i,
  /terms of use/i,
  /equal employment opportunity/i,
  /equal opportunity employer/i,
  /we are an equal opportunity employer/i,
];

const REQUIREMENT_LINE_PATTERNS: RegExp[] = [
  /^strong experience\b/i,
  /^proven experience\b/i,
  /^hands-on experience\b/i,
  /^experience (?:with|in|of)\b/i,
  /^good understanding\b/i,
  /^strong understanding\b/i,
  /^solid understanding\b/i,
  /^proficiency in\b/i,
  /^proficient in\b/i,
  /^knowledge of\b/i,
  /^working knowledge\b/i,
  /^familiarity with\b/i,
  /^must have\b/i,
  /^required\b/i,
  /^minimum\b/i,
  /^preferred\b/i,
  /^qualification\b/i,
  /^qualifications\b/i,
  /^bachelor(?:'s)?\b/i,
  /^master(?:'s)?\b/i,
  /^degree\b/i,
  /^graduate\b/i,
  /^postgraduate\b/i,
  /^ability to\b/i,
  /^excellent\b/i,
  /^good communication\b/i,
  /^strong communication\b/i,
  /^analytical\b/i,
  /^strong analytical\b/i,
  /^problem[- ]solving\b/i,
  /^\d+\+?\s*years?\b/i,
  /^\d+\s*(?:-|–|to)\s*\d+\s*years?\b/i,
];

function normalizeText(value = ""): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[:\-–—|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForDuplicateCheck(value: string): string {
  return removeBulletPrefix(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeBulletPrefix(value: string): string {
  return value
    .replace(/^[•●▪◦‣⁃□☐\-–—*›»]+\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function isLikelyHeading(line: string): boolean {
  const cleaned = removeBulletPrefix(line.trim());

  if (!cleaned || cleaned.length > 80) {
    return false;
  }

  if (/[.!?]$/.test(cleaned)) {
    return false;
  }

  return cleaned.split(/\s+/).length <= 10;
}

function getSectionName(line: string): SectionName | null {
  const cleanedLine = removeBulletPrefix(line);

  if (!isLikelyHeading(cleanedLine)) {
    return null;
  }

  const normalizedLine = normalizeHeading(cleanedLine);

  for (const [sectionName, headings] of Object.entries(
    SECTION_HEADINGS
  ) as [SectionName, string[]][]) {
    const matched = headings.some((heading) => {
      const normalizedHeading = normalizeHeading(heading);

      return (
        normalizedLine === normalizedHeading ||
        normalizedLine.startsWith(`${normalizedHeading} `)
      );
    });

    if (matched) {
      return sectionName;
    }
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getInlineSection(
  line: string
): { section: SectionName; content: string } | null {
  const normalizedLine = removeBulletPrefix(line)
    .trim()
    .replace(/’/g, "'");

  for (const [sectionName, headings] of Object.entries(
    SECTION_HEADINGS
  ) as [SectionName, string[]][]) {
    const sortedHeadings = [...headings].sort(
      (first, second) => second.length - first.length
    );

    for (const heading of sortedHeadings) {
      const normalizedHeading = heading.replace(/’/g, "'");
      const escapedHeading = escapeRegExp(normalizedHeading);

      const pattern = new RegExp(
        `^${escapedHeading}\\s*[:\\-–—|]\\s*(.+)$`,
        "i"
      );

      const match = normalizedLine.match(pattern);

      if (match?.[1]?.trim()) {
        return {
          section: sectionName,
          content: match[1].trim(),
        };
      }
    }
  }

  return null;
}

function removeFooterContent(value: string): string {
  const lines = value.split("\n");

  const stopIndex = lines.findIndex((line) =>
    STOP_PATTERNS.some((pattern) => pattern.test(line.trim()))
  );

  if (stopIndex === -1) {
    return value;
  }

  return lines.slice(0, stopIndex).join("\n").trim();
}

function looksLikeRequirementLine(line: string): boolean {
  const cleaned = removeBulletPrefix(line);

  if (!cleaned) {
    return false;
  }

  return REQUIREMENT_LINE_PATTERNS.some((pattern) =>
    pattern.test(cleaned)
  );
}

function removeDuplicates(
  lines: string[],
  globalSeen: Set<string>
): string[] {
  const localSeen = new Set<string>();

  return lines.filter((line) => {
    const key = normalizeForDuplicateCheck(line);

    if (!key) {
      return false;
    }

    if (localSeen.has(key) || globalSeen.has(key)) {
      return false;
    }

    localSeen.add(key);
    globalSeen.add(key);
    return true;
  });
}

function formatBulletSection(lines: string[]): string {
  return lines
    .map(removeBulletPrefix)
    .filter(Boolean)
    .map((line) => `• ${line}`)
    .join("\n");
}

function formatDescription(lines: string[]): string {
  const text = lines
    .map(removeBulletPrefix)
    .filter(Boolean)
    .join("\n");

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.slice(0, 3).join("\n\n");
}

export function parseJobSections(
  rawContent?: string
): ParsedJobSections {
  const normalized = normalizeText(rawContent || "");
  const cleanedContent = removeFooterContent(normalized);

  const lines = cleanedContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: Record<SectionName, string[]> = {
    description: [],
    responsibilities: [],
    requirements: [],
    benefits: [],
    selectionProcess: [],
  };

  let activeSection: SectionName | null = null;
  const contentBeforeFirstHeading: string[] = [];

  for (const line of lines) {
    const inlineSection = getInlineSection(line);

    if (inlineSection) {
      activeSection = inlineSection.section;
      sections[activeSection].push(inlineSection.content);
      continue;
    }

    const detectedSection = getSectionName(line);

    if (detectedSection) {
      activeSection = detectedSection;
      continue;
    }

    if (
      activeSection === "responsibilities" &&
      looksLikeRequirementLine(line)
    ) {
      activeSection = "requirements";
    }

    if (activeSection) {
      sections[activeSection].push(line);
    } else {
      contentBeforeFirstHeading.push(line);
    }
  }

  if (sections.description.length === 0) {
    sections.description.push(...contentBeforeFirstHeading);
  } else if (contentBeforeFirstHeading.length > 0) {
    sections.description.unshift(...contentBeforeFirstHeading);
  }

  const globalSeen = new Set<string>();

  const descriptionLines = removeDuplicates(
    sections.description,
    globalSeen
  );

  const responsibilityLines = removeDuplicates(
    sections.responsibilities,
    globalSeen
  );

  const requirementLines = removeDuplicates(
    sections.requirements,
    globalSeen
  );

  const benefitLines = removeDuplicates(
    sections.benefits,
    globalSeen
  );

  const selectionLines = removeDuplicates(
    sections.selectionProcess,
    globalSeen
  );

  return {
    description: formatDescription(descriptionLines),
    responsibilities: formatBulletSection(
      responsibilityLines
    ),
    requirements: formatBulletSection(
      requirementLines
    ),
    benefits: formatBulletSection(benefitLines),
    selectionProcess: formatBulletSection(
      selectionLines
    ),
  };
}