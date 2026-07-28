"use client";

import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Home,
  Landmark,
  Loader2,
  Mail,
  MessageSquareText,
  RefreshCw,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FirestoreData = Record<string, unknown>;

type JobItem = {
  id: string;
  company: string;
  role: string;
  category: string;
  type: string;
  location: string;
  createdAt: Timestamp | null;
};

type ReferralItem = {
  id: string;
  fullName: string;
  company: string;
  jobTitle: string;
  status: string;
  createdAt: Timestamp | null;
};

type ContactItem = {
  id: string;
  fullName: string;
  subject: string;
  status: string;
  createdAt: Timestamp | null;
};

function getString(
  data: FirestoreData,
  possibleKeys: string[],
  fallback = ""
): string {
  for (const key of possibleKeys) {
    const value = data[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

function getTimestamp(
  data: FirestoreData,
  possibleKeys: string[]
): Timestamp | null {
  for (const key of possibleKeys) {
    const value = data[key];

    if (value instanceof Timestamp) {
      return value;
    }
  }

  return null;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function formatDate(value: Timestamp | null): string {
  if (!value) {
    return "Date unavailable";
  }

  return value.toDate().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isFreshersJob(job: JobItem): boolean {
  const content = normalize(`${job.category} ${job.type}`);

  return (
    content.includes("fresher") ||
    content.includes("freshers") ||
    content.includes("entry-level")
  );
}

function isExperiencedJob(job: JobItem): boolean {
  const content = normalize(`${job.category} ${job.type}`);

  return (
    content.includes("experienced") ||
    content.includes("experience") ||
    content.includes("professional")
  );
}

function isInternshipJob(job: JobItem): boolean {
  const content = normalize(`${job.category} ${job.type} ${job.role}`);

  return (
    content.includes("internship") ||
    content.includes("intern") ||
    content.includes("apprentice") ||
    content.includes("apprenticeship")
  );
}

function isWorkFromHomeJob(job: JobItem): boolean {
  const content = normalize(
    `${job.category} ${job.type} ${job.location} ${job.role}`
  );

  return (
    content.includes("work-from-home") ||
    content.includes("wfh") ||
    content.includes("remote")
  );
}

function isGovernmentJob(job: JobItem): boolean {
  const content = normalize(`${job.category} ${job.type}`);

  return content.includes("government") || content.includes("govt");
}

function isPrivateJob(job: JobItem): boolean {
  return !isGovernmentJob(job);
}

export default function AdminDashboardPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactItem[]>([]);

  const [jobsLoading, setJobsLoading] = useState(true);
  const [referralsLoading, setReferralsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);

  const [jobsError, setJobsError] = useState("");
  const [referralsError, setReferralsError] = useState("");
  const [messagesError, setMessagesError] = useState("");

  useEffect(() => {
    const jobsQuery = query(
      collection(db, "jobs"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      jobsQuery,
      (snapshot) => {
        const nextJobs: JobItem[] = snapshot.docs.map((jobDocument) => {
          const data = jobDocument.data() as FirestoreData;

          return {
            id: jobDocument.id,
            company: getString(data, [
              "company",
              "companyName",
              "organization",
            ]),
            role: getString(data, [
              "role",
              "jobTitle",
              "title",
              "designation",
            ]),
            category: getString(data, [
              "category",
              "jobCategory",
              "experienceCategory",
            ]),
            type: getString(data, [
              "type",
              "jobType",
              "companyType",
              "employmentType",
            ]),
            location: getString(data, ["location", "jobLocation"]),
            createdAt: getTimestamp(data, [
              "createdAt",
              "postedAt",
              "updatedAt",
            ]),
          };
        });

        setJobs(nextJobs);
        setJobsError("");
        setJobsLoading(false);
      },
      (error) => {
        console.error("Unable to load dashboard jobs:", error);
        setJobsError("Unable to load jobs.");
        setJobsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const referralsQuery = query(
      collection(db, "referralRequests"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      referralsQuery,
      (snapshot) => {
        const nextReferrals: ReferralItem[] = snapshot.docs.map(
          (referralDocument) => {
            const data = referralDocument.data() as FirestoreData;

            return {
              id: referralDocument.id,
              fullName: getString(data, [
                "fullName",
                "candidateName",
                "name",
              ]),
              company: getString(data, [
                "company",
                "companyName",
                "requestedCompany",
              ]),
              jobTitle: getString(data, [
                "jobTitle",
                "role",
                "designation",
                "position",
              ]),
              status: normalize(
                getString(data, ["status"], "pending")
              ),
              createdAt: getTimestamp(data, [
                "createdAt",
                "submittedAt",
                "updatedAt",
              ]),
            };
          }
        );

        setReferrals(nextReferrals);
        setReferralsError("");
        setReferralsLoading(false);
      },
      (error) => {
        console.error("Unable to load dashboard referrals:", error);
        setReferralsError("Unable to load referral requests.");
        setReferralsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const messagesQuery = query(
      collection(db, "contactMessages"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const nextMessages: ContactItem[] = snapshot.docs.map(
          (messageDocument) => {
            const data = messageDocument.data() as FirestoreData;

            return {
              id: messageDocument.id,
              fullName: getString(data, ["fullName", "name"]),
              subject: getString(data, ["subject", "title"]),
              status: normalize(getString(data, ["status"], "new")),
              createdAt: getTimestamp(data, [
                "createdAt",
                "submittedAt",
                "updatedAt",
              ]),
            };
          }
        );

        setContactMessages(nextMessages);
        setMessagesError("");
        setMessagesLoading(false);
      },
      (error) => {
        console.error("Unable to load dashboard contact messages:", error);
        setMessagesError("Unable to load contact messages.");
        setMessagesLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const loading = jobsLoading || referralsLoading || messagesLoading;

  const dashboardData = useMemo(() => {
    const companyNames = new Set(
      jobs
        .map((job) => normalize(job.company))
        .filter((company) => company.length > 0)
    );

    return {
      totalJobs: jobs.length,
      companies: companyNames.size,

      freshersJobs: jobs.filter(isFreshersJob).length,
      experiencedJobs: jobs.filter(isExperiencedJob).length,
      internshipJobs: jobs.filter(isInternshipJob).length,
      workFromHomeJobs: jobs.filter(isWorkFromHomeJob).length,
      governmentJobs: jobs.filter(isGovernmentJob).length,
      privateJobs: jobs.filter(isPrivateJob).length,

      totalReferrals: referrals.length,
      pendingReferrals: referrals.filter((item) =>
        ["pending", "new"].includes(item.status)
      ).length,
      reviewedReferrals: referrals.filter((item) =>
        ["reviewed", "in-progress", "under-review"].includes(item.status)
      ).length,
      completedReferrals: referrals.filter((item) =>
        ["completed", "referred", "resolved", "selected"].includes(item.status)
      ).length,

      totalMessages: contactMessages.length,
      newMessages: contactMessages.filter((item) => item.status === "new")
        .length,
      inProgressMessages: contactMessages.filter(
        (item) => item.status === "in-progress"
      ).length,
      resolvedMessages: contactMessages.filter(
        (item) => item.status === "resolved"
      ).length,
    };
  }, [jobs, referrals, contactMessages]);

  const statisticCards = [
    {
      label: "Total Jobs",
      value: dashboardData.totalJobs,
      icon: BriefcaseBusiness,
      href: "/admin/panel/manage-jobs",
    },
    {
      label: "Companies",
      value: dashboardData.companies,
      icon: Building2,
      href: "/admin/panel/manage-jobs",
    },
    {
      label: "Referral Requests",
      value: dashboardData.totalReferrals,
      icon: UsersRound,
      href: "/admin/panel/referrals",
    },
    {
      label: "Contact Messages",
      value: dashboardData.totalMessages,
      icon: MessageSquareText,
      href: "/admin/panel/contact-messages",
    },
    {
      label: "Pending Referrals",
      value: dashboardData.pendingReferrals,
      icon: Clock3,
      href: "/admin/panel/referrals",
    },
    {
      label: "New Messages",
      value: dashboardData.newMessages,
      icon: Mail,
      href: "/admin/panel/contact-messages",
    },
  ];

  const jobCategoryCards = [
    {
      label: "Freshers Jobs",
      value: dashboardData.freshersJobs,
      icon: GraduationCap,
    },
    {
      label: "Experienced Jobs",
      value: dashboardData.experiencedJobs,
      icon: UserRoundCheck,
    },
    {
      label: "Internship Jobs",
      value: dashboardData.internshipJobs,
      icon: GraduationCap,
    },
    {
      label: "Work From Home",
      value: dashboardData.workFromHomeJobs,
      icon: Home,
    },
    {
      label: "Government Jobs",
      value: dashboardData.governmentJobs,
      icon: Landmark,
    },
    {
      label: "Private Jobs",
      value: dashboardData.privateJobs,
      icon: Building2,
    },
  ];

  const errors = [jobsError, referralsError, messagesError].filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-2 shadow-sm">
              <Image
                src="/logo.png"
                alt="Corporate Jobs Network logo"
                width={80}
                height={80}
                className="h-full w-full object-contain"
                priority
              />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-blue-700 sm:text-4xl">
                Admin Dashboard
              </h1>

              <p className="mt-1 text-base text-slate-600 sm:text-lg">
                Corporate Jobs Network
              </p>
            </div>
          </div>

          <Link
            href="/admin/panel/add-job"
            className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            + Add New Job
          </Link>
        </div>

        <div className="mt-8 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Loading live dashboard data...
            </>
          ) : (
            <>
              <RefreshCw size={18} />
              Dashboard is connected to live Firestore data
            </>
          )}
        </div>

        {errors.length > 0 && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errors.join(" ")}
          </div>
        )}

        <section className="mt-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Overview
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Live job, referral and contact-message statistics
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {statisticCards.map((card) => {
              const Icon = card.icon;

              return (
                <Link
                  key={card.label}
                  href={card.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-bold text-slate-700">
                        {card.label}
                      </p>

                      <p className="mt-4 text-4xl font-extrabold text-blue-700">
                        {loading ? "—" : card.value}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
                      <Icon size={24} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Jobs by Category
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Category totals calculated automatically from your jobs
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {jobCategoryCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-blue-700">
                    <Icon size={21} />
                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-600">
                    {card.label}
                  </p>

                  <p className="mt-2 text-3xl font-extrabold text-slate-900">
                    {loading ? "—" : card.value}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Latest Jobs
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Most recently added jobs
                </p>
              </div>

              <Link
                href="/admin/panel/manage-jobs"
                className="text-sm font-bold text-blue-700 hover:text-blue-900"
              >
                View All
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {jobsLoading ? (
                <div className="flex min-h-44 items-center justify-center">
                  <Loader2 className="animate-spin text-blue-700" size={24} />
                </div>
              ) : jobs.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  No jobs added yet.
                </p>
              ) : (
                jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="px-5 py-4">
                    <p className="truncate font-bold text-slate-900">
                      {job.role || "Untitled Job"}
                    </p>

                    <p className="mt-1 truncate text-sm text-slate-600">
                      {job.company || "Company not provided"}
                    </p>

                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      {formatDate(job.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Latest Referrals
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Recently received requests
                </p>
              </div>

              <Link
                href="/admin/panel/referrals"
                className="text-sm font-bold text-blue-700 hover:text-blue-900"
              >
                View All
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {referralsLoading ? (
                <div className="flex min-h-44 items-center justify-center">
                  <Loader2 className="animate-spin text-blue-700" size={24} />
                </div>
              ) : referrals.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  No referral requests yet.
                </p>
              ) : (
                referrals.slice(0, 5).map((referral) => (
                  <div key={referral.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">
                          {referral.fullName || "Unnamed Candidate"}
                        </p>

                        <p className="mt-1 truncate text-sm text-slate-600">
                          {referral.jobTitle ||
                            referral.company ||
                            "Referral request"}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-amber-700">
                        {referral.status.replaceAll("-", " ")}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      {formatDate(referral.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Latest Messages
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Recent contact enquiries
                </p>
              </div>

              <Link
                href="/admin/panel/contact-messages"
                className="text-sm font-bold text-blue-700 hover:text-blue-900"
              >
                View All
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {messagesLoading ? (
                <div className="flex min-h-44 items-center justify-center">
                  <Loader2 className="animate-spin text-blue-700" size={24} />
                </div>
              ) : contactMessages.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">
                  No contact messages yet.
                </p>
              ) : (
                contactMessages.slice(0, 5).map((message) => (
                  <div key={message.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">
                          {message.fullName || "Unnamed User"}
                        </p>

                        <p className="mt-1 truncate text-sm text-slate-600">
                          {message.subject || "No subject"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                          message.status === "resolved"
                            ? "bg-green-50 text-green-700"
                            : message.status === "in-progress"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {message.status.replaceAll("-", " ")}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      {formatDate(message.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-bold text-amber-700">
              Referral Progress
            </p>

            <div className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>Pending</span>
                <span>{dashboardData.pendingReferrals}</span>
              </div>

              <div className="flex justify-between">
                <span>Reviewed</span>
                <span>{dashboardData.reviewedReferrals}</span>
              </div>

              <div className="flex justify-between">
                <span>Completed</span>
                <span>{dashboardData.completedReferrals}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-bold text-blue-700">Message Progress</p>

            <div className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>New</span>
                <span>{dashboardData.newMessages}</span>
              </div>

              <div className="flex justify-between">
                <span>In Progress</span>
                <span>{dashboardData.inProgressMessages}</span>
              </div>

              <div className="flex justify-between">
                <span>Resolved</span>
                <span>{dashboardData.resolvedMessages}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={20} />

              <p className="text-sm font-bold">Live Database Status</p>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-700">
              Job, referral and contact-message totals update automatically
              whenever Firestore data changes.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}