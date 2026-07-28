"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  Home,
  Landmark,
  Loader2,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

type JobStats = {
  totalJobs: number;
  freshersJobs: number;
  experiencedJobs: number;
  privateJobs: number;
  governmentJobs: number;
  workFromHomeJobs: number;
  internshipJobs: number;
  referralJobs: number;
};

const defaultStats: JobStats = {
  totalJobs: 0,
  freshersJobs: 0,
  experiencedJobs: 0,
  privateJobs: 0,
  governmentJobs: 0,
  workFromHomeJobs: 0,
  internshipJobs: 0,
  referralJobs: 0,
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-");
}

function isGovernmentType(value: unknown): boolean {
  const type = normalize(value);

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

function isPrivateType(value: unknown): boolean {
  const type = normalize(value);

  if (!type) {
    return true;
  }

  return !isGovernmentType(type);
}

function isCategory(value: unknown, expectedCategory: string): boolean {
  return normalize(value) === normalize(expectedCategory);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export default function Stats() {
  const [stats, setStats] = useState<JobStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "jobs"),
      (snapshot) => {
        const nextStats: JobStats = { ...defaultStats };

        snapshot.docs.forEach((jobDocument) => {
          const data = jobDocument.data();

          const company = String(data.company ?? "").trim();
          const role = String(data.role ?? "").trim();

          if (!company || !role) {
            return;
          }

          const type = data.type;
          const category = data.category;
          const governmentJob = isGovernmentType(type);
          const privateJob = isPrivateType(type);

          nextStats.totalJobs += 1;

          if (privateJob) {
            nextStats.privateJobs += 1;
          }

          if (governmentJob) {
            nextStats.governmentJobs += 1;
          }

          if (isCategory(category, "freshers")) {
            nextStats.freshersJobs += 1;
          }

          if (isCategory(category, "experienced")) {
            nextStats.experiencedJobs += 1;
          }

          if (
            isCategory(category, "work-from-home") ||
            isCategory(category, "work from home") ||
            isCategory(category, "wfh")
          ) {
            nextStats.workFromHomeJobs += 1;
          }

          if (
            isCategory(category, "internship") ||
            isCategory(category, "internships")
          ) {
            nextStats.internshipJobs += 1;
          }

          const referralEnabled =
            typeof data.applicationMode?.referral === "boolean"
              ? data.applicationMode.referral
              : false;

          if (referralEnabled) {
            nextStats.referralJobs += 1;
          }
        });

        setStats(nextStats);
        setLoading(false);
        setLoadError("");
      },
      (error) => {
        console.error("Failed to load live job statistics:", error);
        setStats(defaultStats);
        setLoading(false);
        setLoadError("Unable to load live statistics right now.");
      }
    );

    return () => unsubscribe();
  }, []);

  const statItems = useMemo(
    () => [
      {
        label: "Total Jobs",
        description: "All active opportunities",
        value: stats.totalJobs,
        icon: BriefcaseBusiness,
        iconClass: "bg-blue-50 text-blue-700",
        borderClass: "hover:border-blue-300",
        accentClass: "from-blue-600 via-sky-500 to-cyan-400",
      },
      {
        label: "Freshers Jobs",
        description: "Entry-level opportunities",
        value: stats.freshersJobs,
        icon: GraduationCap,
        iconClass: "bg-emerald-50 text-emerald-700",
        borderClass: "hover:border-emerald-300",
        accentClass: "from-emerald-600 via-green-500 to-lime-400",
      },
      {
        label: "Experienced Jobs",
        description: "Roles for professionals",
        value: stats.experiencedJobs,
        icon: Users,
        iconClass: "bg-indigo-50 text-indigo-700",
        borderClass: "hover:border-indigo-300",
        accentClass: "from-indigo-600 via-violet-500 to-purple-400",
      },
      {
        label: "Private Jobs",
        description: "Corporate openings",
        value: stats.privateJobs,
        icon: Building2,
        iconClass: "bg-violet-50 text-violet-700",
        borderClass: "hover:border-violet-300",
        accentClass: "from-violet-600 via-purple-500 to-fuchsia-400",
      },
      {
        label: "Government Jobs",
        description: "Central and state roles",
        value: stats.governmentJobs,
        icon: Landmark,
        iconClass: "bg-rose-50 text-rose-700",
        borderClass: "hover:border-rose-300",
        accentClass: "from-rose-600 via-red-500 to-orange-400",
      },
      {
        label: "Work From Home",
        description: "Remote opportunities",
        value: stats.workFromHomeJobs,
        icon: Home,
        iconClass: "bg-cyan-50 text-cyan-700",
        borderClass: "hover:border-cyan-300",
        accentClass: "from-cyan-600 via-sky-500 to-blue-400",
      },
      {
        label: "Internships",
        description: "Student career starts",
        value: stats.internshipJobs,
        icon: GraduationCap,
        iconClass: "bg-amber-50 text-amber-700",
        borderClass: "hover:border-amber-300",
        accentClass: "from-amber-500 via-orange-500 to-yellow-400",
      },
      {
        label: "Referral Jobs",
        description: "Referral-enabled roles",
        value: stats.referralJobs,
        icon: UserRoundPlus,
        iconClass: "bg-teal-50 text-teal-700",
        borderClass: "hover:border-teal-300",
        accentClass: "from-teal-600 via-emerald-500 to-green-400",
      },
    ],
    [stats]
  );

  return (
    <section className="relative overflow-hidden bg-transparent px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="pointer-events-none absolute -left-28 top-16 h-72 w-72 rounded-full bg-blue-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-0 h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <span className="inline-flex rounded-full border border-blue-200/70 bg-white/80 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm backdrop-blur-md">
            Live Job Statistics
          </span>

          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Opportunities at a Glance
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            These numbers update automatically whenever a job is added,
            edited, or removed from Firestore.
          </p>
        </div>

        {loading && (
          <div className="flex min-h-48 items-center justify-center">
            <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-6 py-4 text-slate-600 shadow-xl shadow-blue-900/5 backdrop-blur-xl">
              <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
              <span className="font-semibold">Loading live statistics...</span>
            </div>
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-3xl border border-red-200/80 bg-red-50/85 p-8 text-center shadow-xl shadow-red-900/5 backdrop-blur-xl">
            <p className="font-semibold text-red-700">{loadError}</p>
          </div>
        )}

        {!loading && !loadError && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statItems.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.label}
                  className={`group relative overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-6 shadow-xl shadow-blue-900/5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-3 hover:bg-white/90 hover:shadow-2xl hover:shadow-blue-500/10 ${item.borderClass}`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accentClass} opacity-80 transition-opacity duration-300 group-hover:opacity-100`}
                  />

                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg transition duration-300 group-hover:scale-110 ${item.iconClass}`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>

                    <span className="rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm backdrop-blur">
                      Live
                    </span>
                  </div>

                  <p className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900">
                    {formatNumber(item.value)}
                  </p>

                  <h3 className="mt-2 text-lg font-bold text-slate-900">
                    {item.label}
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}