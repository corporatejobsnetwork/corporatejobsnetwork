import type { NormalizedImportedJob } from "./types";

export interface DuplicateCheckResult {
  uniqueJobs: NormalizedImportedJob[];
  duplicateJobs: NormalizedImportedJob[];
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function fingerprint(job: NormalizedImportedJob): string {
  return [
    normalize(job.company),
    normalize(job.role),
    normalize(job.location),
    normalize(job.applyLink),
  ].join("|");
}

export function detectDuplicateJobs(
  jobs: NormalizedImportedJob[]
): DuplicateCheckResult {
  const uniqueJobs: NormalizedImportedJob[] = [];
  const duplicateJobs: NormalizedImportedJob[] = [];

  const uniqueKeyMap = new Map<string, NormalizedImportedJob>();
  const fingerprintMap = new Map<string, NormalizedImportedJob>();

  for (const job of jobs) {
    const key = normalize(job.uniqueKey);

    if (key && uniqueKeyMap.has(key)) {
      const original = uniqueKeyMap.get(key)!;

      duplicateJobs.push({
        ...job,
        processingStatus: "duplicate",
        duplicateReason: "Duplicate uniqueKey",
        duplicateOfJobId: original.uniqueKey,
      });
      continue;
    }

    const fp = fingerprint(job);

    if (fingerprintMap.has(fp)) {
      const original = fingerprintMap.get(fp)!;

      duplicateJobs.push({
        ...job,
        processingStatus: "duplicate",
        duplicateReason:
          "Same company, role, location and apply link",
        duplicateOfJobId: original.uniqueKey,
      });
      continue;
    }

    uniqueKeyMap.set(key, job);
    fingerprintMap.set(fp, job);
    uniqueJobs.push(job);
  }

  return {
    uniqueJobs,
    duplicateJobs,
  };
}