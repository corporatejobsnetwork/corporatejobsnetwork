"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Gift,
  GraduationCap,
  IndianRupee,
  Info,
  Layers3,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Footer from "@/components/Footer";

interface ApplicationMode {
  directApply?: boolean;
  referral?: boolean;
}

interface JobData {
  id: string;
  company: string;
  role: string;
  type: string;
  category: string;
  location: string;
  experience: string;
  education: string;
  salary: string;
  lastDate: string;
  applyLink: string;
  companyImage: string;
  companyLogo: string;
  primarySkills: string[];
  requiredSkills: string[];
  eligibilityCriteria: string[];
  jobDescription: string;
  responsibilities: string[];
  benefits: string[];
  selectionProcess: string[];
  applicationMode: ApplicationMode;
  createdAt?: Timestamp | null;
}

type PopupMode = "apply" | "referral" | null;

function convertToStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function formatCategory(category: string): string {
  const labels: Record<string, string> = {
    fresher: "Freshers",
    freshers: "Freshers",
    experienced: "Experienced",
    experience: "Experienced",
    "freshers-experienced": "Freshers & Experienced",
    "fresher-experienced": "Freshers & Experienced",
    both: "Freshers & Experienced",
    "work-from-home": "Work From Home",
    wfh: "Work From Home",
    remote: "Work From Home",
    internship: "Internship",
    internships: "Internship",
    intern: "Internship",
    "walk-in": "Walk-In Drive",
  };

  const normalized = category.trim().toLowerCase();
  return (labels[normalized] ?? category) || "Not mentioned";
}

function formatJobType(type: string): string {
  const normalized = type.trim().toLowerCase();
  return normalized.includes("government") || normalized.startsWith("govt")
    ? "Government Job"
    : "Private Job";
}

