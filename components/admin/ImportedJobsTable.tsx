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
} from "firebase/firestore";
import { Building2, Eye, Loader2, Search, Send } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase";

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
  category?: string;
  jobType?: string;
  applicationMode?: string;
  lastDate?: string;
  source?: string;
  sourceJobId?: string;
  uniqueKey?: string;
  status?: string;
  reviewStatus?: string;
  createdAt?: Timestamp;
};

export default function ImportedJobsTable() {
  const [jobs, setJobs] = useState<ImportedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingJobId, setPublishingJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const importedJobsQuery = query(
      collection(db, "importedJobs"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      importedJobsQuery,
      (snapshot) => {
        const importedJobs = snapshot.docs.map((jobDocument) => ({
          id: jobDocument.id,
          ...(jobDocument.data() as Omit<ImportedJob, "id">),
        }));

        setJobs(importedJobs);
        setLoading(false);
        setErrorMessage("");
      },
      (error) => {
        console.error("Unable to load imported jobs:", error);

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

    return job.status || job.reviewStatus || "Draft";
  }

  const filteredJobs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) {
      return jobs;
    }

    return jobs.filter((job) => {
      return (
        (job.company ?? "").toLowerCase().includes(keyword) ||
        (job.role ?? "").toLowerCase().includes(keyword) ||
        (job.location ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [jobs, searchTerm]);

  const totalJobs = jobs.length;

  const publishedJobs = useMemo(
    () => jobs.filter((job) => getStatus(job) === "Published").length,
    [jobs]
  );

  const pendingJobs = useMemo(
    () => jobs.filter((job) => getStatus(job) === "Pending Review").length,
    [jobs]
  );

  const totalCompanies = useMemo(
    () =>
      new Set(
        jobs
          .map((job) => job.company?.trim())
          .filter((company): company is string => Boolean(company))
      ).size,
    [jobs]
  );

  async function publishJob(job: ImportedJob) {
    if (publishingJobId) {
      return;
    }

    try {
      setPublishingJobId(job.id);

      const liveJobReference = doc(db, "jobs", job.id);
      const importedJobReference = doc(db, "importedJobs", job.id);

      await setDoc(
        liveJobReference,
        {
          company: job.company || "",
          role: job.role || "",
          location: job.location || "",
          experience: job.experience || "",
          education: job.education || "",
          salary: job.salary || "",
          skills: job.skills || [],
          requiredSkills: job.requiredSkills || [],
          eligibility: job.eligibility || "",
          responsibilities: job.responsibilities || "",
          benefits: job.benefits || "",
          selectionProcess: job.selectionProcess || "",
          description: job.description || "",
          applyLink: job.applyLink || "",
          logo: job.logo || "",
          category: job.category || "experienced",
          jobType: job.jobType || "private",
          applicationMode: job.applicationMode || "direct",
          lastDate: job.lastDate || "",
          source: job.source || "automatic-import",
          sourceJobId: job.sourceJobId || "",
          importedJobId: job.id,
          status: "published",
          isActive: true,
          createdAt: job.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          publishedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await updateDoc(importedJobReference, {
        status: "published",
        reviewStatus: "published",
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success(`${job.role || "Job"} published successfully.`);
    } catch (error) {
      console.error("Unable to publish job:", error);
      toast.error("Unable to publish this job. Please try again.");
    } finally {
      setPublishingJobId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Imported Jobs</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalJobs}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Pending Review</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{pendingJobs}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Published</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{publishedJobs}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Companies</p>
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
        <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Imported Jobs</h2>
            <p className="mt-1 text-sm text-gray-500">
              Imported jobs from company career portals.
            </p>
          </div>

          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search company, role or location"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Experience</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading && (
                <tr>
                  <td colSpan={6} className="py-16">
                    <div className="flex items-center justify-center gap-3 text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading imported jobs...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && errorMessage && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center font-medium text-red-600"
                  >
                    {errorMessage}
                  </td>
                </tr>
              )}

              {!loading && !errorMessage && filteredJobs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
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
                  const status = getStatus(job);
                  const isPublishing = publishingJobId === job.id;
                  const isPublished = status === "Published";

                  return (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-semibold text-gray-900">
                        {job.company || "Not available"}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {job.role || "Not available"}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {job.location || "Not available"}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {job.experience || "Not specified"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            isPublished
                              ? "bg-green-100 text-green-700"
                              : status === "Pending Review"
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
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>

                          <button
                            type="button"
                            onClick={() => publishJob(job)}
                            disabled={isPublished || isPublishing}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                          >
                            {isPublishing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Publishing
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