"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  Building2,
  Eye,
  Loader2,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase";
import { detectDuplicateJob } from "@/lib/job-duplicate-detector";
import { getCompanyLogo } from "@/lib/company-logo";

type ImportedJob = {
  id: string;
  company?: string;
  role?: string;
  location?: string;
  experience?: string;
  education?: string;
  salary?: string;
  skills?: string[];
  requiredSkills?: string[];
  eligibility?: string;
  responsibilities?: string;
  benefits?: string;
  selectionProcess?: string;
  description?: string;
  applyLink?: string;
  logo?: string;
  companyLogo?: string;
  category?: string;
  jobType?: string;
  applicationMode?:
    | string
    | {
        directApply?: boolean;
        referral?: boolean;
      };
  workMode?: string;
  employmentType?: string;
  lastDate?: string;
  source?: string;
  sourceUrl?: string;
  sourceJobId?: string;
  sourceCompanyId?: string;
  uniqueKey?: string;
  status?: string;
  reviewStatus?: string;
  createdAt?: Timestamp;
};

type PublishSummary = {
  published: number;
  duplicates: number;
  failed: number;
};


const BULK_OPERATION_JOB_LIMIT = 200;

function normalizeValue(value = ""): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeJobType(value?: string): string {
  const normalized = normalizeValue(value || "");

  if (
    normalized.includes("government") ||
    normalized.startsWith("govt")
  ) {
    return "government";
  }

  return "private";
}

function normalizeCategory(value?: string): string {
  const normalized = normalizeValue(value || "");

  if (
    ["fresher", "freshers"].includes(normalized)
  ) {
    return "freshers";
  }

  if (
    [
      "freshers-experienced",
      "fresher-experienced",
      "both",
    ].includes(normalized)
  ) {
    return "freshers-experienced";
  }

  if (
    ["work-from-home", "wfh", "remote"].includes(
      normalized
    )
  ) {
    return "work-from-home";
  }

  if (
    ["intern", "internship", "internships"].includes(
      normalized
    )
  ) {
    return "internship";
  }

  if (
    [
      "walk-in",
      "walkin",
      "walk-in-drive",
      "walk-in-drives",
      "walkin-drive",
      "walkin-drives",
    ].includes(normalized)
  ) {
    return "walk-in";
  }

  return "experienced";
}

function normalizeApplicationMode(
  value: ImportedJob["applicationMode"],
  applyLink?: string
): {
  directApply: boolean;
  referral: boolean;
} {
  if (
    value &&
    typeof value === "object"
  ) {
    return {
      directApply:
        typeof value.directApply === "boolean"
          ? value.directApply
          : Boolean(applyLink),
      referral:
        typeof value.referral === "boolean"
          ? value.referral
          : false,
    };
  }

  const normalized = normalizeValue(
    typeof value === "string" ? value : ""
  );

  if (
    ["both", "direct-referral", "direct-and-referral"].includes(
      normalized
    )
  ) {
    return {
      directApply: Boolean(applyLink),
      referral: true,
    };
  }

  if (
    ["referral", "request-referral"].includes(normalized)
  ) {
    return {
      directApply: false,
      referral: true,
    };
  }

  return {
    directApply: Boolean(applyLink),
    referral: false,
  };
}