function formatPostedDate(timestamp?: Timestamp | null): string {
  if (!timestamp) return "";

  try {
    return timestamp.toDate().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatLastDate(value: string): string {
  if (!value || ["n/a", "na"].includes(value.trim().toLowerCase())) {
    return "Not mentioned";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function displaySalary(value: string): string {
  if (!value || ["n/a", "na"].includes(value.trim().toLowerCase())) {
    return "Salary Not Disclosed";
  }

  return value;
}

export default function JobDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params.id;

  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [popupMode, setPopupMode] = useState<PopupMode>(null);
  const [instagramOpened, setInstagramOpened] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    async function loadJob() {
      if (!jobId) {
        setError("Invalid job ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const jobReference = doc(db, "jobs", jobId);
        const jobSnapshot = await getDoc(jobReference);

        if (!jobSnapshot.exists()) {
          setError("This job could not be found.");
          return;
        }

        const data = jobSnapshot.data();

        let applicationMode: ApplicationMode = {
          directApply: false,
          referral: false,
        };

        if (data.applicationMode && typeof data.applicationMode === "object") {
          applicationMode = {
            directApply: data.applicationMode.directApply === true,
            referral: data.applicationMode.referral === true,
          };
        } else if (data.applyLink) {
          applicationMode = {
            directApply: true,
            referral: false,
          };
        }

        setJob({
          id: jobSnapshot.id,
          company: String(data.company ?? ""),
          role: String(data.role ?? ""),
          type: String(data.type ?? data.jobType ?? "private"),
          category: String(data.category ?? data.jobCategory ?? "freshers"),
          location: String(data.location ?? ""),
          experience: String(data.experience ?? ""),
          education: String(data.education ?? ""),
          salary: String(data.salary ?? "N/A"),
          lastDate: String(data.lastDate ?? "N/A"),
          applyLink: String(data.applyLink ?? ""),
          companyImage: String(
            data.companyImage ?? data.backgroundImage ?? data.bannerImage ?? ""
          ),
          companyLogo: String(
            data.companyLogo ?? data.logoUrl ?? data.companyLogoUrl ?? ""
          ),
          primarySkills: convertToStringArray(data.primarySkills),
          requiredSkills: convertToStringArray(data.requiredSkills),
          eligibilityCriteria: convertToStringArray(data.eligibilityCriteria),
          jobDescription: String(data.jobDescription ?? ""),
          responsibilities: convertToStringArray(data.responsibilities),
          benefits: convertToStringArray(data.benefits),
          selectionProcess: convertToStringArray(data.selectionProcess),
          applicationMode,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
        });
      } catch (loadError) {
        console.error("Failed to load job:", loadError);
        setError("Unable to load the job details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadJob();
  }, [jobId]);

  useEffect(() => {
    setLogoError(false);
  }, [job?.companyLogo]);

  function openPopup(mode: Exclude<PopupMode, null>) {
    setPopupMode(mode);
    setInstagramOpened(false);
  }

  function closePopup() {
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
    if (!job || !popupMode || !instagramOpened) return;

    if (popupMode === "apply") {
      if (!job.applyLink) return;
      window.open(job.applyLink, "_blank", "noopener,noreferrer");
      closePopup();
      return;
    }

    const referralUrl =
      `/referral?jobId=${encodeURIComponent(job.id)}` +
      `&company=${encodeURIComponent(job.company)}` +
      `&role=${encodeURIComponent(job.role)}`;

    closePopup();
    router.push(referralUrl);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <Loader2 size={44} className="mx-auto animate-spin text-blue-700" />
          <p className="mt-4 font-semibold text-slate-600">
            Loading job details...
          </p>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-7 text-center shadow-sm sm:p-10">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Job Not Available
          </h1>
          <p className="mt-3 text-slate-600">
            {error || "This job could not be found."}
          </p>
          <Link
            href="/latest-jobs"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-6 py-3 font-bold text-white transition hover:bg-blue-800"
          >
            View Latest Jobs
          </Link>
        </div>
      </main>
    );
  }

  const postedDate = formatPostedDate(job.createdAt);
  const showDirectApply =
    job.applicationMode.directApply === true && Boolean(job.applyLink);
  const showReferral = job.applicationMode.referral === true;

  return (
    <>
      <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-white">
        <section
          className="relative overflow-hidden border-b border-blue-800 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 px-4 py-8 text-white sm:px-6 sm:py-12 lg:px-8"
          style={
            job.companyImage
              ? {
                  backgroundImage: `linear-gradient(110deg, rgba(15, 23, 42, 0.96), rgba(30, 64, 175, 0.88), rgba(49, 46, 129, 0.84)), url(${job.companyImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_38%)]" />
          <div className="relative mx-auto max-w-7xl">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-bold text-blue-100 transition hover:text-white"
            >
              <ArrowLeft size={18} />
              Back to jobs
            </button>

            <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="min-w-0">
                <div className="flex items-start gap-4 sm:gap-5">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white p-2 shadow-xl">
                    {job.companyLogo && !logoError ? (
                      <img
                        src={job.companyLogo}
                        alt={`${job.company} logo`}
                        className="max-h-14 max-w-14 object-contain"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <Building2
                        className="h-9 w-9 text-blue-700"
                        aria-label="Company logo unavailable"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold sm:text-sm">
                    {formatJobType(job.type)}
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold sm:text-sm">
                    {formatCategory(job.category)}
                  </span>
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-100 sm:text-sm">
                    Active Opening
                  </span>
                </div>

                <h1 className="mt-5 break-words text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                  {job.role || "Job Opening"}
                </h1>

                <div className="mt-5 flex flex-col gap-3 text-sm text-blue-100 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-3 sm:text-base">
                  <span className="inline-flex items-start gap-2">
                    <Building2 size={19} className="mt-0.5 shrink-0" />
                    <span className="break-words">{job.company || "Not mentioned"}</span>
                  </span>
                  <span className="inline-flex items-start gap-2">
                    <MapPin size={19} className="mt-0.5 shrink-0" />
                    <span className="break-words">{job.location || "Not mentioned"}</span>
                  </span>
                  <span className="inline-flex items-start gap-2">
                    <BriefcaseBusiness size={19} className="mt-0.5 shrink-0" />
                    <span>{job.experience || "Not mentioned"}</span>
                  </span>
                  {postedDate && (
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={19} /> Posted {postedDate}
                    </span>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <HeroBadge
                    icon={<IndianRupee size={17} />}
                    text={displaySalary(job.salary)}
                  />
                  <HeroBadge
                    icon={<CalendarDays size={17} />}
                    text={`Last date: ${formatLastDate(job.lastDate)}`}
                  />
                </div>
                  </div>
                </div>
              </div>

              {(showDirectApply || showReferral) && (
                <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-56 lg:grid-cols-1">
                  {showDirectApply && (
                    <button
                      type="button"
                      onClick={() => openPopup("apply")}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-extrabold text-blue-800 shadow-lg transition hover:bg-blue-50"
                    >
                      Direct Apply <ExternalLink size={18} />
                    </button>
                  )}
                  {showReferral && (
                    <button
                      type="button"
                      onClick={() => openPopup("referral")}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-extrabold text-white shadow-lg transition hover:bg-emerald-600"
                    >
                      Request Referral <Send size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_350px]">
            <div className="min-w-0 space-y-6">
              <ContentSection
                title="Job Description"
                icon={<Info size={22} />}
                iconClass="bg-blue-100 text-blue-700"
              >
                {job.jobDescription ? (
                  <p className="whitespace-pre-line break-words text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
                    {job.jobDescription}
                  </p>
                ) : (
                  <EmptyText />
                )}
              </ContentSection>

              <ContentSection
                title="Primary Skills"
                icon={<Sparkles size={22} />}
                iconClass="bg-indigo-100 text-indigo-700"
              >
                {job.primarySkills.length > 0 ? (
                  <SkillChips skills={job.primarySkills} />
                ) : (
                  <EmptyText />
                )}
              </ContentSection>

              <ContentSection
                title="Required Skills"
                icon={<Target size={22} />}
                iconClass="bg-cyan-100 text-cyan-700"
              >
                {job.requiredSkills.length > 0 ? (
                  <BulletList items={job.requiredSkills} />
                ) : (
                  <EmptyText />
                )}
              </ContentSection>

              <ContentSection
                title="Eligibility Criteria"
                icon={<GraduationCap size={22} />}
                iconClass="bg-amber-100 text-amber-700"
              >
                {job.eligibilityCriteria.length > 0 ? (
                  <BulletList items={job.eligibilityCriteria} />
                ) : (
                  <EmptyText />
                )}
              </ContentSection>

              <ContentSection
                title="Responsibilities"
                icon={<ClipboardList size={22} />}
                iconClass="bg-violet-100 text-violet-700"
              >
                {job.responsibilities.length > 0 ? (
                  <BulletList items={job.responsibilities} />
                ) : (
                  <EmptyText />
                )}
              </ContentSection>

              <ContentSection
                title="Benefits"
                icon={<Gift size={22} />}
                iconClass="bg-emerald-100 text-emerald-700"
              >
                {job.benefits.length > 0 ? (
                  <BulletList items={job.benefits} />
                ) : (
                  <EmptyText />
                )}
              </ContentSection>

              <ContentSection
                title="Selection Process"
                icon={<Layers3 size={22} />}
                iconClass="bg-rose-100 text-rose-700"
              >
                {job.selectionProcess.length > 0 ? (
                  <div className="space-y-3">
                    {job.selectionProcess.map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:gap-4"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-extrabold text-white">
                          {index + 1}
                        </span>
                        <p className="min-w-0 break-words pt-1 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyText />
                )}
              </ContentSection>
            </div>

            <aside className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <BriefcaseBusiness size={22} />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                      Position summary
                    </p>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      Job Overview
                    </h2>
                  </div>
                </div>

                <div className="mt-6 divide-y divide-slate-100">
                  <OverviewItem icon={<Building2 size={20} />} label="Company" value={job.company} />
                  <OverviewItem icon={<MapPin size={20} />} label="Location" value={job.location} />
                  <OverviewItem icon={<BriefcaseBusiness size={20} />} label="Experience" value={job.experience} />
                  <OverviewItem icon={<GraduationCap size={20} />} label="Education" value={job.education} />
                  <OverviewItem icon={<IndianRupee size={20} />} label="Salary" value={displaySalary(job.salary)} />
                  <OverviewItem icon={<CalendarDays size={20} />} label="Last Date" value={formatLastDate(job.lastDate)} />
                  <OverviewItem icon={<Users size={20} />} label="Category" value={formatCategory(job.category)} />
                  <OverviewItem icon={<BadgeCheck size={20} />} label="Job Type" value={formatJobType(job.type)} />
                </div>
              </div>

              {(showDirectApply || showReferral) && (
                <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm sm:p-6">
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Interested in this job?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Check your eligibility and complete the application before the closing date.
                  </p>

                  <div className="mt-5 space-y-3">
                    {showDirectApply && (
                      <button
                        type="button"
                        onClick={() => openPopup("apply")}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-extrabold text-white transition hover:bg-blue-800"
                      >
                        Direct Apply <ExternalLink size={18} />
                      </button>
                    )}
                    {showReferral && (
                      <button
                        type="button"
                        onClick={() => openPopup("referral")}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-extrabold text-white transition hover:bg-emerald-700"
                      >
                        Request Referral <Send size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </section>
      </main>

      <Footer />

      {popupMode && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={closePopup}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-wider text-blue-700">
                  Corporate Jobs Network
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                  {popupMode === "referral"
                    ? "Before Requesting Referral"
                    : "Before You Apply"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closePopup}
                aria-label="Close popup"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Follow our Instagram page for genuine job updates, then return here to continue.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-extrabold text-blue-700">{job.company}</p>
              <p className="mt-1 break-words font-bold text-slate-900">{job.role}</p>
              <p className="mt-1 break-words text-sm text-slate-500">{job.location}</p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={openInstagram}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 px-5 py-3 font-extrabold text-white transition hover:opacity-90"
              >
                <span aria-hidden="true">📷</span>
                Follow on Instagram
              </button>

              <button
                type="button"
                onClick={continueAction}
                disabled={
                  !instagramOpened ||
                  (popupMode === "apply" && !job.applyLink)
                }
                className={`min-h-12 w-full rounded-xl px-5 py-3 font-extrabold text-white transition disabled:cursor-not-allowed disabled:bg-slate-400 ${
                  popupMode === "referral"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-700 hover:bg-blue-800"
                }`}
              >
                {!instagramOpened
                  ? "Follow First to Continue"
                  : popupMode === "referral"
                    ? "Continue to Referral"
                    : job.applyLink
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
          </div>
        </div>
      )}
    </>
  );
}

function HeroBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-blue-50 sm:text-sm">
      <span className="shrink-0">{icon}</span>
      <span className="break-words">{text}</span>
    </span>
  );
}

interface ContentSectionProps {
  title: string;
  icon: React.ReactNode;
  iconClass: string;
  children: React.ReactNode;
}

function ContentSection({
  title,
  icon,
  iconClass,
  children,
}: ContentSectionProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
            {icon}
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            {title}
          </h2>
        </div>
      </div>
      <div className="p-5 sm:p-7">{children}</div>
    </section>
  );
}

function SkillChips({ skills }: { skills: string[] }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {skills.map((skill, index) => (
        <span
          key={`${skill}-${index}`}
          className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700"
        >
          <CheckCircle2 size={16} className="shrink-0" />
          <span className="break-words">{skill}</span>
        </span>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-700 sm:text-base"
        >
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
          <span className="min-w-0 break-words leading-7">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyText() {
  return <p className="text-sm italic text-slate-500">Not provided.</p>;
}

interface OverviewItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function OverviewItem({ icon, label, value }: OverviewItemProps) {
  return (
    <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      <span className="mt-0.5 shrink-0 text-blue-700">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 break-words font-bold leading-6 text-slate-900">
          {value || "Not mentioned"}
        </p>
      </div>
    </div>
  );
}