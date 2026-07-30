"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  ExternalLink,
  GraduationCap,
  Loader2,
  MapPin,
  Pencil,
  Save,
  Send,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase";
import { getCompanyLogo } from "@/lib/company-logo";
import { cleanImportedJobContent } from "@/lib/job-content-cleaner";
import { detectJobMetadata } from "@/lib/job-metadata-detector";
import { detectCompanyAndRole } from "@/lib/job-company-role-detector";
import {
  detectDuplicateJob,
  type DuplicateJobResult,
} from "@/lib/job-duplicate-detector";

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
  workMode?: string;
  employmentType?: string;
  lastDate?: string;
  source?: string;
  sourceJobId?: string;
  status?: string;
  reviewStatus?: string;
  createdAt?: Timestamp;
};

type EditableJob = Omit<ImportedJob, "id" | "createdAt" | "skills" | "requiredSkills"> & {
  skillsText: string;
  requiredSkillsText: string;
};

function DetailSection({
  title,
  content,
}: {
  title: string;
  content?: string;
}) {
  if (!content?.trim()) {
    return null;
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-gray-900">{title}</h2>
      <div className="whitespace-pre-line leading-7 text-gray-700">{content}</div>
    </section>
  );
}

function FormField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </span>

      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      )}
    </label>
  );
}

