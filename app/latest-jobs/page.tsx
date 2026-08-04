"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  GraduationCap,
  IndianRupee,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
} from "firebase/firestore";

import { db } from "../../lib/firebase";
import Footer from "@/components/Footer";

type Job = {
  id: string;
  company: string;
  companyLogo: string;
  companyImage: string;
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
  applicationMode: {
    directApply: boolean;
    referral: boolean;
  };
  workMode: string;
  createdAt?: Timestamp | null;
};

type ExperienceFilter =
  | "all"
  | "freshers"
  | "experienced"
  | "work-from-home"
  | "internship"
  | "walk-in";

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-");

function isGovernmentJob(type: string) {
  const normalizedType = normalize(type);

  return (
    normalizedType === "government" ||
    normalizedType === "government-job" ||
    normalizedType === "government-jobs" ||
    normalizedType === "govt" ||
    normalizedType === "govt-job" ||
    normalizedType === "govt-jobs" ||
    normalizedType.includes("government") ||
    normalizedType.startsWith("govt")
  );
}

function categoryToFilter(category: string): ExperienceFilter {
  const value = normalize(category);

  if (["fresher", "freshers"].includes(value)) return "freshers";
  if (["experienced", "experience"].includes(value)) return "experienced";
  if (["freshers-experienced", "fresher-experienced", "both"].includes(value))
    return "all";
  if (["work-from-home", "wfh", "remote"].includes(value))
    return "work-from-home";
  if (["intern", "internship", "internships"].includes(value))
    return "internship";
  if (
    [
      "walk-in",
      "walkin",
      "walk-in-drive",
      "walk-in-drives",
      "walkin-drive",
      "walkin-drives",
    ].includes(value)
  )
    return "walk-in";

  return "all";
}

function parseExperienceNumbers(
  experience: string
): {
  minimum: number | null;
  maximum: number | null;
} {
  const value = experience
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-");

  const rangeMatch = value.match(
    /\b(\d+)\s*(?:-|to)\s*(\d+)\s*years?\b/
  );

  if (rangeMatch) {
    return {
      minimum: Number(rangeMatch[1]),
      maximum: Number(rangeMatch[2]),
    };
  }

  const plusMatch = value.match(
    /\b(\d+)\s*\+\s*years?\b/
  );

  if (plusMatch) {
    return {
      minimum: Number(plusMatch[1]),
      maximum: null,
    };
  }

  const singleMatch = value.match(
    /\b(\d+)\s*years?\b/
  );

  if (singleMatch) {
    const years = Number(singleMatch[1]);

    return {
      minimum: years,
      maximum: years,
    };
  }

  return {
    minimum: null,
    maximum: null,
  };
}

function isRemoteJob(job: Job): boolean {
  const category = normalize(job.category);
  const workMode = normalize(job.workMode);
  const location = job.location.toLowerCase();
  const role = job.role.toLowerCase();

  return (
    ["work-from-home", "wfh", "remote"].includes(
      category
    ) ||
    [
      "work-from-home",
      "wfh",
      "remote",
      "fully-remote",
      "home-based",
    ].includes(workMode) ||
    location.includes("remote") ||
    location.includes("work from home") ||
    location.includes("home based") ||
    role.includes("work from home") ||
    role.includes("remote")
  );
}

function isFresherJob(job: Job): boolean {
  const category = normalize(job.category);
  const experience = job.experience
    .trim()
    .toLowerCase();

  if (
    [
      "fresher",
      "freshers",
      "freshers-experienced",
      "fresher-experienced",
      "both",
    ].includes(category)
  ) {
    return true;
  }

  if (
    experience.includes("fresh") ||
    experience.includes("entry level") ||
    experience.includes("entry-level") ||
    experience.includes("graduate")
  ) {
    return true;
  }

  const { minimum, maximum } =
    parseExperienceNumbers(job.experience);

  return (
    minimum === 0 ||
    (minimum !== null &&
      maximum !== null &&
      maximum <= 2)
  );
}

