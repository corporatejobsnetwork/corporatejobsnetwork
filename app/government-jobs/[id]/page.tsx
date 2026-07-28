"use client";

import Navbar from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import {
  ArrowLeft,
  BadgeIndianRupee,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  IndianRupee,
  Landmark,
  Layers3,
  Loader2,
  MapPin,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type GovernmentJob = {
  id: string;
  type: string;
  status: string;
  category: string;

  organization: string;
  company: string;
  department: string;

  postName: string;
  role: string;
  title: string;

  qualification: string;
  location: string;
  vacancies: string;
  ageLimit: string;
  salary: string;

  applicationStartDate: string;
  lastDate: string;
  examDate: string;

  selectionProcess: string;
  applicationFee: string;
  jobLevel: string;
  officialWebsite: string;
  selectionMode: string;

  description: string;
  notificationLink: string;
  applyLink: string;

  createdAt: number;
  updatedAt: number;
};

const INSTAGRAM_URL =
  "https://www.instagram.com/corporatejobsnetwork/";

function normalize(value: unknown): string {
  return String(value ?? "").trim();
}

function getTimestampValue(value: unknown): number {
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

function formatCategory(value: string): string {
  if (!value) {
    return "Government";
  }

  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isValidExternalUrl(value: string): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

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

type DetailItemProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function DetailItem({ icon, label, value }: DetailItemProps) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>

          <p className="mt-1 break-words font-semibold leading-6 text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GovernmentJobDetailsPage() {
  const params = useParams<{ id: string }>();
  const jobId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [job, setJob] = useState<GovernmentJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showApplyPopup, setShowApplyPopup] = useState(false);
  const [applicationUnlocked, setApplicationUnlocked] =
    useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) {
        setError("Government job ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const jobReference = doc(db, "jobs", jobId);
        const jobSnapshot = await getDoc(jobReference);

        if (!jobSnapshot.exists()) {
          setError("This government job could not be found.");
          setJob(null);
          return;
        }

        const data = jobSnapshot.data();
        const type = normalize(data.type).toLowerCase();

        if (type !== "government") {
          setError("This record is not a government job.");
          setJob(null);
          return;
        }

        const organization = normalize(
          data.organization ?? data.company
        );

        const postName = normalize(
          data.postName ?? data.role ?? data.title
        );

        const mappedJob: GovernmentJob = {
          id: jobSnapshot.id,
          type: normalize(data.type),
          status: normalize(data.status),
          category: normalize(data.category),

          organization,
          company: normalize(data.company ?? organization),
          department: normalize(data.department),

          postName,
          role: normalize(data.role ?? postName),
          title: normalize(data.title ?? postName),

          qualification: normalize(data.qualification),
          location: normalize(data.location),
          vacancies: normalize(data.vacancies),
          ageLimit: normalize(data.ageLimit),
          salary: normalize(data.salary),

          applicationStartDate: normalize(
            data.applicationStartDate ?? data.startDate
          ),
          lastDate: normalize(
            data.lastDate ?? data.applicationLastDate
          ),
          examDate: normalize(data.examDate),

          selectionProcess: normalize(data.selectionProcess),
          applicationFee: normalize(data.applicationFee),
          jobLevel: normalize(data.jobLevel),
          officialWebsite: normalize(data.officialWebsite),
          selectionMode: normalize(
            data.selectionMode ?? data.applicationMode
          ),

          description: normalize(data.description),
          notificationLink: normalize(
            data.notificationLink ?? data.notificationUrl
          ),
          applyLink: normalize(
            data.applyLink ?? data.applicationLink
          ),

          createdAt: getTimestampValue(data.createdAt),
          updatedAt: getTimestampValue(data.updatedAt),
        };

        setJob(mappedJob);
      } catch (fetchError) {
        console.error(
          "Government job details fetch error:",
          fetchError
        );

        setError(
          "Unable to load this government job. Please check Firebase and try again."
        );
        setJob(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchJob();
  }, [jobId]);

  useEffect(() => {
    if (!showApplyPopup) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowApplyPopup(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showApplyPopup]);

  const applicationClosed = useMemo(() => {
    if (!job?.lastDate) {
      return false;
    }

    const lastDate = new Date(`${job.lastDate}T23:59:59`);

    if (Number.isNaN(lastDate.getTime())) {
      return false;
    }

    return lastDate.getTime() < Date.now();
  }, [job?.lastDate]);

  const openApplyPopup = () => {
    if (!job?.applyLink || applicationClosed) {
      return;
    }

    const unlocked =
      window.localStorage.getItem(
        "governmentApplicationUnlocked"
      ) === "true";

    setApplicationUnlocked(unlocked);
    setShowApplyPopup(true);
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
    if (!job?.applyLink || !isValidExternalUrl(job.applyLink)) {
      return;
    }

    window.open(
      job.applyLink,
      "_blank",
      "noopener,noreferrer"
    );

    setShowApplyPopup(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />

        <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
          <Loader2
            size={46}
            className="animate-spin text-blue-700"
          />

          <p className="mt-4 font-medium text-slate-600">
            Loading government job details...
          </p>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <Building2
              size={52}
              className="mx-auto text-red-500"
            />

            <h1 className="mt-5 text-3xl font-bold text-slate-900">
              Government Job Not Available
            </h1>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
              {error ||
                "The requested government job could not be loaded."}
            </p>

            <Link
              href="/government-jobs"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800"
            >
              <ArrowLeft size={19} />
              Back to Government Jobs
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const displayOrganization =
    job.organization || job.company || "Government Organization";

  const displayPost =
    job.postName || job.role || job.title || "Government Job";

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-16 -top-20 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-blue-300 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <Link
            href="/government-jobs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to Government Jobs
          </Link>

          <div className="mt-8 flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-100">
                  <ShieldCheck size={16} />
                  Government Job
                </span>

                {job.category && (
                  <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-100">
                    {formatCategory(job.category)}
                  </span>
                )}

                {job.status && (
                  <span className="rounded-full border border-green-300/30 bg-green-400/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-green-100">
                    {formatCategory(job.status)}
                  </span>
                )}
              </div>

              <p className="mt-6 text-lg font-semibold text-blue-200">
                {displayOrganization}
              </p>

              <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                {displayPost}
              </h1>

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-200 sm:text-base">
                {job.location && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={19} />
                    {job.location}
                  </span>
                )}

                {job.salary && (
                  <span className="inline-flex items-center gap-2">
                    <IndianRupee size={19} />
                    {job.salary}
                  </span>
                )}

                {job.lastDate && (
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={19} />
                    Last date: {formatDate(job.lastDate)}
                  </span>
                )}
              </div>
            </div>

            <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              {applicationClosed ? (
                <div className="rounded-2xl border border-red-300/30 bg-red-500/15 px-4 py-3 text-center font-bold text-red-100">
                  Applications Closed
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openApplyPopup}
                  disabled={!job.applyLink}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3.5 font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-500"
                >
                  Apply Now
                  <ExternalLink size={19} />
                </button>
              )}

              {job.lastDate && (
                <p className="mt-4 text-center text-sm text-blue-100">
                  Apply before{" "}
                  <strong>{formatDate(job.lastDate)}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <FileText size={25} />
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
                    Complete Information
                  </p>

                  <h2 className="text-2xl font-bold text-slate-900">
                    Job Overview
                  </h2>
                </div>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <DetailItem
                  icon={<Landmark size={22} />}
                  label="Organization"
                  value={displayOrganization}
                />

                <DetailItem
                  icon={<Building2 size={22} />}
                  label="Department"
                  value={job.department}
                />

                <DetailItem
                  icon={<BriefcaseBusiness size={22} />}
                  label="Post Name"
                  value={displayPost}
                />

                <DetailItem
                  icon={<Layers3 size={22} />}
                  label="Job Level"
                  value={job.jobLevel}
                />

                <DetailItem
                  icon={<GraduationCap size={22} />}
                  label="Qualification"
                  value={job.qualification}
                />

                <DetailItem
                  icon={<MapPin size={22} />}
                  label="Location"
                  value={job.location}
                />

                <DetailItem
                  icon={<Users size={22} />}
                  label="Vacancies"
                  value={job.vacancies}
                />

                <DetailItem
                  icon={<Clock3 size={22} />}
                  label="Age Limit"
                  value={job.ageLimit}
                />

                <DetailItem
                  icon={<BadgeIndianRupee size={22} />}
                  label="Salary"
                  value={job.salary}
                />

                <DetailItem
                  icon={<WalletCards size={22} />}
                  label="Application Fee"
                  value={job.applicationFee}
                />

                <DetailItem
                  icon={<CheckCircle2 size={22} />}
                  label="Selection Process"
                  value={job.selectionProcess}
                />

                <DetailItem
                  icon={<ShieldCheck size={22} />}
                  label="Application Mode"
                  value={job.selectionMode}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <CalendarDays size={25} />
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-indigo-700">
                    Important Schedule
                  </p>

                  <h2 className="text-2xl font-bold text-slate-900">
                    Important Dates
                  </h2>
                </div>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <DetailItem
                  icon={<CalendarDays size={22} />}
                  label="Application Start Date"
                  value={formatDate(job.applicationStartDate)}
                />

                <DetailItem
                  icon={<CalendarDays size={22} />}
                  label="Last Date"
                  value={formatDate(job.lastDate)}
                />

                <DetailItem
                  icon={<CalendarDays size={22} />}
                  label="Exam Date"
                  value={formatDate(job.examDate)}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <FileText size={25} />
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
                    Full Details
                  </p>

                  <h2 className="text-2xl font-bold text-slate-900">
                    Job Description
                  </h2>
                </div>
              </div>

              {job.description ? (
                <div className="mt-7 whitespace-pre-line text-base leading-8 text-slate-700">
                  {job.description}
                </div>
              ) : (
                <p className="mt-7 text-slate-500">
                  No additional description was provided.
                </p>
              )}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Official Links
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Always verify the notification before submitting your
                application.
              </p>

              <div className="mt-6 space-y-3">
                {!applicationClosed && job.applyLink && (
                  <button
                    type="button"
                    onClick={openApplyPopup}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 font-bold text-white transition hover:bg-blue-800"
                  >
                    Apply Now
                    <ExternalLink size={19} />
                  </button>
                )}

                {job.notificationLink &&
                  isValidExternalUrl(job.notificationLink) && (
                    <a
                      href={job.notificationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-700 px-5 py-3.5 font-bold text-blue-700 transition hover:bg-blue-50"
                    >
                      <Download size={19} />
                      Download Notification
                    </a>
                  )}

                {job.officialWebsite &&
                  isValidExternalUrl(job.officialWebsite) && (
                    <a
                      href={job.officialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3.5 font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Globe2 size={19} />
                      Official Website
                    </a>
                  )}
              </div>

              {!job.applyLink &&
                !job.notificationLink &&
                !job.officialWebsite && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                    Official links have not been added yet.
                  </div>
                )}
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={25}
                  className="mt-0.5 shrink-0 text-blue-700"
                />

                <div>
                  <h3 className="font-bold text-slate-900">
                    Application Safety
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Apply only through the official website. Do not pay
                    money to unknown persons for job confirmation.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {showApplyPopup && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowApplyPopup(false);
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
              onClick={() => setShowApplyPopup(false)}
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
                <h3 className="text-3xl font-extrabold text-slate-950">
                  Before You Apply
                </h3>

                <p className="mx-auto mt-3 max-w-md text-base leading-7 text-slate-600">
                  Follow Corporate Jobs Network on Instagram to unlock
                  the official application link.
                </p>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                <p className="font-bold text-blue-700">
                  {displayOrganization}
                </p>

                <p className="mt-1 text-lg font-extrabold text-slate-950">
                  {displayPost}
                </p>

                {job.location && (
                  <p className="mt-1 text-slate-600">
                    {job.location}
                  </p>
                )}
              </div>

              {!job.applyLink ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
                  <p className="font-semibold text-amber-800">
                    Application link is not available yet.
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
                    {applicationUnlocked ? "Open Application Link" : "🔒 Follow First to Unlock Application Link"}
                    {applicationUnlocked && <ExternalLink size={19} />}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setShowApplyPopup(false)}
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
    </main>
  );
}