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
    "the role",
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
    "professional requirements",
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

function removeBulletPrefix(value: string): string {
  return value
    .replace(/^[•●▪◦‣⁃\-–—*›»]+\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function isLikelyHeading(line: string): boolean {
  const cleaned = line.trim();

  if (!cleaned) {
    return false;
  }

  if (cleaned.length > 80) {
    return false;
  }

  if (/[.!?]$/.test(cleaned)) {
    return false;
  }

  return cleaned.split(/\s+/).length <= 10;
}

function getSectionName(line: string): SectionName | null {
  if (!isLikelyHeading(line)) {
    return null;
  }

  const normalizedLine = normalizeHeading(line);

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
  const normalizedLine = line.trim().replace(/’/g, "'");

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

function formatBulletSection(value: string): string {
  return value
    .split("\n")
    .map((line) => removeBulletPrefix(line))
    .filter(Boolean)
    .map((line) => `• ${line}`)
    .join("\n");
}

function cleanDescription(value: string): string {
  const paragraphs = value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.slice(0, 3).join("\n\n");
}

export function parseJobSections(rawContent?: string): ParsedJobSections {
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
      activeSection =
        inlineSection.section === "description"
          ? "responsibilities"
          : inlineSection.section;

      sections[activeSection].push(inlineSection.content);
      continue;
    }

    const detectedSection = getSectionName(line);

    if (detectedSection) {
      activeSection =
        detectedSection === "description" && normalizeHeading(line) === "the role"
          ? "responsibilities"
          : detectedSection;
      continue;
    }

    if (activeSection) {
      sections[activeSection].push(line);
    } else {
      contentBeforeFirstHeading.push(line);
    }
  }

  const descriptionSource =
    sections.description.length > 0
      ? sections.description.join("\n")
      : contentBeforeFirstHeading.join("\n");

  return {
    description: cleanDescription(descriptionSource),
    responsibilities: formatBulletSection(
      sections.responsibilities.join("\n")
    ),
    requirements: formatBulletSection(sections.requirements.join("\n")),
    benefits: formatBulletSection(sections.benefits.join("\n")),
    selectionProcess: formatBulletSection(
      sections.selectionProcess.join("\n")
    ),
  };
}