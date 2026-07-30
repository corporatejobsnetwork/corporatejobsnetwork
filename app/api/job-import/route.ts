import { NextResponse } from "next/server";

import { runImportService } from "@/lib/job-import/import-service";
import { detectDuplicateJobs } from "@/lib/job-import/job-duplicate-detector";
import { saveImportedJobs } from "@/lib/job-import/save-imported-jobs";

export const dynamic = "force-dynamic";

async function executeImport() {
  try {
    const importResult = await runImportService();

    const { uniqueJobs, duplicateJobs } =
      detectDuplicateJobs(importResult.jobs);

    const saveResult = await saveImportedJobs(
      uniqueJobs
    );

    return NextResponse.json({
      success: true,
      companies: importResult.results,
      fetched: importResult.totalFetched,
      unique: uniqueJobs.length,
      duplicates: duplicateJobs.length,
      save: saveResult,
    });
  } catch (error) {
    console.error("Job import failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown import error",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return executeImport();
}

export async function POST() {
  return executeImport();
}