function isExperiencedJob(
  job: Job
): boolean {
  const category = normalize(job.category);
  const experience = job.experience
    .trim()
    .toLowerCase();

  if (
    [
      "experienced",
      "experience",
      "freshers-experienced",
      "fresher-experienced",
      "both",
    ].includes(category)
  ) {
    return true;
  }

  if (
    experience.includes("experienced") ||
    experience.includes(
      "relevant experience"
    )
  ) {
    return true;
  }

  const { minimum, maximum } =
    parseExperienceNumbers(job.experience);

  // 0-2 year roles must appear in both lists.
  if (
    minimum === 0 &&
    maximum !== null &&
    maximum >= 2
  ) {
    return true;
  }

  return (
    (minimum !== null && minimum >= 1) ||
    (maximum !== null && maximum >= 2)
  );
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

function uniqueSkills(...skillGroups: string[][]): string[] {
  const seen = new Set<string>();

  return skillGroups.flat().filter((skill) => {
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

function LatestJobsContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const urlType = searchParams.get("type") ?? "";
  const urlCategory = searchParams.get("category") ?? "";
  const urlSearchText = searchParams.get("search") ?? "";

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchText, setSearchText] = useState(urlSearchText);
  const [experienceFilter, setExperienceFilter] =
    useState<ExperienceFilter>(() => categoryToFilter(urlCategory));

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [popupMode, setPopupMode] = useState<"apply" | "referral" | null>(
    null
  );
  const [instagramOpened, setInstagramOpened] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    setSearchText(urlSearchText);
  }, [urlSearchText]);

  useEffect(() => {
    setExperienceFilter(categoryToFilter(urlCategory));
  }, [urlCategory]);

  useEffect(() => {
    const jobsQuery = query(collection(db, "jobs"));

    const unsubscribe = onSnapshot(
      jobsQuery,
      (snapshot) => {
        const jobList: Job[] = snapshot.docs.map((document) => {
          const data = document.data();

          return {
            id: document.id,
            company: String(data.company ?? ""),
            companyLogo: String(data.companyLogo ?? ""),
            companyImage: String(data.companyImage ?? ""),
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
            workMode: String(data.workMode ?? ""),
            createdAt: data.createdAt ?? null,
          };
        });

        const latestJobsOnly = jobList.filter(
          (job) => !isGovernmentJob(job.type)
        );

        latestJobsOnly.sort((firstJob, secondJob) => {
          const firstTime = firstJob.createdAt?.toMillis?.() ?? 0;
          const secondTime = secondJob.createdAt?.toMillis?.() ?? 0;
          return secondTime - firstTime;
        });

        setJobs(latestJobsOnly);
        setLoading(false);
        setLoadError("");
      },
      (error) => {
        console.error("Unable to load jobs:", error);
        setLoadError("Unable to load jobs right now.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredJobs = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return jobs.filter((job) => {
      // Extra safety: Government jobs must never appear on Latest Jobs.
      if (isGovernmentJob(job.type)) {
        return false;
      }

      const searchableText = [
        job.company,
        job.role,
        job.location,
        job.experience,
        job.education,
        job.salary,
        job.type,
        job.category,
        ...job.primarySkills,
        ...job.requiredSkills,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        keyword === "" || searchableText.includes(keyword);

      const experienceText =
        job.experience.toLowerCase();
      const roleText =
        job.role.toLowerCase();
      const categoryText =
        normalize(job.category);

      const isRemote =
        isRemoteJob(job);

      const isIntern =
        [
          "intern",
          "internship",
          "internships",
        ].includes(categoryText) ||
        roleText.includes("intern") ||
        experienceText.includes("intern");

      const isWalkIn =
        [
          "walk-in",
          "walkin",
          "walk-in-drive",
          "walk-in-drives",
          "walkin-drive",
          "walkin-drives",
        ].includes(categoryText) ||
        roleText.includes("walk-in") ||
        roleText.includes("walk in");

      const isFresher =
        isFresherJob(job);

      const isExperienced =
        isExperiencedJob(job);

      let matchesFilter = true;

      if (
        experienceFilter === "freshers"
      ) {
        matchesFilter =
          isFresher && !isIntern;
      }

      if (
        experienceFilter ===
        "experienced"
      ) {
        matchesFilter =
          isExperienced && !isIntern;
      }

      if (
        experienceFilter ===
        "work-from-home"
      ) {
        matchesFilter = isRemote;
      }

      if (
        experienceFilter ===
        "internship"
      ) {
        matchesFilter = isIntern;
      }

      if (
        experienceFilter === "walk-in"
      ) {
        matchesFilter = isWalkIn;
      }

      const matchesType =
        !urlType || normalize(job.type) === normalize(urlType);

      return (
        matchesSearch &&
        matchesFilter &&
        matchesType
      );
    });
  }, [
    jobs,
    searchText,
    experienceFilter,
    urlType,
    urlCategory,
  ]);

  const visibleJobs = filteredJobs.slice(0, visibleCount);
  const hasMoreJobs = visibleCount < filteredJobs.length;

  useEffect(() => {
    setVisibleCount(12);
  }, [searchText, experienceFilter, urlType, urlCategory]);

  function updateUrl(filter: ExperienceFilter, search: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }

    if (filter === "all") {
      params.delete("category");
    } else {
      params.set("category", filter);
    }

    router.replace(
      params.toString() ? `${pathname}?${params.toString()}` : pathname,
      { scroll: false }
    );
  }

  function handleSearchChange(value: string) {
    setSearchText(value);
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl(experienceFilter, searchText);
  }

  function selectFilter(filter: ExperienceFilter) {
    setExperienceFilter(filter);
    updateUrl(filter, searchText);
  }

  function clearFilters() {
    setSearchText("");
    setExperienceFilter("all");

    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("category");
    params.delete("type");

    router.replace(
      params.toString() ? `${pathname}?${params.toString()}` : pathname,
      { scroll: false }
    );
  }

  function openApplyPopup(job: Job) {
    setSelectedJob(job);
    setPopupMode("apply");
    setInstagramOpened(false);
  }

  function openReferralPopup(job: Job) {
    setSelectedJob(job);
    setPopupMode("referral");
    setInstagramOpened(false);
  }

  function closeActionPopup() {
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
    if (!instagramOpened || !selectedJob?.applyLink) return;

    window.open(
      selectedJob.applyLink,
      "_blank",
      "noopener,noreferrer"
    );

    closeActionPopup();
  }

  function continueToReferral() {
    if (!instagramOpened || !selectedJob) return;

    const jobId = encodeURIComponent(selectedJob.id);
    closeActionPopup();
    router.push(`/referral?jobId=${jobId}`);
  }

  const hasActiveFilters =
    searchText.trim() !== "" ||
    experienceFilter !== "all" ||
    urlType !== "" ||
    urlCategory !== "";

  const filterButtons: {
    label: string;
    value: ExperienceFilter;
  }[] = [
    { label: "All Jobs", value: "all" },
    { label: "Freshers", value: "freshers" },
    { label: "Experienced", value: "experienced" },
    { label: "Work From Home", value: "work-from-home" },
    { label: "Internships", value: "internship" },
    { label: "Walk-In Drives", value: "walk-in" },
  ];

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
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-3 sm:gap-4"
            >
              <Image
                src="/logo.png"
                alt="Corporate Jobs Network"
                width={58}
                height={58}
                priority
                className="h-12 w-12 shrink-0 rounded-xl object-contain sm:h-14 sm:w-14"
              />

              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold text-blue-700 sm:text-2xl">
                  Corporate Jobs Network
                </p>

                <p className="hidden text-sm text-slate-500 sm:block">
                  Verified Corporate Job Opportunities
                </p>
              </div>
            </Link>

            <Link
              href="/"
              className="shrink-0 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 sm:px-5"
            >
              <span className="sm:hidden">Home</span>
              <span className="hidden sm:inline">← Back to Home</span>
            </Link>
          </div>
        </header>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/70 bg-white/65 px-6 py-12 text-center shadow-xl shadow-blue-900/5 backdrop-blur-xl sm:px-10">
            <p className="font-bold uppercase tracking-[0.2em] text-blue-700">
              New Opportunities
            </p>

            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-5xl">
              Latest Jobs
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Search and explore the latest corporate jobs, fresher
              opportunities, internships and work-from-home roles.
            </p>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-xl shadow-indigo-900/5 backdrop-blur-xl sm:p-6">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <SlidersHorizontal className="h-5 w-5 text-blue-700" />
                Search and Filter
              </div>

              <form
                onSubmit={handleSearchSubmit}
                className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_auto]"
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={searchText}
                    onChange={(event) =>
                      handleSearchChange(event.target.value)
                    }
                    placeholder="Search company, role, location, skills, experience or education"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 text-sm font-bold text-white transition hover:bg-blue-800"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </button>
                )}
              </form>

              <div className="mt-5 flex flex-wrap gap-2">
                {filterButtons.map((filter) => {
                  const active = experienceFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => selectFilter(filter.value)}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                        active
                          ? "bg-blue-700 text-white shadow-sm"
                          : "border border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6 mt-8">
              <h2 className="text-2xl font-extrabold text-slate-900">
                Available Opportunities
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Loading jobs..."
                  : `${filteredJobs.length} ${
                      filteredJobs.length === 1 ? "job" : "jobs"
                    } found`}
              </p>
            </div>

            {loading && (
              <div className="flex min-h-72 items-center justify-center">
                <div className="flex items-center gap-3 text-slate-600">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
                  <span className="font-semibold">
                    Loading latest jobs...
                  </span>
                </div>
              </div>
            )}

            {!loading && loadError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="font-semibold text-red-700">{loadError}</p>
              </div>
            )}

            {!loading &&
              !loadError &&
              filteredJobs.length === 0 && (
                <div className="rounded-3xl border border-white/70 bg-white/75 p-12 text-center shadow-xl backdrop-blur-xl">
                  <BriefcaseBusiness className="mx-auto h-12 w-12 text-slate-400" />

                  <h3 className="mt-4 text-xl font-bold text-slate-900">
                    No matching jobs found
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Try another company, role, location or experience
                    filter.
                  </p>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-6 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}

            {!loading &&
              !loadError &&
              filteredJobs.length > 0 && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {visibleJobs.map((job) => (
                    <article
                      key={job.id}
                      className="group flex h-full flex-col rounded-3xl border border-white/80 bg-white/80 p-6 shadow-lg shadow-indigo-900/5 backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:border-blue-300 hover:shadow-2xl"
                    >
                      <div className="mb-5 flex items-start justify-between gap-4">
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
                                      ".logo-fallback"
                                    ) as HTMLElement | null;

                                  if (fallback) {
                                    fallback.style.display = "flex";
                                  }
                                }}
                              />
                            ) : null}

                            <div
                              className={`logo-fallback absolute inset-0 items-center justify-center ${
                                job.companyLogo ? "hidden" : "flex"
                              }`}
                            >
                              <Building2 className="h-6 w-6 text-blue-700" />
                            </div>
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-xl font-bold text-slate-900">
                              {job.company}
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

                      <h4 className="mb-5 text-lg font-bold leading-7 text-blue-700">
                        {job.role}
                      </h4>

                      <div className="flex-1 space-y-3 text-sm text-slate-700">
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                          <span>{job.location || "N/A"}</span>
                        </div>

                        <div className="flex items-start gap-3">
                          <BriefcaseBusiness className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                          <span>{job.experience || "N/A"}</span>
                        </div>

                        <div className="flex items-start gap-3">
                          <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                          <span>{job.education || "N/A"}</span>
                        </div>

                        <div className="flex items-start gap-3">
                          <IndianRupee className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                          <span>
                            {job.salary && !["n/a", "na"].includes(job.salary.trim().toLowerCase())
                              ? job.salary
                              : "Salary Not Disclosed"}
                          </span>
                        </div>

                        <div className="flex items-start gap-3">
                          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                          <span>
                            Last Date: {job.lastDate || "N/A"}
                          </span>
                        </div>

                        {(() => {
                          const allSkills = uniqueSkills(
                            job.primarySkills,
                            job.requiredSkills
                          );
                          const visibleSkills = allSkills.slice(0, 4);
                          const remainingSkills = allSkills.length - visibleSkills.length;

                          if (allSkills.length === 0) return null;

                          return (
                            <div className="pt-2">
                              <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                                Skills
                              </p>

                              <div className="flex flex-wrap gap-2">
                                {visibleSkills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
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
                          );
                        })()}
                      </div>

                      <div className="mt-7 grid gap-3">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="flex w-full items-center justify-center rounded-xl border border-blue-700 px-5 py-3 font-bold text-blue-700 transition hover:bg-blue-50"
                        >
                          View Details
                        </Link>

                        <div
                          className={`grid gap-3 ${
                            job.applicationMode.directApply &&
                            job.applicationMode.referral
                              ? "sm:grid-cols-2"
                              : "grid-cols-1"
                          }`}
                        >
                          {job.applicationMode.directApply && (
                            <button
                              type="button"
                              onClick={() => openApplyPopup(job)}
                              className="w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800"
                            >
                              Direct Apply
                            </button>
                          )}

                          {job.applicationMode.referral && (
                            <button
                              type="button"
                              onClick={() => openReferralPopup(job)}
                              className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700"
                            >
                              Request Referral
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

            {!loading && !loadError && hasMoreJobs && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + 12)}
                  className="rounded-xl bg-blue-700 px-7 py-3 font-bold text-white transition hover:bg-blue-800"
                >
                  Load More Jobs
                </button>
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
          onClick={closeActionPopup}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
                  popupMode === "referral"
                    ? "bg-emerald-100"
                    : "bg-blue-100"
                }`}
              >
                {popupMode === "referral" ? "🤝" : "🚀"}
              </div>

              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                {popupMode === "referral"
                  ? "Before Requesting Referral"
                  : "Before You Apply"}
              </h2>

              <p className="mt-3 text-gray-600">
                Follow Corporate Jobs Network on Instagram, then continue to
                {popupMode === "referral"
                  ? " submit your referral request."
                  : " open the official application link."}
              </p>

              <div className="mt-6 rounded-xl bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-100 p-4 text-left">
                <p className="text-sm font-bold text-blue-700">
                  {selectedJob.company}
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {selectedJob.role}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedJob.location}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={openInstagram}
                  className="w-full rounded-xl bg-pink-600 px-5 py-3 font-bold text-white transition hover:bg-pink-700"
                >
                  📷 Follow on Instagram
                </button>

                {popupMode === "apply" ? (
                  <button
                    type="button"
                    onClick={openApplicationLink}
                    disabled={!instagramOpened || !selectedJob.applyLink}
                    className="w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-400"
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
                    className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {instagramOpened
                      ? "Continue to Referral"
                      : "Follow First to Continue"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeActionPopup}
                  className="w-full rounded-xl border border-gray-300 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>

              <p className="mt-4 text-xs leading-5 text-gray-500">
                Click the Instagram button first, then return to this page to
                continue.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function LatestJobsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-100">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
            <span className="font-semibold">Loading latest jobs...</span>
          </div>
        </main>
      }
    >
      <LatestJobsContent />
    </Suspense>
  );
}