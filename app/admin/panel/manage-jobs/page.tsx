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
  Timestamp,
} from "firebase/firestore";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
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
  createdAt?: Timestamp | null;
};

function formatLastDate(lastDate: string) {
  if (!lastDate || lastDate === "N/A") {
    return "N/A";
  }

  const date = new Date(`${lastDate}T00:00:00`);

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

  const deadline = new Date(`${lastDate}T23:59:59`);

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
  };

  return labels[value] ?? category ?? "N/A";
}

export default function ManageJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(true);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

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
        const jobList: Job[] = snapshot.docs.map((jobDocument) => {
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
            type: String(data.type ?? ""),
            category: String(data.category ?? ""),
            createdAt:
              data.createdAt instanceof Timestamp ? data.createdAt : null,
          };
        });

        setJobs(jobList);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Failed to load jobs:", snapshotError);
        setError("Unable to load jobs. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredJobs = useMemo(() => {
    const searchValue = searchText.trim().toLowerCase();

    if (!searchValue) {
      return jobs;
    }

    return jobs.filter((job) => {
      return (
        job.company.toLowerCase().includes(searchValue) ||
        job.role.toLowerCase().includes(searchValue) ||
        job.location.toLowerCase().includes(searchValue) ||
        job.experience.toLowerCase().includes(searchValue) ||
        job.type.toLowerCase().includes(searchValue) ||
        job.category.toLowerCase().includes(searchValue)
      );
    });
  }, [jobs, searchText]);

  async function handleDelete(job: Job) {
    setError("");
    setSuccess("");

    const shouldDelete = window.confirm(
      `Are you sure you want to delete "${job.role}" at ${job.company}?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingJobId(job.id);

      await deleteDoc(doc(db, "jobs", job.id));

      setSuccess(`${job.company} job deleted successfully.`);
    } catch (deleteError) {
      console.error("Failed to delete job:", deleteError);
      setError("Unable to delete the job. Please try again.");
    } finally {
      setDeletingJobId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-blue-700">Admin Panel</p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Manage Jobs
            </h1>

            <p className="mt-2 text-slate-600">
              View, search, edit and delete job postings.
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

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
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
                <Building2 size={24} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  Companies
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {
                    new Set(
                      jobs.map((job) => job.company.trim().toLowerCase())
                    ).size
                  }
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-100 p-3 text-orange-700">
                <CalendarDays size={24} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  Active Jobs
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {
                    jobs.filter((job) => !isJobExpired(job.lastDate))
                      .length
                  }
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="relative">
            <Search
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by company, role, location, experience, type or category..."
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>
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
                : "Try searching with a different company, role, location or experience."}
            </p>

            {jobs.length === 0 && (
              <Link
                href="/admin/panel/add-job"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
              >
                <Plus size={20} />
                Add First Job
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1350px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
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

                      <th className="px-5 py-4 text-right text-sm font-bold text-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {filteredJobs.map((job) => {
                      const expired = isJobExpired(job.lastDate);

                      return (
                        <tr
                          key={job.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-5">
                            <p className="font-bold text-slate-900">
                              {job.company}
                            </p>

                            <p className="mt-1 text-sm text-slate-600">
                              {job.role}
                            </p>
                          </td>

                          <td className="px-5 py-5 text-sm text-slate-700">
                            {job.location}
                          </td>

                          <td className="px-5 py-5 text-sm text-slate-700">
                            {job.experience}
                          </td>

                          <td className="px-5 py-5 text-sm text-slate-700">
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                              {formatJobType(job.type)}
                            </span>
                          </td>

                          <td className="px-5 py-5 text-sm text-slate-700">
                            <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                              {formatCategory(job.category)}
                            </span>
                          </td>

                          <td className="px-5 py-5 text-sm text-slate-700">
                            {job.salary || "N/A"}
                          </td>

                          <td className="px-5 py-5">
                            <p className="text-sm font-medium text-slate-700">
                              {formatLastDate(job.lastDate)}
                            </p>

                            {expired && (
                              <span className="mt-2 inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                                Expired
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-5">
                            <div className="flex justify-end gap-2">
                              {job.applyLink && (
                                <a
                                  href={job.applyLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Open application link for ${job.role}`}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <ExternalLink size={18} />
                                </a>
                              )}

                              <Link
                                href={
    job.type.toLowerCase() === "government"
      ? `/admin/panel/edit-government-job/${job.id}`
      : `/admin/panel/edit-job/${job.id}`
  }
                                aria-label={`Edit ${job.role}`}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                              >
                                <Pencil size={18} />
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleDelete(job)}
                                disabled={deletingJobId === job.id}
                                aria-label={`Delete ${job.role}`}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingJobId === job.id ? (
                                  <Loader2
                                    size={18}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2 size={18} />
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
                const expired = isJobExpired(job.lastDate);

                return (
                  <article
                    key={job.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          {job.company}
                        </p>

                        <p className="mt-1 font-medium text-blue-700">
                          {job.role}
                        </p>
                      </div>

                      {expired ? (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                          Expired
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mt-5 space-y-3 text-sm text-slate-600">
                      <div className="flex items-start gap-3">
                        <MapPin
                          size={18}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />

                        <span>{job.location}</span>
                      </div>

                      <div className="flex items-start gap-3">
                        <BriefcaseBusiness
                          size={18}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />

                        <span>{job.experience}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          {formatJobType(job.type)}
                        </span>

                        <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                          {formatCategory(job.category)}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="w-[18px] shrink-0 text-center font-bold text-slate-400">
                          ₹
                        </span>

                        <span>{job.salary || "N/A"}</span>
                      </div>

                      <div className="flex items-start gap-3">
                        <CalendarDays
                          size={18}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />

                        <span>
                          Last date: {formatLastDate(job.lastDate)}
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
                          <ExternalLink size={17} />
                          View
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-400"
                        >
                          <ExternalLink size={17} />
                          View
                        </button>
                      )}

                      <Link
                        href={
    job.type.toLowerCase() === "government"
      ? `/admin/panel/edit-government-job/${job.id}`
      : `/admin/panel/edit-job/${job.id}`
  }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 px-3 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                      >
                        <Pencil size={17} />
                        Edit
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDelete(job)}
                        disabled={deletingJobId === job.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingJobId === job.id ? (
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