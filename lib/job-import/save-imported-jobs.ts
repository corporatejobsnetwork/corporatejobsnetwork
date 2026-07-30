import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebase";
import type {
  ImportSaveResult,
  NormalizedImportedJob,
} from "./types";

const IMPORTED_JOBS_COLLECTION = "importedJobs";
const FIRESTORE_BATCH_LIMIT = 400;

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toFirestoreImportedJob(
  job: NormalizedImportedJob
) {
  return {
    ...job,

    company: normalizeString(job.company),
    role: normalizeString(job.role),
    location: normalizeString(job.location),
    country: normalizeString(job.country),

    description: normalizeString(job.description),
    responsibilities: normalizeString(
      job.responsibilities
    ),
    eligibility: normalizeString(job.eligibility),
    benefits: normalizeString(job.benefits),
    selectionProcess: normalizeString(
      job.selectionProcess
    ),

    experience: normalizeString(job.experience),
    education: normalizeString(job.education),
    salary: normalizeString(job.salary),

    applyLink: normalizeString(job.applyLink),
    sourceUrl: normalizeString(job.sourceUrl),

    skills: Array.isArray(job.skills)
      ? job.skills.filter(Boolean)
      : [],

    requiredSkills: Array.isArray(
      job.requiredSkills
    )
      ? job.requiredSkills.filter(Boolean)
      : [],

    importedAutomatically: true,
    status: job.status || "draft",
    reviewStatus: job.reviewStatus || "pending",
    isActive: true,

    updatedAt: serverTimestamp(),
  };
}

async function findExistingImportedJobId(
  uniqueKey: string
): Promise<string | null> {
  const importedJobsRef = collection(
    db,
    IMPORTED_JOBS_COLLECTION
  );

  const existingQuery = query(
    importedJobsRef,
    where("uniqueKey", "==", uniqueKey),
    limit(1)
  );

  const snapshot = await getDocs(existingQuery);

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].id;
}

async function flushBatch(
  batchItems: Array<{
    job: NormalizedImportedJob;
    documentId: string;
    exists: boolean;
  }>
): Promise<{
  created: number;
  updated: number;
}> {
  if (batchItems.length === 0) {
    return {
      created: 0,
      updated: 0,
    };
  }

  const batch = writeBatch(db);

  for (const item of batchItems) {
    const importedJobRef = doc(
      db,
      IMPORTED_JOBS_COLLECTION,
      item.documentId
    );

    const payload = toFirestoreImportedJob(
      item.job
    );

    if (item.exists) {
      batch.set(
        importedJobRef,
        {
          ...payload,
          importedAt: serverTimestamp(),
        },
        {
          merge: true,
        }
      );
    } else {
      batch.set(importedJobRef, {
        ...payload,
        createdAt: serverTimestamp(),
        importedAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();

  return {
    created: batchItems.filter(
      (item) => !item.exists
    ).length,
    updated: batchItems.filter(
      (item) => item.exists
    ).length,
  };
}

export async function saveImportedJobs(
  jobs: NormalizedImportedJob[]
): Promise<ImportSaveResult> {
  const result: ImportSaveResult = {
    created: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    duplicates: 0,
    errors: [],
  };

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return result;
  }

  const seenUniqueKeys = new Set<string>();

  let pendingBatch: Array<{
    job: NormalizedImportedJob;
    documentId: string;
    exists: boolean;
  }> = [];

  const flushPendingBatch = async () => {
    const batchResult = await flushBatch(
      pendingBatch
    );

    result.created += batchResult.created;
    result.updated += batchResult.updated;

    pendingBatch = [];
  };

  for (const job of jobs) {
    try {
      const uniqueKey = normalizeString(
        job.uniqueKey
      );

      if (!uniqueKey) {
        result.failed += 1;

        result.errors.push(
          `${job.company || "Unknown company"}: missing uniqueKey.`
        );

        continue;
      }

      if (seenUniqueKeys.has(uniqueKey)) {
        result.skipped += 1;
        result.duplicates += 1;
        continue;
      }

      seenUniqueKeys.add(uniqueKey);

      const existingJobId =
        await findExistingImportedJobId(uniqueKey);

      const documentId =
        existingJobId ||
        doc(
          collection(
            db,
            IMPORTED_JOBS_COLLECTION
          )
        ).id;

      pendingBatch.push({
        job,
        documentId,
        exists: Boolean(existingJobId),
      });

      if (
        pendingBatch.length >=
        FIRESTORE_BATCH_LIMIT
      ) {
        await flushPendingBatch();
      }
    } catch (error) {
      result.failed += 1;

      result.errors.push(
        error instanceof Error
          ? `${job.company}: ${error.message}`
          : `${job.company}: unknown Firestore save error.`
      );
    }
  }

  if (pendingBatch.length > 0) {
    try {
      await flushPendingBatch();
    } catch (error) {
      result.failed += pendingBatch.length;

      result.errors.push(
        error instanceof Error
          ? error.message
          : "Unknown Firestore batch save error."
      );
    }
  }

  return result;
}

export async function saveSingleImportedJob(
  job: NormalizedImportedJob
): Promise<ImportSaveResult> {
  return saveImportedJobs([job]);
}

export async function upsertImportedJobById(
  documentId: string,
  job: NormalizedImportedJob
): Promise<void> {
  const importedJobRef = doc(
    db,
    IMPORTED_JOBS_COLLECTION,
    documentId
  );

  await setDoc(
    importedJobRef,
    {
      ...toFirestoreImportedJob(job),
      importedAt: serverTimestamp(),
    },
    {
      merge: true,
    }
  );
}