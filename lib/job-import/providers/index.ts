import { fetchAshbyJobs } from "./ashby";
import { fetchCustomJobs } from "./custom";
import { fetchGreenhouseJobs } from "./greenhouse";
import { fetchLeverJobs } from "./lever";
import { fetchOracleJobs } from "./oracle";
import { fetchSmartRecruitersJobs } from "./smartrecruiters";
import { fetchSuccessFactorsJobs } from "./successfactors";
import { fetchWorkdayJobs } from "./workday";

import type {
  AshbyCompany,
  CustomCompany,
  GreenhouseCompany,
  LeverCompany,
  NormalizedImportedJob,
  OracleCompany,
  SmartRecruitersCompany,
  SuccessFactorsCompany,
  TrustedCompany,
  WorkdayCompany,
} from "../types";

export async function fetchJobsForCompany(
  company: TrustedCompany
): Promise<NormalizedImportedJob[]> {
  if (!company.enabled) {
    return [];
  }

  if (!company.trusted) {
    throw new Error(
      `${company.name} is not marked as a trusted company.`
    );
  }

  switch (company.provider) {
    case "greenhouse":
      return fetchGreenhouseJobs(
        company as GreenhouseCompany
      );

    case "lever":
      return fetchLeverJobs(
        company as LeverCompany
      );

    case "ashby":
      return fetchAshbyJobs(
        company as AshbyCompany
      );

    case "workday":
      return fetchWorkdayJobs(
        company as WorkdayCompany
      );

    case "smartrecruiters":
      return fetchSmartRecruitersJobs(
        company as SmartRecruitersCompany
      );

    case "successfactors":
      return fetchSuccessFactorsJobs(
        company as SuccessFactorsCompany
      );

    case "oracle":
      return fetchOracleJobs(
        company as OracleCompany
      );

    case "custom":
      return fetchCustomJobs(
        company as CustomCompany
      );

    default: {
      const unsupportedCompany: never = company;

      throw new Error(
        `Unsupported provider configuration: ${JSON.stringify(
          unsupportedCompany
        )}`
      );
    }
  }
}

export async function fetchJobsForCompanies(
  companies: TrustedCompany[]
): Promise<
  Array<{
    company: TrustedCompany;
    jobs: NormalizedImportedJob[];
    error: string | null;
  }>
> {
  const results: Array<{
    company: TrustedCompany;
    jobs: NormalizedImportedJob[];
    error: string | null;
  }> = [];

  for (const company of companies) {
    try {
      const jobs = await fetchJobsForCompany(company);

      results.push({
        company,
        jobs,
        error: null,
      });
    } catch (error) {
      results.push({
        company,
        jobs: [],
        error:
          error instanceof Error
            ? error.message
            : "Unknown provider import error.",
      });
    }
  }

  return results;
}

export {
  fetchAshbyJobs,
  fetchCustomJobs,
  fetchGreenhouseJobs,
  fetchLeverJobs,
  fetchOracleJobs,
  fetchSmartRecruitersJobs,
  fetchSuccessFactorsJobs,
  fetchWorkdayJobs,
};