import { parseJobSections } from "@/lib/job-section-parser";

type CleanedJobContent = {
  description: string;
  responsibilities: string;
  eligibility: string;
  benefits: string;
  selectionProcess: string;
};

export function cleanImportedJobContent(
  rawDescription?: string
): CleanedJobContent {
  const parsed = parseJobSections(rawDescription || "");

  return {
    description: parsed.description,
    responsibilities: parsed.responsibilities,
    eligibility: parsed.requirements,
    benefits: parsed.benefits,
    selectionProcess: parsed.selectionProcess,
  };
}