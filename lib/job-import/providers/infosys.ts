import {
  determineJobCategory,
} from "../filters";

import {
  cleanImportedJobContent,
  looksLikeNonJobPage,
} from "@/lib/job-content-cleaner";

import type {
  CustomCompany,
  NormalizedImportedJob,
} from "../types";

const INFOSYS_JOBS_API =
  "https://intapgateway.infosysapps.com/careersci/search/intapjbsrch/getCareerSearchJobs?sourceId=1,21&searchText=ALL";

interface InfosysApiJob {
  postingTitle?: string;
  createdOn?: string;
  roleDesignation?: string;
  unit?: string;
  location?: string;
  skills?: string | null;
  postingDescription?: string;
  technicalRequirement?: string;
  additionalResponsibility?: string;
  postingId?: number | string;
  requisitionId?: number | string;
  referenceCode?: string;
  sourceId?: number | string;
  minExperienceLevel?: number | string;
  maxExperienceLevel?: number | string;
  rolesResponsibilities?: string;
  company?: string;
  country?: string;
  preferredSkills?: string;
  genericSkills?: string;
  educationalRequirement?: string;
  expiryDate?: string;
  publicationId?: number | string;
  hotjob?: string;
  companyHiringTypeId?: number | string;
  functionalArea?: string;
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/â¢/g, "•")
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/â€“|â€”/g, "-")
    .replace(/Â/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toIsoDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString();
}

function isActiveInfosysJob(
  job: InfosysApiJob
): boolean {
  if (!job.expiryDate) {
    return true;
  }

  const expiryDate = new Date(
    job.expiryDate
  );

  if (Number.isNaN(expiryDate.getTime())) {
    return true;
  }

  return expiryDate.getTime() >= Date.now();
}

function parseSkills(
  job: InfosysApiJob
): string[] {
  const values = [
    job.skills || "",
    job.preferredSkills || "",
    job.genericSkills || "",
  ]
    .join("\n")
    .split(/->|,|;|\n|\|/)
    .map((value) => cleanText(value))
    .filter(
      (value) =>
        value.length >= 2 &&
        value.length <= 80
    );

  return Array.from(
    new Set(values)
  ).slice(0, 15);
}

function formatExperience(
  job: InfosysApiJob
): string {
  const min = Number(
    job.minExperienceLevel
  );
  const max = Number(
    job.maxExperienceLevel
  );

  if (
    Number.isFinite(min) &&
    Number.isFinite(max)
  ) {
    return min === max
      ? `${min} years`
      : `${min}-${max} years`;
  }

  if (Number.isFinite(min)) {
    return `${min}+ years`;
  }

  return "Not Mentioned";
}

function buildApplyLink(
  job: InfosysApiJob
): string {
  const referenceCode =
    cleanText(job.referenceCode) ||
    String(
      job.requisitionId ||
        job.postingId ||
        ""
    );

  const sourceId = String(
    job.sourceId || "1"
  );

  const params = new URLSearchParams({
    jobReferenceCode: referenceCode,
    sourceId,
  });

  return (
    "https://career.infosys.com/jobdesc?" +
    params.toString()
  );
}

function normalizeInfosysJob(
  company: CustomCompany,
  job: InfosysApiJob
): NormalizedImportedJob | null {
  const sourceJobId =
    cleanText(job.referenceCode) ||
    String(
      job.requisitionId ||
        job.postingId ||
        job.publicationId ||
        ""
    );

  const role = cleanText(
    job.postingTitle
  );

  if (!sourceJobId || !role) {
    return null;
  }

  const rawDescription = cleanText(
    job.postingDescription
  );

  const rawResponsibilities =
    cleanText(
      job.rolesResponsibilities
    );

  const rawEligibility = cleanText(
    job.technicalRequirement
  );

  const cleaned =
    cleanImportedJobContent(
      [
        rawDescription,
        rawResponsibilities,
        rawEligibility,
        cleanText(
          job.additionalResponsibility
        ),
      ]
        .filter(Boolean)
        .join("\n\n")
    );

  const description =
    cleaned.description ||
    rawDescription;

  const responsibilities =
    cleaned.responsibilities ||
    rawResponsibilities;

  const eligibility =
    cleaned.eligibility ||
    rawEligibility;

  const benefits =
    cleaned.benefits || "";

  const selectionProcess =
    cleaned.selectionProcess || "";

  const completeText = [
    description,
    responsibilities,
    eligibility,
    benefits,
    selectionProcess,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (
    looksLikeNonJobPage(
      role,
      completeText
    )
  ) {
    return null;
  }

  const location =
    cleanText(job.location) ||
    company.defaultLocation ||
    "India";

  const country =
    cleanText(job.country) ||
    "India";

  const skills = parseSkills(job);
  const applyLink =
    buildApplyLink(job);

  return {
    uniqueKey:
      `custom_${company.slug}_${sourceJobId}`,

    source: "custom",
    sourceJobId,
    sourceCompanyId:
      company.boardId?.trim() ||
      company.slug,
    sourceUrl: applyLink,

    company:
      cleanText(job.company) ||
      company.name,
    companySlug: company.slug,
    companyLogo:
      company.logo || "",

    role,
    location,
    country,

    description,
    responsibilities,
    eligibility,
    benefits,
    selectionProcess,

    experience:
      formatExperience(job),

    education:
      cleanText(
        job.educationalRequirement
      ) || "Not Mentioned",

    salary:
      "Salary Not Disclosed",

    skills,
    requiredSkills: skills,

    jobType: "Private Job",

    category:
      determineJobCategory(
        role,
        completeText,
        location
      ),

    applyLink,

    workMode:
      /\bremote\b|\bwork from home\b|\bwfh\b/i.test(
        completeText
      )
        ? "Remote"
        : /\bhybrid\b/i.test(
              completeText
            )
          ? "Hybrid"
          : "On-site",

    employmentType:
      "Full-time",

    lastDate:
      cleanText(job.expiryDate),

    importedAutomatically: true,
    trustedCompany:
      company.trusted,

    reviewStatus: "pending",
    processingStatus:
      "completed",

    status: "draft",
    isActive: true,

    sourceCreatedAt:
      toIsoDate(job.createdOn),

    sourceUpdatedAt: null,

    fetchedAt:
      new Date().toISOString(),
  };
}

export async function fetchInfosysJobs(
  company: CustomCompany
): Promise<NormalizedImportedJob[]> {
  const response = await fetch(
    INFOSYS_JOBS_API,
    {
      method: "GET",
      headers: {
        Accept:
          "application/json",
        "Accept-Language":
          "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (compatible; CorporateJobsNetwork/1.0)",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Unable to fetch Infosys jobs: ${response.status}`
    );
  }

  const payload: unknown =
    await response.json();

  if (!Array.isArray(payload)) {
    throw new Error(
      "Infosys jobs API returned an unexpected response."
    );
  }

  console.log(
    `Infosys API returned ${payload.length} raw jobs.`
  );

  const jobs:
    NormalizedImportedJob[] = [];

  const seen = new Set<string>();

  for (
    const item of payload as InfosysApiJob[]
  ) {
    if (
      !isActiveInfosysJob(item)
    ) {
      continue;
    }

    const normalized =
      normalizeInfosysJob(
        company,
        item
      );

    if (
      !normalized ||
      seen.has(
        normalized.uniqueKey
      )
    ) {
      continue;
    }

    seen.add(
      normalized.uniqueKey
    );

    jobs.push(normalized);
  }

  console.log(
    `Infosys provider normalized ${jobs.length} active jobs.`
  );

  return jobs;
}