import { shouldImportJob } from "./filters";
import { fetchJobsForCompanies } from "./providers";
import { getEnabledTrustedCompanies } from "./trusted-companies";

import type {
  CompanyImportResult,
  NormalizedImportedJob,
} from "./types";

export interface ImportServiceResult {
  results: CompanyImportResult[];
  jobs: NormalizedImportedJob[];
  totalFetched: number;
}

function isIndiaJobRecord(
  job: NormalizedImportedJob
): boolean {
  const country = (job.country || "")
    .trim()
    .toLowerCase();

  const location = (job.location || "")
    .trim()
    .toLowerCase();

  return (
    country === "india" ||
    location.includes("india") ||
    location.includes("bengaluru") ||
    location.includes("bangalore") ||
    location.includes("hyderabad") ||
    location.includes("pune") ||
    location.includes("chennai") ||
    location.includes("mumbai") ||
    location.includes("noida") ||
    location.includes("gurugram") ||
    location.includes("gurgaon") ||
    location.includes("delhi") ||
    location.includes("kolkata") ||
    location.includes("mysuru") ||
    location.includes("mysore") ||
    location.includes("kochi") ||
    location.includes("cochin") ||
    location.includes("ahmedabad") ||
    location.includes("jaipur") ||
    location.includes("bhubaneswar") ||
    location.includes("trivandrum") ||
    location.includes("thiruvananthapuram") ||
    location.includes("mangaluru") ||
    location.includes("mangalore") ||
    location.includes("hubballi") ||
    location.includes("hubli")
  );
}

function isLastSevenDaysJob(
  job: NormalizedImportedJob
): boolean {
  if (!job.sourceCreatedAt) {
    return false;
  }

  const postedDate = new Date(
    job.sourceCreatedAt
  );

  if (Number.isNaN(postedDate.getTime())) {
    return false;
  }

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(
    sevenDaysAgo.getDate() - 7
  );
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return (
    postedDate >= sevenDaysAgo &&
    postedDate <= todayEnd
  );
}

export async function runImportService(): Promise<ImportServiceResult> {
  const companies =
    getEnabledTrustedCompanies();

  const providerResults =
    await fetchJobsForCompanies(
      companies
    );

  const jobs: NormalizedImportedJob[] = [];
  const results: CompanyImportResult[] = [];

  let totalFetched = 0;

  for (const result of providerResults) {
    const fetchedJobs = Array.isArray(
      result.jobs
    )
      ? result.jobs
      : [];

    totalFetched += fetchedJobs.length;

    const isInfosys =
      result.company.provider === "custom" &&
      result.company.slug === "infosys";

    const indiaJobs = isInfosys
      ? fetchedJobs.filter(
          isIndiaJobRecord
        )
      : [];

    const acceptedJobs = isInfosys
      ? indiaJobs.filter(
          (job) =>
            shouldImportJob(job) &&
            isLastSevenDaysJob(job)
        )
      : fetchedJobs.filter(
          (job) =>
            shouldImportJob(job)
        );

    jobs.push(...acceptedJobs);

    const skipped =
      fetchedJobs.length -
      acceptedJobs.length;

    results.push({
      company: result.company.name,
      provider:
        result.company.provider,

      fetched:
        fetchedJobs.length,

      indiaJobs:
        isInfosys
          ? indiaJobs.length
          : 0,

      created: 0,
      updated: 0,

      failed: result.error
        ? fetchedJobs.length
        : 0,

      skipped,
      duplicates: 0,

      error:
        result.error ?? undefined,
    });
  }

  return {
    results,
    jobs,
    totalFetched,
  };
}