import {
  collection,
  getDocs,
  limit,
  query,
  where,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";

export type DuplicateCheckJob = {
  id?: string;
  company?: string;
  role?: string;
  location?: string;
  applyLink?: string;
  sourceJobId?: string;
};

export type DuplicateJobResult = {
  isDuplicate: boolean;
  existingJobId: string;
  existingStatus: string;
  reason: string;
  existingJob: ExistingJobData | null;
};

export type ExistingJobData = {
  id: string;
  company: string;
  role: string;
  location: string;
  applyLink: string;
  sourceJobId: string;
  status: string;
  createdAt?: Timestamp | null;
  publishedAt?: Timestamp | null;
};

type FirestoreJobData = {
  company?: unknown;
  role?: unknown;
  location?: unknown;
  applyLink?: unknown;
  sourceJobId?: unknown;
  status?: unknown;
  createdAt?: Timestamp | null;
  publishedAt?: Timestamp | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value?: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLocation(value?: string): string {
  return normalizeText(value)
    .replace(/\bbengaluru\b/g, "bangalore")
    .replace(/\bgurugram\b/g, "gurgaon")
    .replace(/\bmumbai metropolitan region\b/g, "mumbai")
    .trim();
}

function normalizeUrl(value?: string): string {
  if (!value?.trim()) {
    return "";
  }

  try {
    const url = new URL(value.trim());

    url.hash = "";

    const removableParameters = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "source",
      "ref",
      "referrer",
      "trackingId",
      "trk",
    ];

    removableParameters.forEach((parameter) => {
      url.searchParams.delete(parameter);
    });

    url.hostname = url.hostname.toLowerCase();

    let normalized = url.toString();

    normalized = normalized
      .replace(/\/$/, "")
      .replace(/\?$/, "")
      .toLowerCase();

    return normalized;
  } catch {
    return value
      .trim()
      .toLowerCase()
      .replace(/[?#].*$/, "")
      .replace(/\/$/, "");
  }
}

function createExistingJob(
  id: string,
  data: FirestoreJobData
): ExistingJobData {
  return {
    id,
    company: asString(data.company),
    role: asString(data.role),
    location: asString(data.location),
    applyLink: asString(data.applyLink),
    sourceJobId: asString(data.sourceJobId),
    status: asString(data.status) || "unknown",
    createdAt: data.createdAt || null,
    publishedAt: data.publishedAt || null,
  };
}

function duplicateResult(
  existingJob: ExistingJobData,
  reason: string
): DuplicateJobResult {
  return {
    isDuplicate: true,
    existingJobId: existingJob.id,
    existingStatus: existingJob.status,
    reason,
    existingJob,
  };
}

function noDuplicateResult(): DuplicateJobResult {
  return {
    isDuplicate: false,
    existingJobId: "",
    existingStatus: "",
    reason: "",
    existingJob: null,
  };
}

function isSameJobId(
  existingJobId: string,
  excludedJobId?: string
): boolean {
  return Boolean(excludedJobId && existingJobId === excludedJobId);
}

async function findExactFieldDuplicate(
  db: Firestore,
  field: "applyLink" | "sourceJobId",
  value: string,
  excludedJobId?: string
): Promise<ExistingJobData | null> {
  if (!value) {
    return null;
  }

  const jobsQuery = query(
    collection(db, "jobs"),
    where(field, "==", value),
    limit(5)
  );

  const snapshot = await getDocs(jobsQuery);

  for (const documentSnapshot of snapshot.docs) {
    if (isSameJobId(documentSnapshot.id, excludedJobId)) {
      continue;
    }

    return createExistingJob(
      documentSnapshot.id,
      documentSnapshot.data() as FirestoreJobData
    );
  }

  return null;
}

export async function detectDuplicateJob(
  db: Firestore,
  job: DuplicateCheckJob
): Promise<DuplicateJobResult> {
  const excludedJobId = job.id?.trim();

  const company = normalizeText(job.company);
  const role = normalizeText(job.role);
  const location = normalizeLocation(job.location);
  const applyLink = normalizeUrl(job.applyLink);
  const sourceJobId = normalizeText(job.sourceJobId);

  /*
   * 1. Apply Link — highest priority.
   *
   * First try the exact Firestore value because existing documents may not
   * contain a separately normalized URL.
   */
  if (job.applyLink?.trim()) {
    const exactApplyLinkDuplicate = await findExactFieldDuplicate(
      db,
      "applyLink",
      job.applyLink.trim(),
      excludedJobId
    );

    if (exactApplyLinkDuplicate) {
      return duplicateResult(
        exactApplyLinkDuplicate,
        "Same application link"
      );
    }
  }

  /*
   * 2. Source Job ID.
   */
  if (job.sourceJobId?.trim()) {
    const exactSourceIdDuplicate = await findExactFieldDuplicate(
      db,
      "sourceJobId",
      job.sourceJobId.trim(),
      excludedJobId
    );

    if (exactSourceIdDuplicate) {
      return duplicateResult(
        exactSourceIdDuplicate,
        "Same source job ID"
      );
    }
  }

  /*
   * Fallback scan:
   * This checks normalized URLs and company/role/location combinations.
   *
   * For a very large jobs collection, normalized fields should later be
   * stored directly in Firestore and queried with indexes.
   */
  const jobsSnapshot = await getDocs(collection(db, "jobs"));

  let companyRoleFallback: ExistingJobData | null = null;

  for (const documentSnapshot of jobsSnapshot.docs) {
    if (isSameJobId(documentSnapshot.id, excludedJobId)) {
      continue;
    }

    const existingJob = createExistingJob(
      documentSnapshot.id,
      documentSnapshot.data() as FirestoreJobData
    );

    const existingCompany = normalizeText(existingJob.company);
    const existingRole = normalizeText(existingJob.role);
    const existingLocation = normalizeLocation(existingJob.location);
    const existingApplyLink = normalizeUrl(existingJob.applyLink);
    const existingSourceJobId = normalizeText(existingJob.sourceJobId);

    /*
     * Normalized application-link comparison.
     * This catches tracking parameter differences.
     */
    if (
      applyLink &&
      existingApplyLink &&
      applyLink === existingApplyLink
    ) {
      return duplicateResult(
        existingJob,
        "Same application link"
      );
    }

    /*
     * Normalized source-job-ID comparison.
     */
    if (
      sourceJobId &&
      existingSourceJobId &&
      sourceJobId === existingSourceJobId
    ) {
      return duplicateResult(
        existingJob,
        "Same source job ID"
      );
    }

    /*
     * Company + Role + Location.
     */
    if (
      company &&
      role &&
      location &&
      company === existingCompany &&
      role === existingRole &&
      location === existingLocation
    ) {
      return duplicateResult(
        existingJob,
        "Same company, role and location"
      );
    }

    /*
     * Company + Role fallback.
     *
     * We save this match but continue checking because a more accurate
     * company + role + location match may appear later.
     */
    if (
      !companyRoleFallback &&
      company &&
      role &&
      company === existingCompany &&
      role === existingRole
    ) {
      companyRoleFallback = existingJob;
    }
  }

  if (companyRoleFallback) {
    return duplicateResult(
      companyRoleFallback,
      "Same company and role"
    );
  }

  return noDuplicateResult();
}