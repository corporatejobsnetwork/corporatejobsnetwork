"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  GraduationCap,
  IndianRupee,
  Loader2,
  MapPin,
  Search,
  X,
} from "lucide-react";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

import { db } from "../../lib/firebase";
import Footer from "@/components/Footer";

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

type PopupMode = "apply" | "referral";

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-");
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
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
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatPostedDate(timestamp?: Timestamp | null): string {
  if (!timestamp) return "Recently";

  try {
    return timestamp.toDate().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}

function salaryText(value: string): string {
  const normalized = value.trim().toLowerCase();
  return value && !["n/a", "na", "not available"].includes(normalized)
    ? value
    : "Salary Not Disclosed";
}

function lastDateText(value: string): string {
  const normalized = value.trim().toLowerCase();
  return value && !["n/a", "na", "not available"].includes(normalized)
    ? value
    : "Not Mentioned";
}

export default function FreshersPage() {
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchText, setSearchText] = useState("");

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [popupMode, setPopupMode] = useState<PopupMode | null>(null);
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

          return {
            id: document.id,
            company: String(data.company ?? ""),
            companyLogo: String(data.companyLogo ?? ""),
            role: String(data.role ?? ""),
            location: String(data.location ?? ""),
            experience: String(data.experience ?? ""),
            education: String(data.education ?? "N/A"),
            salary: String(data.salary ?? "N/A"),
            lastDate: String(data.lastDate ?? "N/A"),
            applyLink: String(data.applyLink ?? ""),
            type: String(data.type ?? ""),
            category: String(data.category ?? ""),
            primarySkills: toStringArray(data.primarySkills),
            requiredSkills: toStringArray(data.requiredSkills),
            applicationMode: {
              directApply:
                typeof data.applicationMode?.directApply === "boolean"
                  ? data.applicationMode.directApply
                  : Boolean(data.applyLink),
              referral:
                typeof data.applicationMode?.referral === "boolean"
                  ? data.applicationMode.referral
                  : false,
            },
            createdAt:
              data.createdAt instanceof Timestamp ? data.createdAt : null,
          };
        });

        setJobs(jobList);
        setLoading(false);
        setLoadError("");
      },
      (error) => {
        console.error("Unable to load fresher jobs:", error);
        setLoadError("Unable to load fresher jobs right now.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const fresherJobs = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return jobs.filter((job) => {
      const type = normalize(job.type);
      const category = normalize(job.category);

      const isPrivate =
        !type ||
        type === "private" ||
        type === "private-job" ||
        type === "private-jobs";

      const isFresher = [
        "fresher",
        "freshers",
        "freshers-experienced",
        "fresher-experienced",
        "both",
      ].includes(category);

      const searchableText = [
        job.company,
        job.role,
        job.location,
        job.experience,
        job.education,
        job.salary,
        job.category,
        ...job.primarySkills,
        ...job.requiredSkills,
      ]
        .join(" ")
        .toLowerCase();

      return isPrivate && isFresher && (!keyword || searchableText.includes(keyword));
    });
  }, [jobs, searchText]);

  function openPopup(job: Job, mode: PopupMode) {
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

  function continueAction() {
    if (!instagramOpened || !selectedJob || !popupMode) return;

    if (popupMode === "apply") {
      if (!selectedJob.applyLink) return;
      window.open(selectedJob.applyLink, "_blank", "noopener,noreferrer");
      closePopup();
      return;
    }

    const jobId = encodeURIComponent(selectedJob.id);
    closePopup();
    router.push(`/referral?jobId=${jobId}`);
  }

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-100">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />
          <div className="absolute right-0 top-72 h-96 w-96 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="absolute bottom-24 left-1/3 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl" />
        </div>
        <div className="relative z-10">
        <header className="border-b border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Image
                src="/logo.png"
                alt="Corporate Jobs Network"
                width={58}
                height={58}
                priority
                className="h-11 w-11 shrink-0 rounded-xl object-contain sm:h-14 sm:w-14"
              />
              <div className="min-w-0">
                <p className="truncate text-base font-extrabold text-blue-700 sm:text-2xl">
                  Corporate Jobs Network
                </p>
                <p className="hidden text-sm text-slate-500 sm:block">
                  Verified Corporate Job Opportunities
                </p>
              </div>
            </Link>

            <Link
              href="/"
              className="shrink-0 rounded-xl bg-blue-700 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 sm:px-5"
            >
              <span className="sm:hidden">Home</span>
              <span className="hidden sm:inline">← Back to Home</span>
            </Link>
          </div>
        </header>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/70 bg-white/65 px-6 py-12 text-center shadow-xl shadow-blue-900/5 backdrop-blur-xl sm:px-10">
            <p className="font-bold uppercase tracking-[0.2em] text-blue-700">
              Start Your Career
            </p>

            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-5xl">
              Freshers Jobs
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Explore entry-level jobs for graduates, freshers and candidates
              with 0–1 years of experience.
            </p>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-xl shadow-indigo-900/5 backdrop-blur-xl sm:p-6">
              <label className="mb-3 block text-sm font-bold text-slate-800">
                Search Fresher Jobs
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search company, role, location, skills, education or salary"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-red-600"
                    aria-label="Clear search"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="mb-6 mt-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  Fresher Opportunities
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {loading
                    ? "Loading jobs..."
                    : `${fresherJobs.length} ${fresherJobs.length === 1 ? "job" : "jobs"} found`}
                </p>
              </div>
              <Link
                href="/latest-jobs"
                className="text-sm font-bold text-blue-700 transition hover:text-blue-900"
              >
                View all jobs →
              </Link>
            </div>

            {loading && (
              <div className="flex min-h-72 items-center justify-center">
                <div className="flex items-center gap-3 text-slate-600">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
                  <span className="font-semibold">Loading fresher jobs...</span>
                </div>
              </div>
            )}

            {!loading && loadError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="font-semibold text-red-700">{loadError}</p>
              </div>
            )}

            {!loading && !loadError && fresherJobs.length === 0 && (
              <div className="rounded-3xl border border-white/70 bg-white/75 p-10 text-center shadow-xl backdrop-blur-xl sm:p-12">
                <BriefcaseBusiness className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  No fresher jobs found
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Try another company, role, location or skill.
                </p>
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="mt-6 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}

            {!loading && !loadError && fresherJobs.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {fresherJobs.map((job) => {
                  const skills = uniqueSkills(job.primarySkills, job.requiredSkills);
                  const visibleSkills = skills.slice(0, 4);
                  const remainingSkills = skills.length - visibleSkills.length;
                  const hasDirectApply =
                    job.applicationMode.directApply && Boolean(job.applyLink);
                  const hasReferral = job.applicationMode.referral;

                  return (
                    <article
                      key={job.id}
                      className="group flex h-full min-w-0 flex-col rounded-3xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-indigo-900/5 backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:border-blue-300 hover:shadow-2xl sm:p-6"
                    >
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                            {job.companyLogo ? (
                              <img
                                src={job.companyLogo}
                                alt={`${job.company} logo`}
                                className="max-h-8 max-w-8 object-contain"
                                onError={(event) => {
                                  const image = event.currentTarget;
                                  image.style.display = "none";

                                  const fallback =
                                    image.parentElement?.querySelector(
                                      ".fresher-logo-fallback"
                                    ) as HTMLElement | null;

                                  if (fallback) {
                                    fallback.style.display = "flex";
                                  }
                                }}
                              />
                            ) : null}

                            <div
                              className={`fresher-logo-fallback absolute inset-0 items-center justify-center ${
                                job.companyLogo ? "hidden" : "flex"
                              }`}
                            >
                              <Building2 className="h-6 w-6 text-blue-700" />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <h3 className="break-words text-lg font-bold text-slate-900 sm:text-xl">
                              {job.company || "Company Not Mentioned"}
                            </h3>
                            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Posted {formatPostedDate(job.createdAt)}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          Active
                        </span>
                      </div>

                      <h4 className="mb-5 break-words text-lg font-bold leading-7 text-blue-700">
                        {job.role || "Role Not Mentioned"}
                      </h4>

                      <div className="flex-1 space-y-3 text-sm text-slate-700">
                        <InfoRow icon={<MapPin />} text={job.location || "N/A"} />
                        <InfoRow
                          icon={<BriefcaseBusiness />}
                          text={job.experience || "Freshers"}
                        />
                        <InfoRow
                          icon={<GraduationCap />}
                          text={job.education || "N/A"}
                        />
                        <InfoRow icon={<IndianRupee />} text={salaryText(job.salary)} />
                        <InfoRow
                          icon={<CalendarDays />}
                          text={`Last Date: ${lastDateText(job.lastDate)}`}
                        />

                        {skills.length > 0 && (
                          <div className="pt-2">
                            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                              Skills
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {visibleSkills.map((skill) => (
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
                          className="flex min-h-12 w-full items-center justify-center rounded-xl border border-blue-700 px-5 py-3 text-center font-bold text-blue-700 transition hover:bg-blue-50"
                        >
                          View Details
                        </Link>

                        {(hasDirectApply || hasReferral) && (
                          <div
                            className={`grid gap-3 ${
                              hasDirectApply && hasReferral ? "sm:grid-cols-2" : "grid-cols-1"
                            }`}
                          >
                            {hasDirectApply && (
                              <button
                                type="button"
                                onClick={() => openPopup(job, "apply")}
                                className="min-h-12 w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white transition hover:bg-blue-800"
                              >
                                Direct Apply
                              </button>
                            )}

                            {hasReferral && (
                              <button
                                type="button"
                                onClick={() => openPopup(job, "referral")}
                                className="min-h-12 w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-700"
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
          </div>
        </section>
        </div>
      </main>

      <Footer />

      {selectedJob && popupMode && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={closePopup}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
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
                <p className="break-words text-sm font-bold text-blue-700">
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

                <button
                  type="button"
                  onClick={continueAction}
                  disabled={
                    !instagramOpened ||
                    (popupMode === "apply" && !selectedJob.applyLink)
                  }
                  className={`min-h-12 w-full rounded-xl px-5 py-3 font-bold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400 ${
                    popupMode === "referral"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-blue-700 hover:bg-blue-800"
                  }`}
                >
                  {!instagramOpened
                    ? "Follow First to Continue"
                    : popupMode === "referral"
                      ? "Continue to Referral"
                      : selectedJob.applyLink
                        ? "Open Application Link"
                        : "Application Link Not Available"}
                </button>

                <button
                  type="button"
                  onClick={closePopup}
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Instagram follow cannot be automatically verified. Click Instagram first, then return to continue.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 shrink-0 text-slate-400 [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </span>
      <span className="min-w-0 break-words leading-6">{text}</span>
    </div>
  );
}