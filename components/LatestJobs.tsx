"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  GraduationCap,
  IndianRupee,
  Loader2,
  MapPin,
  Send,
  ArrowRight,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type ApplicationMode = {
  directApply: boolean;
  referral: boolean;
};

type Job = {
  id: string;
  company: string;
  companyLogo: string;
  role: string;
  location: string;
  experience: string;
  education: string;
  salary: string;
  lastDate: string;
  applyLink: string;
  type: string;
  category: string;
  primarySkills: string[];
  requiredSkills: string[];
  applicationMode: ApplicationMode;
  createdAt?: Timestamp | null;
};

type PopupMode = "apply" | "referral" | null;

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-");
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function uniqueSkills(...groups: string[][]): string[] {
  const seen = new Set<string>();

  return groups.flat().filter((skill) => {
    const key = skill.trim().toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isGovernmentJob(job: Job): boolean {
  const type = normalize(job.type);

  return (
    type === "government" ||
    type === "government-job" ||
    type === "government-jobs" ||
    type === "govt" ||
    type === "govt-job" ||
    type === "govt-jobs" ||
    type.includes("government") ||
    type.startsWith("govt")
  );
}

function salaryLabel(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!value.trim() || ["na", "n/a", "not available"].includes(normalized)) {
    return "Salary Not Disclosed";
  }

  return value;
}

function lastDateLabel(value: string): string {
  if (!value.trim() || ["na", "n/a"].includes(value.trim().toLowerCase())) {
    return "Not Mentioned";
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LatestJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [popupMode, setPopupMode] = useState<PopupMode>(null);
  const [instagramOpened, setInstagramOpened] = useState(false);

  useEffect(() => {
    const jobsQuery = query(
      collection(db, "jobs"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      jobsQuery,
      (snapshot) => {
        const jobList: Job[] = snapshot.docs.map((document) => {
          const data = document.data();

          const directApply =
            typeof data.applicationMode?.directApply === "boolean"
              ? data.applicationMode.directApply
              : Boolean(data.applyLink);

          const referral =
            typeof data.applicationMode?.referral === "boolean"
              ? data.applicationMode.referral
              : false;

          return {
            id: document.id,
            company: String(data.company ?? ""),
            companyLogo: String(data.companyLogo ?? ""),
            role: String(data.role ?? ""),
            location: String(data.location ?? ""),
            experience: String(data.experience ?? ""),
            education: String(data.education ?? ""),
            salary: String(data.salary ?? ""),
            lastDate: String(data.lastDate ?? ""),
            applyLink: String(data.applyLink ?? ""),
            type: String(data.type ?? ""),
            category: String(data.category ?? ""),
            primarySkills: toStringArray(data.primarySkills),
            requiredSkills: toStringArray(data.requiredSkills),
            applicationMode: {
              directApply,
              referral,
            },
            createdAt:
              data.createdAt instanceof Timestamp ? data.createdAt : null,
          };
        });

        const latestNonGovernmentJobs = jobList
          .filter((job) => {
            const hasRequiredDetails =
              job.company.trim() !== "" && job.role.trim() !== "";

            return hasRequiredDetails && !isGovernmentJob(job);
          })
          .slice(0, 6);

        setJobs(latestNonGovernmentJobs);
        setLoading(false);
        setLoadError("");
      },
      (error) => {
        console.error("Unable to load jobs:", error);
        setLoadError("Unable to load the latest jobs right now.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const visibleJobs = useMemo(() => jobs, [jobs]);

  function openPopup(job: Job, mode: Exclude<PopupMode, null>) {
    setSelectedJob(job);
    setPopupMode(mode);
    setInstagramOpened(false);
  }

  function closePopup() {
    setSelectedJob(null);
    setPopupMode(null);
    setInstagramOpened(false);
  }

  function openInstagram() {
    setInstagramOpened(true);

    window.open(
      "https://www.instagram.com/corporatejobsnetwork/",
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openApplicationLink() {
    if (!instagramOpened || !selectedJob?.applyLink) {
      return;
    }

    window.open(
      selectedJob.applyLink,
      "_blank",
      "noopener,noreferrer"
    );

    closePopup();
  }

  function continueToReferral() {
    if (!instagramOpened || !selectedJob) {
      return;
    }

    const jobId = encodeURIComponent(selectedJob.id);
    closePopup();
    window.location.href = `/referral?jobId=${jobId}`;
  }

  return (
    <>
      <section
        id="latest-jobs"
        className="relative overflow-hidden bg-transparent px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="inline-flex rounded-full border border-blue-200/70 bg-white/80 px-4 py-2 text-sm font-extrabold uppercase tracking-[0.14em] text-blue-700 shadow-sm backdrop-blur-md">
              New Opportunities
            </p>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Latest Jobs
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base lg:text-lg">
              Explore the newest private-sector opportunities added to Corporate
              Jobs Network.
            </p>
          </div>

          {loading && (
            <div className="flex min-h-60 items-center justify-center">
              <div className="flex items-center gap-3 text-slate-600">
                <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
                <span className="font-semibold">Loading latest jobs...</span>
              </div>
            </div>
          )}

          {!loading && loadError && (
            <div className="rounded-3xl border border-red-200/80 bg-red-50/85 p-8 text-center shadow-xl shadow-red-900/5 backdrop-blur-xl">
              <p className="font-semibold text-red-700">{loadError}</p>
            </div>
          )}

          {!loading && !loadError && visibleJobs.length === 0 && (
            <div className="rounded-3xl border border-white/70 bg-white/75 p-10 text-center shadow-xl shadow-blue-900/5 backdrop-blur-xl">
              <BriefcaseBusiness className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-xl font-bold text-slate-900">
                No jobs available
              </h3>
              <p className="mt-2 text-slate-500">
                New private opportunities will be added soon.
              </p>
            </div>
          )}

          {!loading && !loadError && visibleJobs.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-7">
              {visibleJobs.map((job) => {
                const allSkills = uniqueSkills(
                  job.primarySkills,
                  job.requiredSkills
                );
                const displayedSkills = allSkills.slice(0, 4);
                const remainingSkills = allSkills.length - displayedSkills.length;
                const hasBothActions =
                  job.applicationMode.directApply &&
                  job.applicationMode.referral;

                return (
                  <article
                    key={job.id}
                    className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-5 shadow-xl shadow-blue-900/5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-3 hover:border-blue-300 hover:bg-white/90 hover:shadow-2xl hover:shadow-blue-500/10 sm:p-6"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="mb-5 flex min-w-0 items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg ring-1 ring-blue-100 transition-transform duration-300 group-hover:scale-110">
                          {job.companyLogo ? (
                            <img
                              src={job.companyLogo}
                              alt={`${job.company} logo`}
                              className="max-h-9 max-w-9 object-contain"
                              onError={(event) => {
                                const image = event.currentTarget;
                                image.style.display = "none";

                                const fallback =
                                  image.parentElement?.querySelector(
                                    ".home-logo-fallback"
                                  ) as HTMLElement | null;

                                if (fallback) {
                                  fallback.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}

                          <div
                            className={`home-logo-fallback absolute inset-0 items-center justify-center ${
                              job.companyLogo ? "hidden" : "flex"
                            }`}
                          >
                            <Building2 className="h-6 w-6 text-blue-700" />
                          </div>
                        </div>

                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-extrabold text-slate-900 sm:text-xl">
                            {job.company}
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Posted on{" "}
                            {job.createdAt
                              ? job.createdAt.toDate().toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Recently"}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                        Active
                      </span>
                    </div>

                    <h4 className="mb-5 break-words text-xl font-extrabold leading-7 text-blue-700 transition group-hover:text-blue-800">
                      {job.role}
                    </h4>

                    <div className="flex-1 space-y-3 text-sm text-slate-700">
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                        <span className="break-words">
                          {job.location || "N/A"}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <BriefcaseBusiness className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                        <span className="break-words">
                          {job.experience || "N/A"}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                        <span className="break-words">
                          {job.education || "N/A"}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <IndianRupee className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                        <span className="break-words">
                          {salaryLabel(job.salary)}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                        <span className="break-words">
                          Last Date: {lastDateLabel(job.lastDate)}
                        </span>
                      </div>

                      {displayedSkills.length > 0 && (
                        <div className="pt-2">
                          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                            Skills
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {displayedSkills.map((skill) => (
                              <span
                                key={skill}
                                className="max-w-full break-words rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
                              >
                                {skill}
                              </span>
                            ))}

                            {remainingSkills > 0 && (
                              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                +{remainingSkills} More
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-7 grid gap-3">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-700 bg-white/60 px-5 py-3 text-center font-bold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md"
                      >
                        View Details
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>

                      {(job.applicationMode.directApply ||
                        job.applicationMode.referral) && (
                        <div
                          className={`grid gap-3 ${
                            hasBothActions ? "sm:grid-cols-2" : "grid-cols-1"
                          }`}
                        >
                          {job.applicationMode.directApply && (
                            <button
                              type="button"
                              onClick={() => openPopup(job, "apply")}
                              className="min-h-12 w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-md"
                            >
                              Direct Apply
                            </button>
                          )}

                          {job.applicationMode.referral && (
                            <button
                              type="button"
                              onClick={() => openPopup(job, "referral")}
                              className="min-h-12 w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md"
                            >
                              Request Referral
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && !loadError && visibleJobs.length > 0 && (
            <div className="mt-10 text-center">
              <Link
                href="/latest-jobs"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 px-7 py-3 font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-1 hover:shadow-xl"
              >
                View All Latest Jobs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {selectedJob && popupMode && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={closePopup}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/70 bg-white/95 p-5 shadow-2xl backdrop-blur-xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
                  popupMode === "referral" ? "bg-emerald-100" : "bg-blue-100"
                }`}
              >
                {popupMode === "referral" ? "🤝" : "🚀"}
              </div>

              <h2 className="mt-4 text-2xl font-bold text-slate-900">
                {popupMode === "referral"
                  ? "Before Requesting Referral"
                  : "Before You Apply"}
              </h2>

              <p className="mt-3 leading-6 text-slate-600">
                Follow Corporate Jobs Network on Instagram, then return here to
                {popupMode === "referral"
                  ? " continue with your referral request."
                  : " open the official application link."}
              </p>

              <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left">
                <p className="text-sm font-bold text-blue-700">
                  {selectedJob.company}
                </p>
                <p className="mt-1 break-words font-semibold text-slate-900">
                  {selectedJob.role}
                </p>
                <p className="mt-1 break-words text-sm text-slate-500">
                  {selectedJob.location}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={openInstagram}
                  className="min-h-12 w-full rounded-xl bg-pink-600 px-5 py-3 font-bold text-white transition hover:bg-pink-700"
                >
                  📷 Follow on Instagram
                </button>

                {popupMode === "apply" ? (
                  <button
                    type="button"
                    onClick={openApplicationLink}
                    disabled={!instagramOpened || !selectedJob.applyLink}
                    className="min-h-12 w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {instagramOpened
                      ? selectedJob.applyLink
                        ? "Open Application Link"
                        : "Application Link Not Available"
                      : "Follow First to Continue"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={continueToReferral}
                    disabled={!instagramOpened}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {instagramOpened ? "Continue to Referral" : "Follow First to Continue"}
                    {instagramOpened && <Send className="h-4 w-4" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={closePopup}
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Instagram following cannot be automatically verified. Click the
                Instagram button first, then return to continue.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}