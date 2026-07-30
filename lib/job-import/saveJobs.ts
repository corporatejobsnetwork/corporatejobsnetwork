import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { NormalizedImportedJob } from "./types";

export interface SaveImportedJobsResult {
  totalReceived: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

function buildFirestoreData(job: NormalizedImportedJob) {
  return {
    ...job,

    // Imported jobs must be reviewed before appearing publicly.
    reviewStatus: "pending",
    status: "draft",
    isActive: true,

    updatedAt: serverTimestamp(),
  };
}

export async function saveImportedJobs(
  jobs: NormalizedImportedJob[]
): Promise<SaveImportedJobsResult> {
  const result: SaveImportedJobsResult = {
    totalReceived: jobs.length,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const job of jobs) {
    try {
      if (!job.uniqueKey.trim()) {
        throw new Error("Missing unique job key.");
      }

      const jobReference = doc(
        db,
        "importedJobs",
        job.uniqueKey
      );

      const existingJob = await getDoc(jobReference);

      if (existingJob.exists()) {
        await setDoc(
          jobReference,
          {
            ...buildFirestoreData(job),

            // Preserve the original import time.
            createdAt:
              existingJob.data().createdAt ??
              serverTimestamp(),
          },
          { merge: true }
        );

        result.updated += 1;
      } else {
        await setDoc(jobReference, {
          ...buildFirestoreData(job),
          createdAt: serverTimestamp(),
        });

        result.created += 1;
      }
    } catch (error) {
      result.failed += 1;

      const message =
        error instanceof Error
          ? error.message
          : "Unknown Firestore save error.";

      result.errors.push(
        `${job.company} — ${job.role}: ${message}`
      );
    }
  }

  return result;
}