function uniqueStringArray(
  ...groups: Array<string[] | undefined>
): string[] {
  const seen = new Set<string>();

  return groups
    .flatMap((group) => group || [])
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLowerCase();

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export default function ImportedJobsTable() {
  const [jobs, setJobs] = useState<ImportedJob[]>([]);
  const [loading, setLoading] = useState(true);

  const [publishingJobId, setPublishingJobId] =
    useState<string | null>(null);

  const [publishingAll, setPublishingAll] =
    useState(false);

  const [publishingSelected, setPublishingSelected] =
    useState(false);

  const [selectedJobIds, setSelectedJobIds] =
    useState<Set<string>>(new Set());

  const [deletingAll, setDeletingAll] =
    useState(false);

  const [publishProgress, setPublishProgress] =
    useState({
      completed: 0,
      total: 0,
    });

  const [deleteProgress, setDeleteProgress] =
    useState({
      completed: 0,
      total: 0,
    });

  const [publishSummary, setPublishSummary] =
    useState<PublishSummary | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const bulkOperationRunning =
    publishingAll ||
    publishingSelected ||
    deletingAll;

  useEffect(() => {
    const importedJobsQuery = query(
      collection(db, "importedJobs"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      importedJobsQuery,
      (snapshot) => {
        const importedJobs = snapshot.docs.map(
          (jobDocument) => ({
            id: jobDocument.id,
            ...(jobDocument.data() as Omit<
              ImportedJob,
              "id"
            >),
          })
        );

        setJobs(importedJobs);

        setSelectedJobIds((currentSelection) => {
          const availableIds = new Set(
            importedJobs
              .filter(
                (job) =>
                  job.status !== "published"
              )
              .map((job) => job.id)
          );

          return new Set(
            [...currentSelection].filter((id) =>
              availableIds.has(id)
            )
          );
        });

        setLoading(false);
        setErrorMessage("");
      },
      (error) => {
        console.error(
          "Unable to load imported jobs:",
          error
        );

        setErrorMessage(
          "Unable to load imported jobs. Please check Firestore permissions."
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  function getStatus(job: ImportedJob) {
    if (job.status === "published") {
      return "Published";
    }

    if (job.reviewStatus === "pending") {
      return "Pending Review";
    }

    return (
      job.status ||
      job.reviewStatus ||
      "Draft"
    );
  }

  const filteredJobs = useMemo(() => {
    const keyword = searchTerm
      .trim()
      .toLowerCase();

    if (!keyword) {
      return jobs;
    }

    return jobs.filter((job) => {
      return (
        (job.company ?? "")
          .toLowerCase()
          .includes(keyword) ||
        (job.role ?? "")
          .toLowerCase()
          .includes(keyword) ||
        (job.location ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [jobs, searchTerm]);

  const selectableFilteredJobs = useMemo(
    () =>
      filteredJobs.filter(
        (job) =>
          getStatus(job) !== "Published"
      ),
    [filteredJobs]
  );

  const selectedJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          selectedJobIds.has(job.id) &&
          getStatus(job) !== "Published"
      ),
    [jobs, selectedJobIds]
  );

  const allVisibleSelected =
    selectableFilteredJobs.length > 0 &&
    selectableFilteredJobs.every((job) =>
      selectedJobIds.has(job.id)
    );

  function toggleJobSelection(jobId: string) {
    setSelectedJobIds((currentSelection) => {
      const nextSelection = new Set(
        currentSelection
      );

      if (nextSelection.has(jobId)) {
        nextSelection.delete(jobId);
      } else {
        nextSelection.add(jobId);
      }

      return nextSelection;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedJobIds((currentSelection) => {
      const nextSelection = new Set(
        currentSelection
      );

      if (allVisibleSelected) {
        selectableFilteredJobs.forEach((job) =>
          nextSelection.delete(job.id)
        );
      } else {
        selectableFilteredJobs.forEach((job) =>
          nextSelection.add(job.id)
        );
      }

      return nextSelection;
    });
  }

  const totalJobs = jobs.length;

  const publishedJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          getStatus(job) === "Published"
      ).length,
    [jobs]
  );

  const pendingJobRecords = useMemo(
    () =>
      jobs.filter(
        (job) =>
          getStatus(job) !== "Published"
      ),
    [jobs]
  );

  const pendingJobs =
    pendingJobRecords.length;

  const totalCompanies = useMemo(
    () =>
      new Set(
        jobs
          .map((job) =>
            job.company?.trim()
          )
          .filter(
            (
              company
            ): company is string =>
              Boolean(company)
          )
      ).size,
    [jobs]
  );

  function buildLiveJobPayload(
    job: ImportedJob
  ) {
    const finalLogo = getCompanyLogo(
      job.company,
      job.companyLogo || job.logo
    );

    const primarySkills = uniqueStringArray(
      job.skills
    );

    const requiredSkills = uniqueStringArray(
      job.requiredSkills,
      job.skills
    );

    const type = normalizeJobType(
      job.jobType
    );

    const category = normalizeCategory(
      job.category
    );

    const applicationMode =
      normalizeApplicationMode(
        job.applicationMode,
        job.applyLink
      );

    return {
      company: job.company || "",
      role: job.role || "",
      location: job.location || "",
      experience: job.experience || "",
      education: job.education || "",
      salary:
        job.salary ||
        "Salary Not Disclosed",

      skills: primarySkills,
      primarySkills,
      requiredSkills,

      eligibility:
        job.eligibility || "",
      eligibilityCriteria:
        job.eligibility
          ? job.eligibility
              .split("\n")
              .map((value) =>
                value
                  .replace(/^[•\-]\s*/, "")
                  .trim()
              )
              .filter(Boolean)
          : [],

      responsibilities:
        job.responsibilities || "",
      benefits: job.benefits || "",
      selectionProcess:
        job.selectionProcess || "",
      description:
        job.description || "",
      jobDescription:
        job.description || "",

      applyLink: job.applyLink || "",
      sourceUrl: job.sourceUrl || "",

      logo: finalLogo,
      companyLogo: finalLogo,
      companyImage: finalLogo,

      category,
      jobType: type,
      type,

      applicationMode,
      workMode: job.workMode || "",
      employmentType:
        job.employmentType || "",
      lastDate: job.lastDate || "",

      source:
        job.source ||
        "automatic-import",
      sourceJobId:
        job.sourceJobId || "",
      sourceCompanyId:
        job.sourceCompanyId || "",
      uniqueKey: job.uniqueKey || "",
      importedJobId: job.id,
      importedAutomatically: true,

      status: "published",
      reviewStatus: "published",
      isActive: true,

      createdAt:
        job.createdAt ||
        serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt:
        serverTimestamp(),
    };
  }

  async function checkMainTableDuplicate(
    job: ImportedJob
  ) {
    return detectDuplicateJob(db, {
      id: job.id,
      company: job.company || "",
      role: job.role || "",
      location: job.location || "",
      applyLink: job.applyLink || "",
      sourceJobId: job.sourceJobId || "",
    });
  }

  async function publishJob(
    job: ImportedJob
  ) {
    if (
      publishingJobId ||
      bulkOperationRunning
    ) {
      return;
    }

    try {
      setPublishingJobId(job.id);
      setPublishSummary(null);

      const duplicate =
        await checkMainTableDuplicate(job);

      if (duplicate.isDuplicate) {
        toast.warning(
          `${job.role || "This job"} already exists in the main jobs table and was not published.`
        );
        return;
      }

      const liveJobReference = doc(
        db,
        "jobs",
        job.id
      );

      const importedJobReference = doc(
        db,
        "importedJobs",
        job.id
      );

      await setDoc(
        liveJobReference,
        buildLiveJobPayload(job),
        {
          merge: true,
        }
      );

      await updateDoc(
        importedJobReference,
        {
          status: "published",
          reviewStatus: "published",
          duplicateOverride: false,
          duplicateOfJobId: "",
          duplicateReason: "",
          publishedAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        }
      );

      toast.success(
        `${
          job.role || "Job"
        } published successfully.`
      );
    } catch (error) {
      console.error(
        "Unable to publish job:",
        error
      );

      toast.error(
        "Unable to check duplicates or publish this job. Please try again."
      );
    } finally {
      setPublishingJobId(null);
    }
  }

  async function publishSelectedJobs() {
    if (
      bulkOperationRunning ||
      publishingJobId
    ) {
      return;
    }

    if (selectedJobs.length === 0) {
      toast.info(
        "Select at least one pending job."
      );
      return;
    }

    const confirmed = window.confirm(
      `Check duplicates and publish ${selectedJobs.length} selected jobs?\n\nDuplicate jobs will be skipped.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setPublishingSelected(true);
      setPublishSummary(null);

      setPublishProgress({
        completed: 0,
        total: selectedJobs.length,
      });

      const jobsToPublish: ImportedJob[] = [];
      let duplicateCount = 0;
      let failedCount = 0;
      let checkedCount = 0;

      for (const job of selectedJobs) {
        try {
          const duplicate =
            await checkMainTableDuplicate(job);

          if (duplicate.isDuplicate) {
            duplicateCount += 1;
          } else {
            jobsToPublish.push(job);
          }
        } catch (error) {
          failedCount += 1;

          console.error(
            `Unable to check duplicate for selected imported job ${job.id}:`,
            error
          );
        } finally {
          checkedCount += 1;

          setPublishProgress({
            completed: checkedCount,
            total: selectedJobs.length,
          });
        }
      }

      let publishedCount = 0;
      const publishedIds = new Set<string>();

      for (
        let startIndex = 0;
        startIndex < jobsToPublish.length;
        startIndex += BULK_OPERATION_JOB_LIMIT
      ) {
        const currentJobs = jobsToPublish.slice(
          startIndex,
          startIndex + BULK_OPERATION_JOB_LIMIT
        );

        try {
          const batch = writeBatch(db);

          for (const job of currentJobs) {
            batch.set(
              doc(db, "jobs", job.id),
              buildLiveJobPayload(job),
              {
                merge: true,
              }
            );

            batch.update(
              doc(db, "importedJobs", job.id),
              {
                status: "published",
                reviewStatus: "published",
                duplicateOverride: false,
                duplicateOfJobId: "",
                duplicateReason: "",
                publishedAt:
                  serverTimestamp(),
                updatedAt:
                  serverTimestamp(),
              }
            );
          }

          await batch.commit();

          currentJobs.forEach((job) =>
            publishedIds.add(job.id)
          );

          publishedCount += currentJobs.length;
        } catch (error) {
          failedCount += currentJobs.length;

          console.error(
            "Unable to publish a selected-job batch:",
            error
          );
        }
      }

      setSelectedJobIds((currentSelection) => {
        const nextSelection = new Set(
          currentSelection
        );

        publishedIds.forEach((id) =>
          nextSelection.delete(id)
        );

        return nextSelection;
      });

      const summary: PublishSummary = {
        published: publishedCount,
        duplicates: duplicateCount,
        failed: failedCount,
      };

      setPublishSummary(summary);

      if (
        publishedCount > 0 &&
        failedCount === 0
      ) {
        toast.success(
          `Published ${publishedCount} selected jobs. Skipped ${duplicateCount} duplicates.`
        );
      } else if (publishedCount > 0) {
        toast.warning(
          `Published ${publishedCount}, skipped ${duplicateCount} duplicates, and failed ${failedCount}.`
        );
      } else if (
        duplicateCount > 0 &&
        failedCount === 0
      ) {
        toast.info(
          `No new selected jobs were published. ${duplicateCount} duplicates were skipped.`
        );
      } else {
        toast.error(
          `No selected jobs were published. Failed: ${failedCount}.`
        );
      }
    } finally {
      setPublishingSelected(false);

      setPublishProgress({
        completed: 0,
        total: 0,
      });
    }
  }

  async function publishAllPendingJobs() {
    if (
      bulkOperationRunning ||
      publishingJobId
    ) {
      return;
    }

    if (
      pendingJobRecords.length === 0
    ) {
      toast.info(
        "There are no pending jobs to publish."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Check the main jobs table and publish all non-duplicate pending jobs?\n\nPending jobs: ${pendingJobRecords.length}\n\nDuplicate jobs will be skipped.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setPublishingAll(true);
      setPublishSummary(null);

      setPublishProgress({
        completed: 0,
        total:
          pendingJobRecords.length,
      });

      const jobsToPublish: ImportedJob[] = [];
      let duplicateCount = 0;
      let failedCount = 0;
      let checkedCount = 0;

      for (const job of pendingJobRecords) {
        try {
          const duplicate =
            await checkMainTableDuplicate(job);

          if (duplicate.isDuplicate) {
            duplicateCount += 1;
          } else {
            jobsToPublish.push(job);
          }
        } catch (error) {
          failedCount += 1;

          console.error(
            `Unable to check duplicate for imported job ${job.id}:`,
            error
          );
        } finally {
          checkedCount += 1;

          setPublishProgress({
            completed: checkedCount,
            total:
              pendingJobRecords.length,
          });
        }
      }

      let publishedCount = 0;

      for (
        let startIndex = 0;
        startIndex <
        jobsToPublish.length;
        startIndex +=
          BULK_OPERATION_JOB_LIMIT
      ) {
        const currentJobs =
          jobsToPublish.slice(
            startIndex,
            startIndex +
              BULK_OPERATION_JOB_LIMIT
          );

        try {
          const batch =
            writeBatch(db);

          for (const job of currentJobs) {
            const liveJobReference = doc(
              db,
              "jobs",
              job.id
            );

            const importedJobReference =
              doc(
                db,
                "importedJobs",
                job.id
              );

            batch.set(
              liveJobReference,
              buildLiveJobPayload(job),
              {
                merge: true,
              }
            );

            batch.update(
              importedJobReference,
              {
                status: "published",
                reviewStatus:
                  "published",
                duplicateOverride:
                  false,
                duplicateOfJobId: "",
                duplicateReason: "",
                publishedAt:
                  serverTimestamp(),
                updatedAt:
                  serverTimestamp(),
              }
            );
          }

          await batch.commit();

          publishedCount +=
            currentJobs.length;
        } catch (error) {
          failedCount +=
            currentJobs.length;

          console.error(
            "Unable to publish a bulk job batch:",
            error
          );
        }
      }

      const summary: PublishSummary = {
        published: publishedCount,
        duplicates: duplicateCount,
        failed: failedCount,
      };

      setPublishSummary(summary);

      if (
        publishedCount > 0 &&
        failedCount === 0
      ) {
        toast.success(
          `Published ${publishedCount} jobs. Skipped ${duplicateCount} duplicates.`
        );
      } else if (
        publishedCount > 0
      ) {
        toast.warning(
          `Published ${publishedCount}, skipped ${duplicateCount} duplicates, and failed ${failedCount}.`
        );
      } else if (
        duplicateCount > 0 &&
        failedCount === 0
      ) {
        toast.info(
          `No new jobs were published. ${duplicateCount} duplicate jobs were skipped.`
        );
      } else {
        toast.error(
          `No jobs were published. Failed: ${failedCount}.`
        );
      }
    } finally {
      setPublishingAll(false);

      setPublishProgress({
        completed: 0,
        total: 0,
      });
    }
  }

  async function deleteAllImportedJobs() {
    if (
      bulkOperationRunning ||
      publishingJobId
    ) {
      return;
    }

    if (jobs.length === 0) {
      toast.info(
        "There are no imported jobs to delete."
      );
      return;
    }

    const firstConfirmation =
      window.confirm(
        `Delete all ${jobs.length} imported jobs?\n\nThis removes records only from the importedJobs collection. Published jobs in the main jobs collection will remain.`
      );

    if (!firstConfirmation) {
      return;
    }

    const verification = window.prompt(
      'Type DELETE ALL to confirm permanent deletion:'
    );

    if (verification !== "DELETE ALL") {
      toast.warning(
        "Delete All cancelled. Confirmation text did not match."
      );
      return;
    }

    try {
      setDeletingAll(true);
      setPublishSummary(null);

      setDeleteProgress({
        completed: 0,
        total: jobs.length,
      });

      let deletedCount = 0;

      for (
        let startIndex = 0;
        startIndex < jobs.length;
        startIndex +=
          BULK_OPERATION_JOB_LIMIT
      ) {
        const currentJobs = jobs.slice(
          startIndex,
          startIndex +
            BULK_OPERATION_JOB_LIMIT
        );

        const batch =
          writeBatch(db);

        for (const job of currentJobs) {
          batch.delete(
            doc(
              db,
              "importedJobs",
              job.id
            )
          );
        }

        await batch.commit();

        deletedCount +=
          currentJobs.length;

        setDeleteProgress({
          completed: deletedCount,
          total: jobs.length,
        });
      }

      toast.success(
        `${deletedCount} imported jobs deleted successfully.`
      );
    } catch (error) {
      console.error(
        "Unable to delete all imported jobs:",
        error
      );

      toast.error(
        "Bulk deletion failed. Jobs deleted before the error remain deleted."
      );
    } finally {
      setDeletingAll(false);

      setDeleteProgress({
        completed: 0,
        total: 0,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Imported Jobs
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalJobs}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Pending Review
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-600">
            {pendingJobs}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Published
          </p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {publishedJobs}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Companies
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-600">
                {totalCompanies}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Imported Jobs
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Duplicate-safe publishing checks the main jobs table before saving.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap xl:w-auto xl:justify-end">
              <button
                type="button"
                onClick={
                  publishSelectedJobs
                }
                disabled={
                  loading ||
                  bulkOperationRunning ||
                  Boolean(
                    publishingJobId
                  ) ||
                  selectedJobs.length === 0
                }
                className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
              >
                {publishingSelected ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}

                {publishingSelected
                  ? `Checking ${publishProgress.completed}/${publishProgress.total}`
                  : `Publish Selected (${selectedJobs.length})`}
              </button>

              <button
                type="button"
                onClick={
                  publishAllPendingJobs
                }
                disabled={
                  loading ||
                  bulkOperationRunning ||
                  Boolean(
                    publishingJobId
                  ) ||
                  pendingJobs === 0
                }
                className="inline-flex min-w-[210px] items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
              >
                {publishingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}

                {publishingAll
                  ? `Checking ${publishProgress.completed}/${publishProgress.total}`
                  : `Publish All Pending (${pendingJobs})`}
              </button>

              <button
                type="button"
                onClick={
                  deleteAllImportedJobs
                }
                disabled={
                  loading ||
                  bulkOperationRunning ||
                  Boolean(
                    publishingJobId
                  ) ||
                  jobs.length === 0
                }
                className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
              >
                {deletingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}

                {deletingAll
                  ? `Deleting ${deleteProgress.completed}/${deleteProgress.total}`
                  : `Delete All (${jobs.length})`}
              </button>

              <div className="relative w-full sm:min-w-[320px] sm:flex-1 xl:w-[340px] xl:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder="Search company, role or location"
                  disabled={bulkOperationRunning}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {(publishingAll ||
            publishingSelected) && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              Checking the main jobs table:{" "}
              {publishProgress.completed} of{" "}
              {publishProgress.total}
            </div>
          )}

          {publishSummary && (
            <div className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm sm:grid-cols-3">
              <p className="font-semibold text-green-700">
                Published: {publishSummary.published}
              </p>
              <p className="font-semibold text-amber-700">
                Duplicates skipped: {publishSummary.duplicates}
              </p>
              <p className="font-semibold text-red-700">
                Failed: {publishSummary.failed}
              </p>
            </div>
          )}

          {deletingAll && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              Deleting imported jobs:{" "}
              {deleteProgress.completed} of{" "}
              {deleteProgress.total}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-12 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={
                      toggleSelectAllVisible
                    }
                    disabled={
                      bulkOperationRunning ||
                      selectableFilteredJobs.length === 0
                    }
                    aria-label="Select all visible pending jobs"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  Company
                </th>
                <th className="px-4 py-3 text-left">
                  Role
                </th>
                <th className="px-4 py-3 text-left">
                  Location
                </th>
                <th className="px-4 py-3 text-left">
                  Experience
                </th>
                <th className="px-4 py-3 text-left">
                  Status
                </th>
                <th className="px-4 py-3 text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16"
                  >
                    <div className="flex items-center justify-center gap-3 text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>
                        Loading imported
                        jobs...
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                errorMessage && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center font-medium text-red-600"
                    >
                      {errorMessage}
                    </td>
                  </tr>
                )}

              {!loading &&
                !errorMessage &&
                filteredJobs.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center text-gray-500"
                    >
                      {jobs.length === 0
                        ? "No imported jobs found."
                        : "No jobs match your search."}
                    </td>
                  </tr>
                )}

              {!loading &&
                !errorMessage &&
                filteredJobs.map((job) => {
                  const status =
                    getStatus(job);

                  const isPublishing =
                    publishingJobId ===
                    job.id;

                  const isPublished =
                    status ===
                    "Published";

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedJobIds.has(
                            job.id
                          )}
                          onChange={() =>
                            toggleJobSelection(
                              job.id
                            )
                          }
                          disabled={
                            isPublished ||
                            bulkOperationRunning
                          }
                          aria-label={`Select ${job.role || "job"}`}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </td>

                      <td className="px-4 py-4 font-semibold text-gray-900">
                        {job.company ||
                          "Not available"}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {job.role ||
                          "Not available"}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {job.location ||
                          "Not available"}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {job.experience ||
                          "Not specified"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            isPublished
                              ? "bg-green-100 text-green-700"
                              : status ===
                                  "Pending Review"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/admin/panel/imported-jobs/${job.id}`}
                            className={`inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition ${
                              bulkOperationRunning
                                ? "pointer-events-none opacity-50"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              publishJob(
                                job
                              )
                            }
                            disabled={
                              isPublished ||
                              isPublishing ||
                              bulkOperationRunning
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                          >
                            {isPublishing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Checking
                              </>
                            ) : isPublished ? (
                              "Published"
                            ) : (
                              <>
                                <Send className="h-4 w-4" />
                                Publish
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}