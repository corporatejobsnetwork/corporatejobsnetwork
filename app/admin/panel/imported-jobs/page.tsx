"use client";

import Link from "next/link";

import ImportedJobsTable from "@/components/admin/ImportedJobsTable";

export default function ImportedJobsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Imported Jobs</h1>

            <p className="mt-2 text-gray-600">
              Search, review and publish automatically imported jobs.
            </p>
          </div>

          <Link
            href="/admin/panel/dashboard"
            className="inline-flex w-fit rounded-lg bg-black px-4 py-2 font-semibold text-white transition hover:bg-gray-800"
          >
            Back
          </Link>
        </div>

        <ImportedJobsTable />
      </div>
    </div>
  );
}