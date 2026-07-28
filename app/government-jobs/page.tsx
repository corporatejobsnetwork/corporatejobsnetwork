"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ExternalLink,
  GraduationCap,
  IndianRupee,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type GovernmentJob = {
  id: string;
  company: string;
  role: string;
  type: string;
  category: string;
  location: string;
  qualification: string;
  experience: string;
  salary: string;
  lastDate: string;
  applyLink: string;
  description: string;
  createdAt: number;
};

const INSTAGRAM_URL =
  "https://www.instagram.com/corporatejobsnetwork/";

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

function getCreatedAtValue(value: unknown): number {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    return (value as { seconds: number }).seconds * 1000;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function formatCategory(category: string): string {
  if (!category) {
    return "Government";
  }

  return category
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function GovernmentJobsPage() {
  const [jobs, setJobs] = useState<GovernmentJob[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeCategory, setActiveCategory] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedJob, setSelectedJob] =
    useState<GovernmentJob | null>(null);

  const [applicationUnlocked, setApplicationUnlocked] =
    useState(false);

  const closeApplyPopup = () => {
    setSelectedJob(null);
    setApplicationUnlocked(false);
  };

  useEffect(() => {
    const fetchGovernmentJobs = async () => {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(collection(db, "jobs"));

        const fetchedJobs = snapshot.docs
          .map((jobDocument): GovernmentJob => {
            const data = jobDocument.data();

            return {
              id: jobDocument.id,
              company: normalize(
                data.company ?? data.organization
              ),
              role: normalize(data.role ?? data.title),
              type: normalize(data.type),
              category: normalize(data.category),
              location: normalize(data.location),
              qualification: normalize(data.qualification),
              experience: normalize(data.experience),
              salary: normalize(data.salary),
              lastDate: normalize(
                data.lastDate ?? data.applicationLastDate
              ),
              applyLink: normalize(
                data.applyLink ?? data.applicationLink
              ),
              description: normalize(data.description),
              createdAt: getCreatedAtValue(data.createdAt),
            };
          })
          .filter((job) => {
            const isGovernment =
              job.type.toLowerCase().trim() === "government";

            const hasRequiredData =
              Boolean(job.company) && Boolean(job.role);

            return isGovernment && hasRequiredData;
          })
          .sort(
            (firstJob, secondJob) =>
              secondJob.createdAt - firstJob.createdAt
          );

        setJobs(fetchedJobs);
      } catch (fetchError) {
        console.error(
          "Government jobs fetch error:",
          fetchError
        );

        setError(
          "Unable to load government jobs. Please check Firebase and try again."
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchGovernmentJobs();
  }, []);

  useEffect(() => {
    if (!selectedJob) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeApplyPopup();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedJob]);

  const availableCategories = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) =>
            job.category.toLowerCase().trim()
          )
          .filter(Boolean)
      )
    ).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const search = activeSearch.toLowerCase().trim();

    return jobs.filter((job) => {
      const searchableText = [
        job.company,
        job.role,
        job.location,
        job.qualification,
        job.experience,
        job.salary,
        job.category,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search === "" || searchableText.includes(search);

      const matchesCategory =
        activeCategory === "all" ||
        job.category.toLowerCase().trim() ===
          activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [jobs, activeSearch, activeCategory]);

  const handleSearch = (
    event?: FormEvent<HTMLFormElement>
  ) => {
    event?.preventDefault();

    setActiveSearch(searchInput);
    setActiveCategory(selectedCategory);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setActiveSearch("");
    setSelectedCategory("all");
    setActiveCategory("all");
  };

  const openApplyPopup = (job: GovernmentJob) => {
    setSelectedJob(job);

    const unlocked =
      window.localStorage.getItem(
        "governmentApplicationUnlocked"
      ) === "true";

    setApplicationUnlocked(unlocked);
  };

  const handleFollowAndUnlock = () => {
    window.open(
      INSTAGRAM_URL,
      "_blank",
      "noopener,noreferrer"
    );

    window.localStorage.setItem(
      "governmentApplicationUnlocked",
      "true"
    );

    setApplicationUnlocked(true);
  };

  const handleOpenApplication = () => {
    if (!selectedJob?.applyLink) {
      return;
    }

    window.open(
      selectedJob.applyLink,
      "_blank",
      "noopener,noreferrer"
    );

    closeApplyPopup();
  };

  const scrollToJobs = () => {
    document
      .getElementById("government-jobs-search")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <section
        className="relative flex min-h-[78vh] items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/vidhana-soudha.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/85 via-slate-950/70 to-blue-950/85" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-20 text-center text-white sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-100 backdrop-blur">
            <ShieldCheck size={18} />
            Government Opportunities
          </span>

          <h1 className="mt-7 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            Latest Government Jobs
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">
            Discover Central Government, State Government,
            Banking, Railway, Defence, Police, Teaching and
            PSU opportunities across India.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={scrollToJobs}
              className="rounded-xl bg-blue-600 px-8 py-3.5 font-semibold text-white shadow-lg transition hover:bg-blue-700"
            >
              Explore Jobs
            </button>

            <button
              type="button"
              onClick={scrollToJobs}
              className="rounded-xl border border-white/40 bg-white/10 px-8 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Latest Notifications
            </button>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <p className="text-3xl font-bold text-blue-300">
                {loading ? "..." : jobs.length}
              </p>

              <p className="mt-1 text-sm text-slate-200">
                Government Jobs
              </p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <p className="text-3xl font-bold text-blue-300">
                {loading
                  ? "..."
                  : availableCategories.length}
              </p>

              <p className="mt-1 text-sm text-slate-200">
                Job Categories
              </p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <p className="text-3xl font-bold text-blue-300">
                Daily
              </p>

              <p className="mt-1 text-sm text-slate-200">
                Verified Updates
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="government-jobs-search"
        className="scroll-mt-24 border-b border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
              Find Your Opportunity
            </p>

            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
              Search Government Jobs
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Search by organization, role, location,
              qualification or experience.
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-8"
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_280px_170px]">
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(event.target.value)
                  }
                  placeholder="Search organization, role, location..."
                  className="h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(event) =>
                  setSelectedCategory(event.target.value)
                }
                className="h-14 rounded-xl border border-slate-300 bg-white px-4 text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">
                  All Categories
                </option>

                {availableCategories.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {formatCategory(category)}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="flex h-14 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 font-semibold text-white transition hover:bg-blue-800"
              >
                <Search size={20} />
                Search
              </button>
            </div>

            {(activeSearch ||
              activeCategory !== "all") && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                >
                  Clear filters
                </button>
              </div>
            )}
          </form>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
                Current Openings
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Government Job Listings
              </h2>
            </div>

            {!loading && !error && (
              <p className="font-medium text-slate-600">
                {filteredJobs.length}{" "}
                {filteredJobs.length === 1
                  ? "job found"
                  : "jobs found"}
              </p>
            )}
          </div>

          {loading && (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white">
              <Loader2
                className="animate-spin text-blue-700"
                size={42}
              />

              <p className="mt-4 font-medium text-slate-600">
                Loading government jobs...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-16 text-center">
              <h3 className="text-xl font-bold text-red-700">
                Unable to load jobs
              </h3>

              <p className="mt-2 text-red-600">
                {error}
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            filteredJobs.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <Building2
                  className="mx-auto text-slate-400"
                  size={48}
                />

                <h3 className="mt-5 text-2xl font-bold text-slate-900">
                  No Government Jobs Found
                </h3>

                <p className="mx-auto mt-3 max-w-xl text-slate-600">
                  No jobs match your current search. Try
                  another keyword or category.
                </p>
              </div>
            )}

          {!loading &&
            !error &&
            filteredJobs.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredJobs.map((job) => (
                  <article
                    key={job.id}
                    className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-blue-700 to-indigo-500" />

                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                          <Building2 size={28} />
                        </div>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          {formatCategory(job.category)}
                        </span>
                      </div>

                      <div className="mt-5">
                        <p className="font-semibold text-blue-700">
                          {job.company}
                        </p>

                        <h3 className="mt-2 text-xl font-bold leading-snug text-slate-900">
                          {job.role}
                        </h3>
                      </div>

                      <div className="mt-6 space-y-3 text-sm text-slate-600">
                        {job.location && (
                          <div className="flex items-start gap-3">
                            <MapPin
                              className="mt-0.5 shrink-0 text-blue-700"
                              size={18}
                            />

                            <span>{job.location}</span>
                          </div>
                        )}

                        {job.qualification && (
                          <div className="flex items-start gap-3">
                            <GraduationCap
                              className="mt-0.5 shrink-0 text-blue-700"
                              size={18}
                            />

                            <span>
                              {job.qualification}
                            </span>
                          </div>
                        )}

                        {job.experience && (
                          <div className="flex items-start gap-3">
                            <BriefcaseBusiness
                              className="mt-0.5 shrink-0 text-blue-700"
                              size={18}
                            />

                            <span>{job.experience}</span>
                          </div>
                        )}

                        {job.salary && (
                          <div className="flex items-start gap-3">
                            <IndianRupee
                              className="mt-0.5 shrink-0 text-blue-700"
                              size={18}
                            />

                            <span>{job.salary}</span>
                          </div>
                        )}

                        {job.lastDate && (
                          <div className="flex items-start gap-3">
                            <CalendarDays
                              className="mt-0.5 shrink-0 text-red-600"
                              size={18}
                            />

                            <span>
                              Last date:{" "}
                              <strong className="text-slate-800">
                                {job.lastDate}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>

                      {job.description && (
                        <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-600">
                          {job.description}
                        </p>
                      )}

                      <div className="mt-auto grid grid-cols-2 gap-3 pt-7">
                        <Link
                          href={`/government-jobs/${job.id}`}
                          className="rounded-xl border border-blue-700 px-4 py-3 text-center font-semibold text-blue-700 transition hover:bg-blue-50"
                        >
                          View Details
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            openApplyPopup(job)
                          }
                          className="rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800"
                        >
                          Apply Now
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
        </div>
      </section>

      {selectedJob && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeApplyPopup();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-popup-title"
            className="relative w-full max-w-[500px] overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <button
              type="button"
              onClick={closeApplyPopup}
              aria-label="Close application popup"
              className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
            >
              <X size={20} />
            </button>

            <div className="p-6 sm:p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl">
                🚀
              </div>

              <div className="mt-5 text-center">
                <h2
                  id="apply-popup-title"
                  className="text-3xl font-extrabold text-slate-950"
                >
                  Before You Apply
                </h2>

                <p className="mx-auto mt-3 max-w-md text-base leading-7 text-slate-600">
                  Follow Corporate Jobs Network on Instagram to unlock
                  the official application link.
                </p>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                <p className="font-bold text-blue-700">
                  {selectedJob.company}
                </p>

                <p className="mt-1 text-lg font-extrabold text-slate-950">
                  {selectedJob.role}
                </p>

                {selectedJob.location && (
                  <p className="mt-1 text-slate-600">
                    {selectedJob.location}
                  </p>
                )}
              </div>

              {!selectedJob.applyLink ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
                  <p className="font-semibold text-amber-800">
                    Application link is not available yet.
                  </p>

                  <p className="mt-2 text-sm text-amber-700">
                    Please check again later for the official
                    application link.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleFollowAndUnlock}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-5 py-4 text-lg font-extrabold text-white transition hover:bg-pink-700"
                  >
                    <InstagramIcon size={21} />
                    Follow on Instagram
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenApplication}
                    disabled={!applicationUnlocked}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-4 text-lg font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {applicationUnlocked
                      ? "Open Application Link"
                      : "🔒 Follow First to Unlock Application Link"}

                    {applicationUnlocked && (
                      <ExternalLink size={19} />
                    )}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={closeApplyPopup}
                className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-4 text-lg font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <p className="mt-5 text-center text-xs leading-5 text-slate-500">
                Click Follow on Instagram first. Then return here and
                open the official application link.
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}