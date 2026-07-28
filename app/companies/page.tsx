"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import {
  Building2,
  BriefcaseBusiness,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type JobRecord = {
  id: string;
  company: string;
  companyLogo: string;
  role: string;
  location: string;
  type: string;
  status: string;
  category: string;
  createdAt: number;
};

type CompanyRecord = {
  name: string;
  companyLogo: string;
  totalJobs: number;
  activeJobs: number;
  locations: string[];
  latestJobId: string;
  latestJobType: string;
  latestCreatedAt: number;
};

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

function isActiveStatus(status: string): boolean {
  const normalizedStatus = status.toLowerCase().trim();

  if (!normalizedStatus) {
    return true;
  }

  return !["closed", "inactive", "expired", "draft"].includes(
    normalizedStatus
  );
}

function getCompanyInitials(companyName: string): string {
  return companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function getJobDetailsLink(company: CompanyRecord): string {
  if (
    company.latestJobType.toLowerCase().trim() === "government"
  ) {
    return `/government-jobs/${company.latestJobId}`;
  }

  return `/latest-jobs`;
}

export default function CompaniesPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(collection(db, "jobs"));

        const fetchedJobs = snapshot.docs
          .map((jobDocument): JobRecord => {
            const data = jobDocument.data();

            return {
              id: jobDocument.id,
              company: normalize(
                data.company ?? data.organization
              ),
              role: normalize(
                data.role ?? data.title ?? data.postName
              ),
              location: normalize(data.location),
              type: normalize(data.type),
              status: normalize(data.status),
              category: normalize(data.category),
              companyLogo: normalize(data.companyLogo),
              createdAt: getCreatedAtValue(data.createdAt),
            };
          })
          .filter(
            (job) => Boolean(job.company) && Boolean(job.role)
          )
          .sort(
            (firstJob, secondJob) =>
              secondJob.createdAt - firstJob.createdAt
          );

        setJobs(fetchedJobs);
      } catch (fetchError) {
        console.error("Companies fetch error:", fetchError);

        setError(
          "Unable to load companies. Please check Firebase and try again."
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchJobs();
  }, []);

  const companies = useMemo(() => {
    const companyMap = new Map<string, CompanyRecord>();

    jobs.forEach((job) => {
      const companyKey = job.company.toLowerCase().trim();
      const currentCompany = companyMap.get(companyKey);

      const jobLocations = job.location
        .split(",")
        .map((location) => location.trim())
        .filter(Boolean);

      if (!currentCompany) {
        companyMap.set(companyKey, {
          name: job.company,
          companyLogo: job.companyLogo || "",
          totalJobs: 1,
          activeJobs: isActiveStatus(job.status) ? 1 : 0,
          locations: Array.from(new Set(jobLocations)),
          latestJobId: job.id,
          latestJobType: job.type,
          latestCreatedAt: job.createdAt,
        });

        return;
      }

      currentCompany.totalJobs += 1;

      if (!currentCompany.companyLogo && job.companyLogo) {
        currentCompany.companyLogo = job.companyLogo;
      }

      if (isActiveStatus(job.status)) {
        currentCompany.activeJobs += 1;
      }

      currentCompany.locations = Array.from(
        new Set([
          ...currentCompany.locations,
          ...jobLocations,
        ])
      );

      if (job.createdAt > currentCompany.latestCreatedAt) {
        currentCompany.latestJobId = job.id;
        currentCompany.latestJobType = job.type;
        currentCompany.latestCreatedAt = job.createdAt;
      }
    });

    return Array.from(companyMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [jobs]);

  const filteredCompanies = useMemo(() => {
    const search = activeSearch.toLowerCase().trim();

    if (!search) {
      return companies;
    }

    return companies.filter((company) => {
      const searchableText = [
        company.name,
        ...company.locations,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [companies, activeSearch]);

  const totalActiveJobs = useMemo(
    () =>
      companies.reduce(
        (total, company) => total + company.activeJobs,
        0
      ),
    [companies]
  );

  const handleSearch = (
    event?: FormEvent<HTMLFormElement>
  ) => {
    event?.preventDefault();
    setActiveSearch(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveSearch("");
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-bold uppercase tracking-[0.18em] text-blue-100">
            <Building2 size={18} />
            Hiring Companies
          </span>

          <h1 className="mt-6 text-4xl font-extrabold sm:text-5xl">
            Explore Companies Hiring Now
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">
            Discover companies and government organizations with
            active opportunities across India.
          </p>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-3xl font-extrabold text-blue-200">
                {loading ? "..." : companies.length}
              </p>

              <p className="mt-1 text-sm text-slate-200">
                Companies & Organizations
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-3xl font-extrabold text-blue-200">
                {loading ? "..." : totalActiveJobs}
              </p>

              <p className="mt-1 text-sm text-slate-200">
                Active Opportunities
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <form
            onSubmit={handleSearch}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-7"
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
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
                  placeholder="Search company or location..."
                  className="h-14 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="flex h-14 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 font-bold text-white transition hover:bg-blue-800"
              >
                <Search size={20} />
                Search
              </button>
            </div>

            {activeSearch && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-sm font-bold text-blue-700 hover:text-blue-900"
                >
                  Clear search
                </button>
              </div>
            )}
          </form>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
                Company Directory
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                Companies With Open Jobs
              </h2>
            </div>

            {!loading && !error && (
              <p className="font-medium text-slate-600">
                {filteredCompanies.length}{" "}
                {filteredCompanies.length === 1
                  ? "company found"
                  : "companies found"}
              </p>
            )}
          </div>

          {loading && (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white">
              <Loader2
                size={42}
                className="animate-spin text-blue-700"
              />

              <p className="mt-4 font-medium text-slate-600">
                Loading companies...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-14 text-center">
              <h3 className="text-xl font-bold text-red-700">
                Unable to load companies
              </h3>

              <p className="mt-2 text-red-600">{error}</p>
            </div>
          )}

          {!loading &&
            !error &&
            filteredCompanies.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <Building2
                  size={48}
                  className="mx-auto text-slate-400"
                />

                <h3 className="mt-5 text-2xl font-bold text-slate-900">
                  No Companies Found
                </h3>

                <p className="mt-3 text-slate-600">
                  Try searching with another company name or
                  location.
                </p>
              </div>
            )}

          {!loading &&
            !error &&
            filteredCompanies.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredCompanies.map((company) => (
                  <article
                    key={company.name.toLowerCase()}
                    className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {company.companyLogo ? <img src={company.companyLogo} alt={`${company.name} logo`} className="max-h-10 max-w-10 object-contain" onError={(e)=>{e.currentTarget.style.display="none"; const f=e.currentTarget.parentElement?.querySelector(".logo-fallback") as HTMLElement|null; if(f) f.style.display="flex";}}/>:null}
                        <div className={`logo-fallback absolute inset-0 items-center justify-center ${company.companyLogo?"hidden":"flex"}`}>
                          <Building2 className="h-8 w-8 text-blue-700"/>
                        </div>
                      </div>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        {company.activeJobs} Active
                      </span>
                    </div>

                    <h3 className="mt-6 text-2xl font-extrabold text-slate-900">
                      {company.name}
                    </h3>

                    <div className="mt-5 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center gap-3">
                        <BriefcaseBusiness
                          size={18}
                          className="shrink-0 text-blue-700"
                        />

                        <span>
                          {company.totalJobs}{" "}
                          {company.totalJobs === 1
                            ? "job posted"
                            : "jobs posted"}
                        </span>
                      </div>

                      {company.locations.length > 0 && (
                        <div className="flex items-start gap-3">
                          <MapPin
                            size={18}
                            className="mt-0.5 shrink-0 text-blue-700"
                          />

                          <span className="line-clamp-2">
                            {company.locations
                              .slice(0, 4)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    <Link
                      href={getJobDetailsLink(company)}
                      className="mt-7 flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 font-bold text-white transition hover:bg-blue-800"
                    >
                      View Jobs
                      <ExternalLink size={18} />
                    </Link>
                  </article>
                ))}
              </div>
            )}
        </div>
      </section>

      <Footer />
    </main>
  );
}