export default function ImportedJobDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<ImportedJob | null>(null);
  const [form, setForm] = useState<EditableJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [duplicateResult, setDuplicateResult] =
    useState<DuplicateJobResult | null>(null);

  const jobId = params?.id;

  useEffect(() => {
    if (!jobId) {
      setErrorMessage("Invalid imported job ID.");
      setLoading(false);
      return;
    }

    const importedJobReference = doc(db, "importedJobs", jobId);

    const unsubscribe = onSnapshot(
      importedJobReference,
      (snapshot) => {
        if (!snapshot.exists()) {
          setJob(null);
          setErrorMessage("Imported job not found.");
          setLoading(false);
          return;
        }

        const loadedJob = {
          id: snapshot.id,
          ...(snapshot.data() as Omit<ImportedJob, "id">),
        };

        const cleanedContent = cleanImportedJobContent(loadedJob.description);
        const metadata = detectJobMetadata(loadedJob.description || "");
        const detectedCompanyRole = detectCompanyAndRole(
          loadedJob.description || ""
        );

        setJob(loadedJob);

        if (!editing) {
          setForm({
            company: loadedJob.company || detectedCompanyRole.company || "",
            role: loadedJob.role || detectedCompanyRole.role || "",
            location: loadedJob.location || metadata.locations.join(", "),
            experience: loadedJob.experience || metadata.experience || "",
            education: loadedJob.education || metadata.education || "",
            salary: loadedJob.salary || metadata.salary || "",
            skillsText: loadedJob.skills?.length
              ? loadedJob.skills.join(", ")
              : metadata.skills.join(", "),
            requiredSkillsText: (loadedJob.requiredSkills || []).join(", "),
            eligibility:
              loadedJob.eligibility?.trim() || cleanedContent.eligibility,
            responsibilities:
              loadedJob.responsibilities?.trim() ||
              cleanedContent.responsibilities,
            benefits: loadedJob.benefits || "",
            selectionProcess: loadedJob.selectionProcess || "",
            description:
              cleanedContent.description || loadedJob.description || "",
            applyLink: loadedJob.applyLink || "",
            logo: getCompanyLogo(
              loadedJob.company || detectedCompanyRole.company,
              loadedJob.logo
            ),
            category: loadedJob.category || metadata.jobCategory || "",
            jobType: loadedJob.jobType || "",
            applicationMode: loadedJob.applicationMode || "",
            workMode: loadedJob.workMode || metadata.workMode || "",
            employmentType:
              loadedJob.employmentType || metadata.employmentType || "",
            lastDate: loadedJob.lastDate || metadata.lastDate || "",
            source: loadedJob.source || "",
            sourceJobId: loadedJob.sourceJobId || "",
            status: loadedJob.status || "",
            reviewStatus: loadedJob.reviewStatus || "",
          });
        }

        setErrorMessage("");
        setLoading(false);
      },
      (error) => {
        console.error("Unable to load imported job:", error);
        setErrorMessage(
          "Unable to load imported job. Please check Firestore permissions."
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId, editing]);

  function updateForm<K extends keyof EditableJob>(
    field: K,
    value: EditableJob[K]
  ) {
    setDuplicateResult(null);
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  function cancelEditing() {
    if (!job) return;

    setForm({
      company: job.company || "",
      role: job.role || "",
      location: job.location || "",
      experience: job.experience || "",
      education: job.education || "",
      salary: job.salary || "",
      skillsText: (job.skills || []).join(", "),
      requiredSkillsText: (job.requiredSkills || []).join(", "),
      eligibility: job.eligibility || "",
      responsibilities: job.responsibilities || "",
      benefits: job.benefits || "",
      selectionProcess: job.selectionProcess || "",
      description: job.description || "",
      applyLink: job.applyLink || "",
      logo: getCompanyLogo(job.company, job.logo),
      category: job.category || "",
      jobType: job.jobType || "",
      applicationMode: job.applicationMode || "",
      workMode: job.workMode || "",
      employmentType: job.employmentType || "",
      lastDate: job.lastDate || "",
      source: job.source || "",
      sourceJobId: job.sourceJobId || "",
      status: job.status || "",
      reviewStatus: job.reviewStatus || "",
    });

    setDuplicateResult(null);
    setEditing(false);
  }

  async function saveChanges() {
    if (!jobId || !form || saving) return;

    if (!form.company?.trim() || !form.role?.trim()) {
      toast.error("Company and role are required.");
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, "importedJobs", jobId), {
        company: form.company.trim(),
        role: form.role.trim(),
        location: form.location?.trim() || "",
        experience: form.experience?.trim() || "",
        education: form.education?.trim() || "",
        salary: form.salary?.trim() || "",
        skills: form.skillsText
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        requiredSkills: form.requiredSkillsText
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        eligibility: form.eligibility?.trim() || "",
        responsibilities: form.responsibilities?.trim() || "",
        benefits: form.benefits?.trim() || "",
        selectionProcess: form.selectionProcess?.trim() || "",
        description: form.description?.trim() || "",
        applyLink: form.applyLink?.trim() || "",
        logo: form.logo?.trim() || "",
        category: form.category?.trim() || "",
        jobType: form.jobType?.trim() || "",
        applicationMode: form.applicationMode?.trim() || "",
        workMode: form.workMode?.trim() || "",
        employmentType: form.employmentType?.trim() || "",
        lastDate: form.lastDate?.trim() || "",
        updatedAt: serverTimestamp(),
      });

      setDuplicateResult(null);
      setEditing(false);
      toast.success("Imported job updated successfully.");
    } catch (error) {
      console.error("Unable to update imported job:", error);
      toast.error("Unable to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function publishJob() {
    if (!job || publishing) return;

    try {
      setPublishing(true);

      const cleanedContent = cleanImportedJobContent(job.description || "");
      const metadata = detectJobMetadata(job.description || "");
      const detectedCompanyRole = detectCompanyAndRole(job.description || "");

      const finalCompany =
        job.company || detectedCompanyRole.company || "";
      const finalRole =
        job.role || detectedCompanyRole.role || "";
      const finalLocation =
        job.location || metadata.locations.join(", ");
      const finalApplyLink = job.applyLink || "";
      const finalSourceJobId = job.sourceJobId || "";

      if (!finalCompany.trim() || !finalRole.trim()) {
        toast.error(
          "Company and role are required before publishing this job."
        );
        return;
      }

      const duplicate = await detectDuplicateJob(db, {
        id: job.id,
        company: finalCompany,
        role: finalRole,
        location: finalLocation,
        applyLink: finalApplyLink,
        sourceJobId: finalSourceJobId,
      });

      setDuplicateResult(duplicate.isDuplicate ? duplicate : null);

      if (duplicate.isDuplicate) {
        const existingTitle = duplicate.existingJob
          ? `${duplicate.existingJob.company || "Unknown company"} — ${
              duplicate.existingJob.role || "Unknown role"
            }`
          : "an existing job";

        const forcePublish = window.confirm(
          `Duplicate job found.\n\n` +
            `Match: ${existingTitle}\n` +
            `Reason: ${duplicate.reason}\n` +
            `Status: ${duplicate.existingStatus || "unknown"}\n\n` +
            `Click OK to publish this job anyway, or Cancel to stop.`
        );

        if (!forcePublish) {
          toast.warning("Publishing stopped because a duplicate job was found.");
          return;
        }
      }

      await setDoc(
        doc(db, "jobs", job.id),
        {
          company: finalCompany,
          role: finalRole,
          location: finalLocation,
          experience: job.experience || metadata.experience || "",
          education: job.education || metadata.education || "",
          salary: job.salary || metadata.salary || "",
          skills: job.skills?.length ? job.skills : metadata.skills,
          requiredSkills: job.requiredSkills || [],
          eligibility:
            job.eligibility?.trim() ||
            cleanedContent.eligibility,
          responsibilities:
            job.responsibilities?.trim() ||
            cleanedContent.responsibilities,
          benefits: job.benefits || "",
          selectionProcess: job.selectionProcess || "",
          description:
            cleanedContent.description ||
            job.description ||
            "",
          applyLink: finalApplyLink,
          logo: getCompanyLogo(finalCompany, job.logo),
          category: job.category || metadata.jobCategory || "experienced",
          jobType: job.jobType || "private",
          applicationMode: job.applicationMode || "direct",
          workMode: job.workMode || metadata.workMode || "",
          employmentType:
            job.employmentType || metadata.employmentType || "",
          lastDate: job.lastDate || metadata.lastDate || "",
          source: job.source || "automatic-import",
          sourceJobId: finalSourceJobId,
          importedJobId: job.id,
          status: "published",
          isActive: true,
          duplicateOverride: duplicate.isDuplicate,
          duplicateOfJobId: duplicate.isDuplicate
            ? duplicate.existingJobId
            : "",
          duplicateReason: duplicate.isDuplicate
            ? duplicate.reason
            : "",
          createdAt: job.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          publishedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await updateDoc(doc(db, "importedJobs", job.id), {
        company: finalCompany,
        role: finalRole,
        location: finalLocation,
        status: "published",
        reviewStatus: "published",
        duplicateOverride: duplicate.isDuplicate,
        duplicateOfJobId: duplicate.isDuplicate
          ? duplicate.existingJobId
          : "",
        duplicateReason: duplicate.isDuplicate
          ? duplicate.reason
          : "",
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success(`${finalRole || "Job"} published successfully.`);
    } catch (error) {
      console.error("Unable to publish job:", error);
      toast.error(
        "Unable to check duplicates or publish this job. Please try again."
      );
    } finally {
      setPublishing(false);
    }
  }

  async function deleteJob() {
    if (!job || deleting) return;

    const confirmed = window.confirm(
      `Delete "${job.role || "this imported job"}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      await deleteDoc(doc(db, "importedJobs", job.id));

      toast.success("Imported job deleted successfully.");
      router.push("/admin/panel/imported-jobs");
    } catch (error) {
      console.error("Unable to delete imported job:", error);
      toast.error("Unable to delete this job. Please try again.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading imported job details...</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !job || !form) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl rounded-xl border bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Imported Job Details
          </h1>
          <p className="mt-4 font-medium text-red-600">
            {errorMessage || "Imported job not found."}
          </p>
          <Link
            href="/admin/panel/imported-jobs"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 font-semibold text-white transition hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Imported Jobs
          </Link>
        </div>
      </div>
    );
  }

  const status =
    job.status === "published"
      ? "Published"
      : job.reviewStatus === "pending"
        ? "Pending Review"
        : job.status || job.reviewStatus || "Draft";

  const isPublished = status === "Published";

  const cleanedDisplayContent = cleanImportedJobContent(job.description || "");

  const displayEligibility =
    job.eligibility?.trim() || cleanedDisplayContent.eligibility;

  const displayResponsibilities =
    job.responsibilities?.trim() || cleanedDisplayContent.responsibilities;

  const displayDescription =
    cleanedDisplayContent.description || job.description || "";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/panel/imported-jobs"
            className="inline-flex items-center gap-2 font-semibold text-gray-600 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Imported Jobs
          </Link>

          <div className="flex flex-wrap gap-2">
            {duplicateResult?.isDuplicate && (
          <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />

              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-amber-900">
                  Duplicate Job Found
                </h2>

                <p className="mt-1 text-sm text-amber-800">
                  {duplicateResult.reason}. Publishing is stopped unless you
                  confirm that you want to create another job.
                </p>

                {duplicateResult.existingJob && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-white p-4 text-sm">
                    <p className="font-semibold text-gray-900">
                      {duplicateResult.existingJob.company || "Unknown company"}
                      {" — "}
                      {duplicateResult.existingJob.role || "Unknown role"}
                    </p>

                    <p className="mt-1 text-gray-600">
                      Location:{" "}
                      {duplicateResult.existingJob.location || "Not specified"}
                    </p>

                    <p className="mt-1 capitalize text-gray-600">
                      Status:{" "}
                      {duplicateResult.existingStatus || "Unknown"}
                    </p>

                    <Link
                      href={`/jobs/${duplicateResult.existingJobId}`}
                      target="_blank"
                      className="mt-3 inline-flex items-center gap-2 font-semibold text-blue-700 hover:text-blue-900"
                    >
                      Open Existing Job
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {editing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveChanges}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? "Saving" : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}

            <button
              type="button"
              onClick={publishJob}
              disabled={isPublished || publishing || editing}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {publishing ? "Publishing" : isPublished ? "Published" : "Publish"}
            </button>

            <button
              type="button"
              onClick={deleteJob}
              disabled={deleting || publishing || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {deleting ? "Deleting" : "Delete"}
            </button>
          </div>
        </div>

        {editing ? (
          <section className="rounded-xl border bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Imported Job
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Update the imported job information before publishing.
            </p>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <FormField
                label="Company"
                value={form.company || ""}
                onChange={(value) => updateForm("company", value)}
              />
              <FormField
                label="Role"
                value={form.role || ""}
                onChange={(value) => updateForm("role", value)}
              />
              <FormField
                label="Location"
                value={form.location || ""}
                onChange={(value) => updateForm("location", value)}
              />
              <FormField
                label="Experience"
                value={form.experience || ""}
                onChange={(value) => updateForm("experience", value)}
              />
              <FormField
                label="Education"
                value={form.education || ""}
                onChange={(value) => updateForm("education", value)}
              />
              <FormField
                label="Salary"
                value={form.salary || ""}
                onChange={(value) => updateForm("salary", value)}
              />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">
                  Category
                </span>

                <select
                  value={form.category || "experienced"}
                  onChange={(event) => updateForm("category", event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="freshers">Freshers</option>
                  <option value="experienced">Experienced</option>
                  <option value="freshers-experienced">Freshers &amp; Experienced</option>
                  <option value="work-from-home">Work From Home</option>
                  <option value="internship">Internship</option>
                  <option value="walk-in-drive">Walk-In Drive</option>
                </select>
              </label>
              <FormField
                label="Job Type"
                value={form.jobType || ""}
                onChange={(value) => updateForm("jobType", value)}
              />
              <FormField
                label="Application Mode"
                value={form.applicationMode || ""}
                onChange={(value) => updateForm("applicationMode", value)}
              />
              <FormField
                label="Work Mode"
                value={form.workMode || ""}
                onChange={(value) => updateForm("workMode", value)}
              />
              <FormField
                label="Employment Type"
                value={form.employmentType || ""}
                onChange={(value) => updateForm("employmentType", value)}
              />
              <FormField
                label="Last Date"
                value={form.lastDate || ""}
                onChange={(value) => updateForm("lastDate", value)}
              />
              <FormField
                label="Apply Link"
                value={form.applyLink || ""}
                onChange={(value) => updateForm("applyLink", value)}
              />
              <FormField
                label="Logo URL"
                value={form.logo || ""}
                onChange={(value) => updateForm("logo", value)}
              />
              <FormField
                label="Skills (comma separated)"
                value={form.skillsText}
                onChange={(value) => updateForm("skillsText", value)}
              />
              <FormField
                label="Required Skills (comma separated)"
                value={form.requiredSkillsText}
                onChange={(value) => updateForm("requiredSkillsText", value)}
              />
            </div>

            <div className="mt-5 space-y-5">
              <FormField
                label="Eligibility"
                value={form.eligibility || ""}
                onChange={(value) => updateForm("eligibility", value)}
                multiline
              />
              <FormField
                label="Responsibilities"
                value={form.responsibilities || ""}
                onChange={(value) => updateForm("responsibilities", value)}
                multiline
              />
              <FormField
                label="Benefits"
                value={form.benefits || ""}
                onChange={(value) => updateForm("benefits", value)}
                multiline
              />
              <FormField
                label="Selection Process"
                value={form.selectionProcess || ""}
                onChange={(value) => updateForm("selectionProcess", value)}
                multiline
              />
              <FormField
                label="Job Description"
                value={form.description || ""}
                onChange={(value) => updateForm("description", value)}
                multiline
              />
            </div>
          </section>
        ) : (
          <>
            <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  {getCompanyLogo(job.company, job.logo) ? (
                    <img
                      src={getCompanyLogo(job.company, job.logo)}
                      alt={`${job.company || "Company"} logo`}
                      className="h-16 w-16 rounded-xl border object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100">
                      <Building2 className="h-8 w-8 text-gray-500" />
                    </div>
                  )}

                  <div>
                    <p className="font-semibold text-blue-600">
                      {job.company || "Company not available"}
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                      {job.role || "Role not available"}
                    </h1>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isPublished
                            ? "bg-green-100 text-green-700"
                            : status === "Pending Review"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {status}
                      </span>

                      {job.category && (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold capitalize text-blue-700">
                          {job.category}
                        </span>
                      )}

                      {job.jobType && (
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold capitalize text-purple-700">
                          {job.jobType}
                        </span>
                      )}

                      {job.workMode && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
                          {job.workMode}
                        </span>
                      )}

                      {job.employmentType && (
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold capitalize text-orange-700">
                          {job.employmentType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {job.applyLink && (
                  <a
                    href={job.applyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Open Application
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <MapPin className="h-4 w-4" />
                    Location
                  </div>
                  <p className="mt-2 font-semibold text-gray-900">
                    {job.location || "Not specified"}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <BriefcaseBusiness className="h-4 w-4" />
                    Experience
                  </div>
                  <p className="mt-2 font-semibold text-gray-900">
                    {job.experience || "Not specified"}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <GraduationCap className="h-4 w-4" />
                    Education
                  </div>
                  <p className="mt-2 font-semibold text-gray-900">
                    {job.education || "Not specified"}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <Wallet className="h-4 w-4" />
                    Salary
                  </div>
                  <p className="mt-2 font-semibold text-gray-900">
                    {job.salary || "Not disclosed"}
                  </p>
                </div>
              </div>
            </div>

            {(job.skills?.length || job.requiredSkills?.length) && (
              <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-gray-900">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {[...(job.skills || []), ...(job.requiredSkills || [])]
                    .filter(
                      (skill, index, allSkills) =>
                        skill && allSkills.indexOf(skill) === index
                    )
                    .map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700"
                      >
                        {skill}
                      </span>
                    ))}
                </div>
              </section>
            )}

            <div className="space-y-6">
              <DetailSection
                title="Eligibility"
                content={displayEligibility}
              />
              <DetailSection
                title="Responsibilities"
                content={displayResponsibilities}
              />
              <DetailSection title="Benefits" content={job.benefits} />
              <DetailSection
                title="Selection Process"
                content={job.selectionProcess}
              />
              <DetailSection
                title="Job Description"
                content={displayDescription}
              />

              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-gray-900">
                  Import Information
                </h2>

                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-gray-500">Source</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {job.source || "Not available"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Source Job ID</p>
                    <p className="mt-1 break-all font-semibold text-gray-900">
                      {job.sourceJobId || "Not available"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Application Mode</p>
                    <p className="mt-1 font-semibold capitalize text-gray-900">
                      {job.applicationMode || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Work Mode</p>
                    <p className="mt-1 font-semibold capitalize text-gray-900">
                      {job.workMode || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Employment Type</p>
                    <p className="mt-1 font-semibold capitalize text-gray-900">
                      {job.employmentType || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Last Date</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {job.lastDate || "Not specified"}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}