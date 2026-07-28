"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  IndianRupee,
  Link as LinkIcon,
  Loader2,
  MapPin,
  Save,
  Users,
} from "lucide-react";
import { db } from "@/lib/firebase";

type GovernmentJobForm = {
  organization: string;
  department: string;
  postName: string;
  location: string;
  qualification: string;
  category: string;
  vacancies: string;
  ageLimit: string;
  salary: string;
  applicationStartDate: string;
  lastDate: string;
  examDate: string;
  notificationLink: string;
  applyLink: string;
  selectionProcess: string;
  applicationFee: string;
  jobLevel: string;
  officialWebsite: string;
  selectionMode: string;
  description: string;
};

const initialForm: GovernmentJobForm = {
  organization: "",
  department: "",
  postName: "",
  location: "",
  qualification: "",
  category: "freshers",
  vacancies: "",
  ageLimit: "",
  salary: "",
  applicationStartDate: "",
  lastDate: "",
  examDate: "",
  notificationLink: "",
  applyLink: "",
  selectionProcess: "",
  applicationFee: "",
  jobLevel: "state-government",
  officialWebsite: "",
  selectionMode: "online",
  description: "",
};

export default function AddGovernmentJobPage() {
  const router = useRouter();

  const [form, setForm] = useState<GovernmentJobForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(
    field: keyof GovernmentJobForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateForm() {
    if (!form.organization.trim()) {
      return "Please enter the organization name.";
    }

    if (!form.postName.trim()) {
      return "Please enter the post name.";
    }

    if (!form.location.trim()) {
      return "Please enter the job location.";
    }

    if (!form.qualification.trim()) {
      return "Please enter the qualification.";
    }

    if (!form.lastDate) {
      return "Please select the last application date.";
    }

    if (!form.applyLink.trim()) {
      return "Please enter the official application link.";
    }

    try {
      new URL(form.applyLink.trim());
    } catch {
      return "Please enter a valid application link.";
    }

    if (form.notificationLink.trim()) {
      try {
        new URL(form.notificationLink.trim());
      } catch {
        return "Please enter a valid notification link.";
      }
    }

    if (form.officialWebsite.trim()) {
      try {
        new URL(form.officialWebsite.trim());
      } catch {
        return "Please enter a valid official website link.";
      }
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      await addDoc(collection(db, "jobs"), {
        company: form.organization.trim(),
        organization: form.organization.trim(),
        department: form.department.trim(),
        title: form.postName.trim(),
        role: form.postName.trim(),
        postName: form.postName.trim(),
        location: form.location.trim(),
        qualification: form.qualification.trim(),
        category: form.category,
        type: "government",
        vacancies: form.vacancies.trim(),
        ageLimit: form.ageLimit.trim(),
        salary: form.salary.trim(),
        applicationStartDate: form.applicationStartDate || "",
        lastDate: form.lastDate,
        examDate: form.examDate || "",
        notificationLink: form.notificationLink.trim(),
        applyLink: form.applyLink.trim(),
        selectionProcess: form.selectionProcess.trim(),
        applicationFee: form.applicationFee.trim(),
        jobLevel: form.jobLevel,
        officialWebsite: form.officialWebsite.trim(),
        selectionMode: form.selectionMode,
        description: form.description.trim(),
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess("Government job added successfully.");
      setForm(initialForm);

      setTimeout(() => {
        router.push("/admin/panel/manage-jobs");
      }, 700);
    } catch (submitError) {
      console.error("Unable to add government job:", submitError);
      setError("Unable to add the government job. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
          Government Jobs
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          Add Government Job
        </h1>

        <p className="mt-3 text-slate-600">
          Add a new government vacancy to the Corporate Jobs Network portal.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      >
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <section>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Building2 className="h-5 w-5 text-blue-700" />
            Job Information
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field
              label="Organization / Board"
              required
              value={form.organization}
              placeholder="Example: Karnataka Milk Federation"
              onChange={(value) => updateField("organization", value)}
            />

            <Field
              label="Department"
              value={form.department}
              placeholder="Example: Recruitment Department"
              onChange={(value) => updateField("department", value)}
            />

            <Field
              label="Post Name"
              required
              value={form.postName}
              placeholder="Example: Junior Assistant"
              onChange={(value) => updateField("postName", value)}
            />

            <Field
              label="Location"
              required
              value={form.location}
              placeholder="Example: Karnataka"
              onChange={(value) => updateField("location", value)}
              icon={<MapPin className="h-4 w-4" />}
            />

            <Field
              label="Qualification"
              required
              value={form.qualification}
              placeholder="Example: Any Degree"
              onChange={(value) => updateField("qualification", value)}
            />

            <SelectField
              label="Candidate Category"
              value={form.category}
              onChange={(value) => updateField("category", value)}
              options={[
                { label: "Freshers", value: "freshers" },
                { label: "Experienced", value: "experienced" },
                { label: "Freshers & Experienced", value: "all" },
              ]}
            />

            <Field
              label="Total Vacancies"
              value={form.vacancies}
              placeholder="Example: 250"
              onChange={(value) => updateField("vacancies", value)}
              icon={<Users className="h-4 w-4" />}
            />

            <Field
              label="Age Limit"
              value={form.ageLimit}
              placeholder="Example: 18–35 years"
              onChange={(value) => updateField("ageLimit", value)}
            />

            <Field
              label="Salary"
              value={form.salary}
              placeholder="Example: ₹21,400–₹42,000 per month"
              onChange={(value) => updateField("salary", value)}
              icon={<IndianRupee className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="border-t border-slate-200 pt-8">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <CalendarDays className="h-5 w-5 text-blue-700" />
            Important Dates
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <DateField
              label="Application Start Date"
              value={form.applicationStartDate}
              onChange={(value) =>
                updateField("applicationStartDate", value)
              }
            />

            <DateField
              label="Last Date"
              required
              value={form.lastDate}
              onChange={(value) => updateField("lastDate", value)}
            />

            <DateField
              label="Exam Date"
              value={form.examDate}
              onChange={(value) => updateField("examDate", value)}
            />
          </div>
        </section>

        <section className="border-t border-slate-200 pt-8">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <FileText className="h-5 w-5 text-blue-700" />
            Recruitment Details
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field
              label="Selection Process"
              value={form.selectionProcess}
              placeholder="Example: Written Exam + Interview"
              onChange={(value) => updateField("selectionProcess", value)}
            />

            <Field
              label="Application Fee"
              value={form.applicationFee}
              placeholder="Example: General ₹500, SC/ST Nil"
              onChange={(value) => updateField("applicationFee", value)}
              icon={<IndianRupee className="h-4 w-4" />}
            />

            <SelectField
              label="Job Level"
              value={form.jobLevel}
              onChange={(value) => updateField("jobLevel", value)}
              options={[
                { label: "Central Government", value: "central-government" },
                { label: "State Government", value: "state-government" },
                { label: "PSU", value: "psu" },
                { label: "Bank", value: "bank" },
                { label: "Railway", value: "railway" },
                { label: "Defence", value: "defence" },
                { label: "University", value: "university" },
                { label: "Other", value: "other" },
              ]}
            />

            <SelectField
              label="Application Mode"
              value={form.selectionMode}
              onChange={(value) => updateField("selectionMode", value)}
              options={[
                { label: "Online", value: "online" },
                { label: "Offline", value: "offline" },
                { label: "Walk-in", value: "walk-in" },
              ]}
            />
          </div>
        </section>

        <section className="border-t border-slate-200 pt-8">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <LinkIcon className="h-5 w-5 text-blue-700" />
            Official Links
          </h2>

          <div className="mt-5 grid gap-5">
            <Field
              label="Official Notification Link"
              type="url"
              value={form.notificationLink}
              placeholder="https://example.gov.in/notification"
              onChange={(value) =>
                updateField("notificationLink", value)
              }
            />

            <Field
              label="Official Website"
              type="url"
              value={form.officialWebsite}
              placeholder="https://example.gov.in"
              onChange={(value) => updateField("officialWebsite", value)}
            />

            <Field
              label="Official Apply Link"
              type="url"
              required
              value={form.applyLink}
              placeholder="https://example.gov.in/apply"
              onChange={(value) => updateField("applyLink", value)}
            />
          </div>
        </section>

        <section className="border-t border-slate-200 pt-8">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <FileText className="h-5 w-5 text-blue-700" />
            Job Description
          </h2>

          <div className="mt-5">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Description
            </label>

            <textarea
              id="description"
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Enter eligibility, syllabus, reservation details and other important information."
              rows={8}
              disabled={saving}
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={saving}
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Add Government Job
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "url";
  icon?: React.ReactNode;
  onChange: (value: string) => void;
};

function Field({
  label,
  value,
  placeholder,
  required = false,
  type = "text",
  icon,
  onChange,
}: FieldProps) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}

        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-xl border border-slate-300 bg-white py-3 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 ${
            icon ? "pl-11" : "pl-4"
          }`}
        />
      </div>
    </div>
  );
}

type DateFieldProps = {
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
};

function DateField({
  label,
  value,
  required = false,
  onChange,
}: DateFieldProps) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>

      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  options: Array<{
    label: string;
    value: string;
  }>;
  onChange: (value: string) => void;
};

function SelectField({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}