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

export async function runImportService(): Promise<ImportServiceResult> {
  const companies = getEnabledTrustedCompanies();

  const providerResults =
    await fetchJobsForCompanies(companies);

  const jobs: NormalizedImportedJob[] = [];
  const results: CompanyImportResult[] = [];

  for (const result of providerResults) {
    jobs.push(...result.jobs);

    const indiaJobs = result.jobs.filter(
      (job) =>
        (job.country || "")
          .trim()
          .toLowerCase() === "india"
    ).length;

    results.push({
      company: result.company.name,
      provider: result.company.provider,

      fetched: result.jobs.length,
      indiaJobs,

      created: 0,
      updated: 0,
      failed: result.error
        ? result.jobs.length
        : 0,

      skipped: 0,
      duplicates: 0,

      error: result.error ?? undefined,
    });
  }

  return {
    results,
    jobs,
    totalFetched: jobs.length,
  };
}