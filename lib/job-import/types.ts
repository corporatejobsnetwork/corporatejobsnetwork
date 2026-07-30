export type JobProvider =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "smartrecruiters"
  | "successfactors"
  | "oracle"
  | "custom";

export type ImportedJobStatus =
  | "pending"
  | "published"
  | "rejected"
  | "expired"
  | "failed";

export type ImportedJobCategory =
  | "freshers"
  | "experienced"
  | "freshers-experienced"
  | "internship"
  | "work-from-home"
  | "walk-in-drive"
  | "government"
  | "other";

export type ImportedJobDocumentStatus =
  | "draft"
  | "published"
  | "expired";

export type ImportProcessingStatus =
  | "waiting"
  | "processing"
  | "completed"
  | "failed"
  | "duplicate";

interface BaseTrustedCompany {
  name: string;
  slug: string;
  provider: JobProvider;

  enabled: boolean;
  trusted: boolean;

  logo?: string;
  careersUrl?: string;
  apiUrl?: string;
  parserId?: string;

  country?: string;
  defaultLocation?: string;
}

export interface GreenhouseCompany extends BaseTrustedCompany {
  provider: "greenhouse";
  boardId: string;
}

export interface LeverCompany extends BaseTrustedCompany {
  provider: "lever";
  boardId: string;
}

export interface AshbyCompany extends BaseTrustedCompany {
  provider: "ashby";
  boardId: string;
}

export interface WorkdayCompany extends BaseTrustedCompany {
  provider: "workday";

  tenant: string;
  siteId: string;
  workdayHost: string;

  locale?: string;
  boardId?: string;
}

export interface SmartRecruitersCompany extends BaseTrustedCompany {
  provider: "smartrecruiters";
  boardId: string;
}

export interface SuccessFactorsCompany extends BaseTrustedCompany {
  provider: "successfactors";

  careersUrl: string;

  tenant?: string;
  siteId?: string;
  boardId?: string;
}

export interface OracleCompany extends BaseTrustedCompany {
  provider: "oracle";

  careersUrl: string;

  siteNumber?: string;
  boardId?: string;
}

export interface CustomCompany extends BaseTrustedCompany {
  provider: "custom";

  careersUrl: string;

  boardId?: string;
}

export type TrustedCompany =
  | GreenhouseCompany
  | LeverCompany
  | AshbyCompany
  | WorkdayCompany
  | SmartRecruitersCompany
  | SuccessFactorsCompany
  | OracleCompany
  | CustomCompany;

export interface NormalizedImportedJob {
  uniqueKey: string;

  source: JobProvider;
  sourceJobId: string;
  sourceCompanyId: string;
  sourceUrl: string;

  company: string;
  companySlug: string;
  companyLogo: string;

  role: string;
  location: string;
  country: string;

  description: string;
  responsibilities: string;
  eligibility: string;
  benefits: string;
  selectionProcess: string;

  experience: string;
  education: string;
  salary: string;

  skills: string[];
  requiredSkills: string[];

  jobType: string;
  category: ImportedJobCategory;

  applyLink: string;

  workMode?: string;
  employmentType?: string;
  lastDate?: string;

  importedAutomatically: true;
  trustedCompany: boolean;

  reviewStatus: ImportedJobStatus;
  processingStatus?: ImportProcessingStatus;

  status: ImportedJobDocumentStatus;
  isActive: boolean;

  sourceCreatedAt: string | null;
  sourceUpdatedAt: string | null;

  fetchedAt: string;

  importError?: string;
  duplicateOfJobId?: string;
  duplicateReason?: string;
}

export interface ImportSaveResult {
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  duplicates: number;
  errors: string[];
}

export interface CompanyImportResult {
  company: string;
  provider: JobProvider;

  fetched: number;
  indiaJobs: number;

  created: number;
  updated: number;
  failed: number;
  skipped: number;
  duplicates: number;

  error?: string;
}