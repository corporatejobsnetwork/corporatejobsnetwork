"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckSquare,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Square,
  Trash2,
  XCircle,
} from "lucide-react";

import { db } from "@/lib/firebase";

type Job = {
  id: string;
  company: string;
  role: string;
  location: string;
  experience: string;
  salary: string;
  lastDate: string;
  applyLink: string;
  type: string;
  category: string;
  isActive: boolean;
  status: string;
  createdAt?: Timestamp | null;
};

type StatusFilter = "all" | "active" | "inactive" | "expired";

const BULK_BATCH_LIMIT = 400;

function formatLastDate(lastDate: string) {
  if (!lastDate || lastDate === "N/A") {
    return "N/A";
  }

  const normalizedDate = lastDate.includes("T")
    ? lastDate
    : `${lastDate}T00:00:00`;

  const date = new Date(normalizedDate);

  if (Number.isNaN(date.getTime())) {
    return lastDate;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isJobExpired(lastDate: string) {
  if (!lastDate || lastDate === "N/A") {
    return false;
  }

  const normalizedDate = lastDate.includes("T")
    ? lastDate
    : `${lastDate}T23:59:59`;

  const deadline = new Date(normalizedDate);

  if (Number.isNaN(deadline.getTime())) {
    return false;
  }

  return deadline.getTime() < Date.now();
}

function formatJobType(type: string) {
  const value = type.trim().toLowerCase();

  if (value === "private") return "Private Job";
  if (value === "government") return "Government Job";

  return type || "N/A";
}

function formatCategory(category: string) {
  const value = category.trim().toLowerCase();

  const labels: Record<string, string> = {
    freshers: "Freshers",
    experienced: "Experienced",
    "freshers-experienced": "Freshers & Experienced",
    "work-from-home": "Work From Home",
    internship: "Internship",
    "walk-in": "Walk-In Drive",
    "walk-in-drive": "Walk-In Drive",
  };

  return labels[value] ?? category ?? "N/A";
}

function isActiveJob(job: Job) {
  return job.isActive && !isJobExpired(job.lastDate);
}

function getEditLink(job: Job) {
  return job.type.toLowerCase() === "government"
    ? `/admin/panel/edit-government-job/${job.id}`
    : `/admin/panel/edit-job/${job.id}`;
}

export default function ManageJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [selectedJobIds, setSelectedJobIds] = useState<
    Set<string>
  >(new Set());

  const [loading, setLoading] = useState(true);
  const [deletingJobId, setDeletingJobId] =
    useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<
    "activate" | "deactivate" | "delete" | null
  >(null);

  const [bulkProgress, setBulkProgress] = useState({
    completed: 0,
    total: 0,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    const jobsQuery = query(
      collection(db, "jobs"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      jobsQuery,
      (snapshot) => {
        const jobList: Job[] = snapshot.docs.map(
          (jobDocument) => {
            const data = jobDocument.data();

            return {
              id: jobDocument.id,
              company: String(data.company ?? ""),
              role: String(data.role ?? ""),
              location: String(data.location ?? ""),
              experience: String(data.experience ?? ""),
              salary: String(data.salary ?? "N/A"),
              lastDate: String(data.lastDate ?? "N/A"),
              applyLink: String(data.applyLink ?? ""),
              type: String(data.type ?? data.jobType ?? ""),
              category: String(data.category ?? ""),
              isActive:
                typeof data.isActive === "boolean"
                  ? data.isActive
                  : true,
              status: String(data.status ?? "published"),
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt
                  : null,
            };
          }
        );

        setJobs(jobList);

        setSelectedJobIds((current) => {
          const availableIds = new Set(
            jobList.map((job) => job.id)
          );

          return new Set(
            [...current].filter((id) =>
              availableIds.has(id)
            )
          );
        });

        setLoading(false);
      },
      (snapshotError) => {
        console.error(
          "Failed to load jobs:",
          snapshotError
        );
        setError(
          "Unable to load jobs. Please try again."
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) => job.category.trim())
          .filter(Boolean)
      )
    ).sort((first, second) =>
      formatCategory(first).localeCompare(
        formatCategory(second)
      )
    );
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const searchValue = searchText
      .trim()
      .toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !searchValue ||
        job.company
          .toLowerCase()
          .includes(searchValue) ||
        job.role
          .toLowerCase()
          .includes(searchValue) ||
        job.location
          .toLowerCase()
          .includes(searchValue) ||
        job.experience
          .toLowerCase()
          .includes(searchValue) ||
        job.type
          .toLowerCase()
          .includes(searchValue) ||
        job.category
          .toLowerCase()
          .includes(searchValue);

      const matchesCategory =
        categoryFilter === "all" ||
        job.category === categoryFilter;

      const expired = isJobExpired(job.lastDate);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          job.isActive &&
          !expired) ||
        (statusFilter === "inactive" &&
          !job.isActive) ||
        (statusFilter === "expired" && expired);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [
    jobs,
    searchText,
    categoryFilter,
    statusFilter,
  ]);

  const selectedJobs = useMemo(
    () =>
      jobs.filter((job) =>
        selectedJobIds.has(job.id)
      ),
    [jobs, selectedJobIds]
  );

  const selectedVisibleCount =
    filteredJobs.filter((job) =>
      selectedJobIds.has(job.id)
    ).length;

  const allVisibleSelected =
    filteredJobs.length > 0 &&
    selectedVisibleCount === filteredJobs.length;

  const totalCompanies = useMemo(
    () =>
      new Set(
        jobs
          .map((job) =>
            job.company.trim().toLowerCase()
          )
          .filter(Boolean)
      ).size,
    [jobs]
  );

  const activeJobs = useMemo(
    () => jobs.filter(isActiveJob).length,
    [jobs]
  );

  const inactiveJobs = useMemo(
    () =>
      jobs.filter(
        (job) => !job.isActive
      ).length,
    [jobs]
  );

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function toggleJobSelection(jobId: string) {
    setSelectedJobIds((current) => {
      const next = new Set(current);

      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }

      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedJobIds((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        filteredJobs.forEach((job) =>
          next.delete(job.id)
        );
      } else {
        filteredJobs.forEach((job) =>
          next.add(job.id)
        );
      }

      return next;
    });
  }

  async function handleDelete(job: Job) {
    clearMessages();

    const shouldDelete = window.confirm(
      `Are you sure you want to delete "${job.role}" at ${job.company}?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingJobId(job.id);

      await deleteDoc(
        doc(db, "jobs", job.id)
      );

      setSuccess(
        `${job.company} job deleted successfully.`
      );
    } catch (deleteError) {
      console.error(
        "Failed to delete job:",
        deleteError
      );
      setError(
        "Unable to delete the job. Please try again."
      );
    } finally {
      setDeletingJobId(null);
    }
  }

  async function runBulkStatusUpdate(
    isActive: boolean
  ) {
    clearMessages();

    if (selectedJobs.length === 0) {
      setError(
        "Select at least one job first."
      );
      return;
    }

    const actionLabel = isActive
      ? "activate"
      : "deactivate";

    const confirmed = window.confirm(
      `${
        isActive ? "Activate" : "Deactivate"
      } ${selectedJobs.length} selected jobs?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setBulkAction(
        isActive ? "activate" : "deactivate"
      );

      setBulkProgress({
        completed: 0,
        total: selectedJobs.length,
      });

      let completed = 0;

      for (
        let startIndex = 0;
        startIndex < selectedJobs.length;
        startIndex += BULK_BATCH_LIMIT
      ) {
        const currentJobs = selectedJobs.slice(
          startIndex,
          startIndex + BULK_BATCH_LIMIT
        );

        const batch = writeBatch(db);

        currentJobs.forEach((job) => {
          batch.update(
            doc(db, "jobs", job.id),
            {
              isActive,
              updatedAt: serverTimestamp(),
            }
          );
        });

        await batch.commit();

        completed += currentJobs.length;

        setBulkProgress({
          completed,
          total: selectedJobs.length,
        });
      }

      setSelectedJobIds(new Set());

      setSuccess(
        `${completed} jobs ${actionLabel}d successfully.`
      );
    } catch (bulkError) {
      console.error(
        `Failed to ${actionLabel} jobs:`,
        bulkError
      );

      setError(
        `Unable to ${actionLabel} all selected jobs. Jobs processed before the error remain updated.`
      );
    } finally {
      setBulkAction(null);
      setBulkProgress({
        completed: 0,
        total: 0,
      });
    }
  }

  async function handleBulkDelete() {
    clearMessages();

    if (selectedJobs.length === 0) {
      setError(
        "Select at least one job first."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedJobs.length} selected jobs?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    const verification = window.prompt(
      'Type DELETE to confirm permanent deletion:'
    );

    if (verification !== "DELETE") {
      setError(
        "Bulk delete cancelled because the confirmation text did not match."
      );
      return;
    }

    try {
      setBulkAction("delete");

      setBulkProgress({
        completed: 0,
        total: selectedJobs.length,
      });

      let completed = 0;

      for (
        let startIndex = 0;
        startIndex < selectedJobs.length;
        startIndex += BULK_BATCH_LIMIT
      ) {
        const currentJobs = selectedJobs.slice(
          startIndex,
          startIndex + BULK_BATCH_LIMIT
        );

        const batch = writeBatch(db);

        currentJobs.forEach((job) => {
          batch.delete(
            doc(db, "jobs", job.id)
          );
        });

        await batch.commit();

        completed += currentJobs.length;

        setBulkProgress({
          completed,
          total: selectedJobs.length,
        });
      }

      setSelectedJobIds(new Set());

      setSuccess(
        `${completed} selected jobs deleted successfully.`
      );
    } catch (bulkError) {
      console.error(
        "Failed to delete selected jobs:",
        bulkError
      );

      setError(
        "Unable to delete all selected jobs. Jobs deleted before the error remain deleted."
      );
    } finally {
      setBulkAction(null);
      setBulkProgress({
        completed: 0,
        total: 0,
      });
    }
  }

  const bulkRunning =
    bulkAction !== null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-blue-700">
              Admin Panel
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Manage Published Jobs
            </h1>

            <p className="mt-2 text-slate-600">
              Search, filter, edit, activate,
              deactivate and delete live job
              postings.
            </p>
          </div>

          <Link
            href="/admin/panel/add-job"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            <Plus size={20} />
            Add New Job
          </Link>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <BriefcaseBusiness size={24} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Jobs
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {jobs.length}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-100 p-3 text-green-700">
                <CalendarDays size={24} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  Active Jobs
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {activeJobs}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-100 p-3 text-orange-700">
                <XCircle size={24} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  Inactive Jobs
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {inactiveJobs}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
                <Building2 size={24} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  Companies
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {totalCompanies}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_180px]">
            <div className="relative">
              <Search
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value
                  )
                }
                placeholder="Search company, role, location, experience, type or category..."
                disabled={bulkRunning}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
              disabled={bulkRunning}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="all">
                All Categories
              </option>

              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {formatCategory(category)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter
                )
              }
              disabled={bulkRunning}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="all">
                All Statuses
              </option>
              <option value="active">
                Active
              </option>
              <option value="inactive">
                Inactive
              </option>
              <option value="expired">
                Expired
              </option>
            </select>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-slate-600">
              Selected: {selectedJobIds.size}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  runBulkStatusUpdate(true)
                }
                disabled={
                  selectedJobIds.size === 0 ||
                  bulkRunning
                }
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {bulkAction === "activate" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckSquare className="h-4 w-4" />
                )}
                Activate Selected
              </button>

              <button
                type="button"
                onClick={() =>
                  runBulkStatusUpdate(false)
                }
                disabled={
                  selectedJobIds.size === 0 ||
                  bulkRunning
                }
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {bulkAction ===
                "deactivate" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Deactivate Selected
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={
                  selectedJobIds.size === 0 ||
                  bulkRunning
                }
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {bulkAction === "delete" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Selected
              </button>
            </div>
          </div>

          {bulkRunning && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
              Processing:{" "}
              {bulkProgress.completed} of{" "}
              {bulkProgress.total}
            </div>
          )}
        </section>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
          >
            {success}
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="text-center">
              <Loader2
                size={38}
                className="mx-auto animate-spin text-blue-700"
              />

              <p className="mt-4 font-medium text-slate-600">
                Loading jobs...
              </p>
            </div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <BriefcaseBusiness
              size={48}
              className="mx-auto text-slate-300"
            />

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {jobs.length === 0
                ? "No jobs added yet"
                : "No matching jobs found"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-slate-600">
              {jobs.length === 0
                ? "Add your first job posting to start displaying jobs on the website."
                : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1450px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="w-14 px-5 py-4">
                        <button
                          type="button"
                          onClick={
                            toggleSelectAllVisible
                          }
                          aria-label={
                            allVisibleSelected
                              ? "Unselect all visible jobs"
                              : "Select all visible jobs"
                          }
                          className="text-slate-600"
                        >
                          {allVisibleSelected ? (
                            <CheckSquare
                              size={20}
                            />
                          ) : (
                            <Square size={20} />
                          )}
                        </button>
                      </th>

                      <th className="px-5 py-4 text-sm font-bold text-slate-700">
                        Company and Role
                      </th>
                      <th className="px-5 py-4 text-sm font-bold text-slate-700">
                        Location
                      </th>
                      <th className="px-5 py-4 text-sm font-bold text-slate-700">
                        Experience
                      </th>
                      <th className="px-5 py-4 text-sm font-bold text-slate-700">
                        Type
                      </th>
                      <th className="px-5 py-4 text-sm font-bold text-slate-700">
                        Category
                      </th>
                      <th className="px-5 py-4 text-sm font-bold text-slate-700">
                        Salary
                      </th>
                      <th className="px-5 py-4 text-sm font-bold text-slate-700">
                        Last Date
                      </th>
                      <th className="px-5 py-4 text-sm font-bold text-slate-700">
                        Status
                      </th>
                      <th className="px-5 py-4 text-right text-sm font-bold text-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {filteredJobs.map((job) => {
                      const expired =
                        isJobExpired(
                          job.lastDate
                        );

                      const selected =
                        selectedJobIds.has(
                          job.id
                        );

                      return (
                        <tr
                          key={job.id}
                          className={`transition hover:bg-slate-50 ${
                            selected
                              ? "bg-blue-50/60"
                              : ""
                          }`}
                        >
                          <td className="px-5 py-5">
                            <button
                              type="button"
                              onClick={() =>
                                toggleJobSelection(
                                  job.id
                                )
                              }
                              aria-label={
                                selected
                                  ? `Unselect ${job.role}`
                                  : `Select ${job.role}`
                              }
                              className="text-slate-600"
                            >
                              {selected ? (
                                <CheckSquare
                                  size={20}
                                />
                              ) : (
                                <Square
                                  size={20}
                                />
                              )}
                            </button>
                          </td>

                          <td className="px-5 py-5">
                            <p className="font-bold text-slate-900">
                              {job.company ||
                                "Not available"}
                            </p>

                            <p className="mt-1 text-sm text-slate-600">
                              {job.role ||
                                "Not available"}
                            </p>
                          </td>

                          <td className="px-5 py-5 text-sm text-slate-700">
                            {job.location ||
                              "Not available"}
                          </td>

                          <td className="px-5 py-5 text-sm text-slate-700">
                            {job.experience ||
                              "Not specified"}
                          </td>

                          <td className="px-5 py-5 text-sm text-slate-700">
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                              {formatJobType(
                                job.type
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-5 text-sm text-slate-700">
                            <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                              {formatCategory(
                                job.category
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-5 text-sm text-slate-700">
                            {job.salary || "N/A"}
                          </td>

                          <td className="px-5 py-5">
                            <p className="text-sm font-medium text-slate-700">
                              {formatLastDate(
                                job.lastDate
                              )}
                            </p>

                            {expired && (
                              <span className="mt-2 inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                                Expired
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                job.isActive &&
                                !expired
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {job.isActive &&
                              !expired
                                ? "Active"
                                : expired
                                  ? "Expired"
                                  : "Inactive"}
                            </span>
                          </td>

                          <td className="px-5 py-5">
                            <div className="flex justify-end gap-2">
                              {job.applyLink && (
                                <a
                                  href={
                                    job.applyLink
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Open application link for ${job.role}`}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <ExternalLink
                                    size={18}
                                  />
                                </a>
                              )}

                              <Link
                                href={getEditLink(
                                  job
                                )}
                                aria-label={`Edit ${job.role}`}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                              >
                                <Pencil
                                  size={18}
                                />
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    job
                                  )
                                }
                                disabled={
                                  deletingJobId ===
                                    job.id ||
                                  bulkRunning
                                }
                                aria-label={`Delete ${job.role}`}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingJobId ===
                                job.id ? (
                                  <Loader2
                                    size={18}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2
                                    size={18}
                                  />
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

            <div className="mt-6 grid gap-4 lg:hidden">
              {filteredJobs.map((job) => {
                const expired =
                  isJobExpired(job.lastDate);

                const selected =
                  selectedJobIds.has(job.id);

                return (
                  <article
                    key={job.id}
                    className={`rounded-2xl border bg-white p-5 shadow-sm ${
                      selected
                        ? "border-blue-400 ring-2 ring-blue-100"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          toggleJobSelection(
                            job.id
                          )
                        }
                        className="mt-1 text-slate-600"
                        aria-label={
                          selected
                            ? `Unselect ${job.role}`
                            : `Select ${job.role}`
                        }
                      >
                        {selected ? (
                          <CheckSquare
                            size={22}
                          />
                        ) : (
                          <Square size={22} />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold text-slate-900">
                          {job.company}
                        </p>

                        <p className="mt-1 font-medium text-blue-700">
                          {job.role}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          job.isActive &&
                          !expired
                            ? "bg-green-100 text-green-700"
                            : expired
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {job.isActive &&
                        !expired
                          ? "Active"
                          : expired
                            ? "Expired"
                            : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-5 space-y-3 text-sm text-slate-600">
                      <div className="flex items-start gap-3">
                        <MapPin
                          size={18}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />

                        <span>
                          {job.location}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <BriefcaseBusiness
                          size={18}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />

                        <span>
                          {job.experience}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          {formatJobType(
                            job.type
                          )}
                        </span>

                        <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                          {formatCategory(
                            job.category
                          )}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="w-[18px] shrink-0 text-center font-bold text-slate-400">
                          ₹
                        </span>

                        <span>
                          {job.salary || "N/A"}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <CalendarDays
                          size={18}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />

                        <span>
                          Last date:{" "}
                          {formatLastDate(
                            job.lastDate
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-200 pt-5">
                      {job.applyLink ? (
                        <a
                          href={job.applyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <ExternalLink
                            size={17}
                          />
                          View
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-400"
                        >
                          <ExternalLink
                            size={17}
                          />
                          View
                        </button>
                      )}

                      <Link
                        href={getEditLink(job)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 px-3 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                      >
                        <Pencil size={17} />
                        Edit
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(job)
                        }
                        disabled={
                          deletingJobId ===
                            job.id ||
                          bulkRunning
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingJobId ===
                        job.id ? (
                          <Loader2
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={17} />
                        )}

                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}