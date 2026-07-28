"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Landmark,
  Link2,
  Loader2,
  MapPin,
  Save,
} from "lucide-react";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
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
  applicationMode: string;
  officialWebsite: string;
  description: string;
};

const initialForm: GovernmentJobForm = {
  organization: "",
  department: "",
  postName: "",
  location: "",
  qualification: "",
  category: "government",
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
  jobLevel: "",
  applicationMode: "",
  officialWebsite: "",
  description: "",
};

export default function EditGovernmentJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const jobId = params?.id;

  const [form, setForm] = useState<GovernmentJobForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadGovernmentJob() {
      if (!jobId) {
        setError("Invalid government job ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const jobReference = doc(db, "jobs", jobId);
        const jobSnapshot = await getDoc(jobReference);

        if (!jobSnapshot.exists()) {
          setError("Government job not found.");
          return;
        }

        const data = jobSnapshot.data();
        const jobType = String(data.type ?? "").trim().toLowerCase();

        if (jobType && jobType !== "government") {
          setError("This record is not a government job.");
          return;
        }

        setForm({
          organization: String(
            data.organization ?? data.company ?? ""
          ),
          department: String(data.department ?? ""),
          postName: String(
            data.postName ?? data.role ?? data.title ?? ""
          ),
          location: String(data.location ?? ""),
          qualification: String(data.qualification ?? ""),
          category: String(data.category ?? "government"),
          vacancies: String(data.vacancies ?? ""),
          ageLimit: String(data.ageLimit ?? ""),
          salary: String(data.salary ?? ""),
          applicationStartDate: String(
            data.applicationStartDate ?? ""
          ),
          lastDate: String(data.lastDate ?? ""),
          examDate: String(data.examDate ?? ""),
          notificationLink: String(data.notificationLink ?? ""),
          applyLink: String(data.applyLink ?? ""),
          selectionProcess: String(data.selectionProcess ?? ""),
          applicationFee: String(data.applicationFee ?? ""),
          jobLevel: String(data.jobLevel ?? ""),
          applicationMode: String(data.applicationMode ?? data.selectionMode ?? ""),
          officialWebsite: String(data.officialWebsite ?? ""),
          description: String(data.description ?? ""),
        });
      } catch (loadError) {
        console.error("Failed to load government job:", loadError);
        setError("Unable to load the government job. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadGovernmentJob();
  }, [jobId]);

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (error) setError("");
    if (success) setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!jobId) {
      setError("Invalid government job ID.");
      return;
    }

    const organization = form.organization.trim();
    const postName = form.postName.trim();
    const location = form.location.trim();
    const qualification = form.qualification.trim();
    const lastDate = form.lastDate.trim();
    const applyLink = form.applyLink.trim();

    if (!organization) {
      setError("Organization name is required.");
      return;
    }

    if (!postName) {
      setError("Post name is required.");
      return;
    }

    if (!location) {
      setError("Location is required.");
      return;
    }

    if (!qualification) {
      setError("Qualification is required.");
      return;
    }

    if (!lastDate) {
      setError("Last date is required.");
      return;
    }

    if (!applyLink) {
      setError("Application link is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const jobReference = doc(db, "jobs", jobId);

      await updateDoc(jobReference, {
        organization,
        company: organization,

        department: form.department.trim(),

        postName,
        title: postName,
        role: postName,

        location,
        qualification,

        category: form.category.trim() || "government",
        type: "government",

        vacancies: form.vacancies.trim(),
        ageLimit: form.ageLimit.trim(),
        salary: form.salary.trim() || "N/A",

        applicationStartDate: form.applicationStartDate.trim(),
        lastDate,
        examDate: form.examDate.trim(),

        notificationLink: form.notificationLink.trim(),
        applyLink,
        selectionProcess: form.selectionProcess.trim(),
        applicationFee: form.applicationFee.trim(),
        jobLevel: form.jobLevel.trim(),
        applicationMode: form.applicationMode.trim(),
        officialWebsite: form.officialWebsite.trim(),

        description: form.description.trim(),

        status: "active",
        updatedAt: serverTimestamp(),
      });

      setSuccess("Government job updated successfully.");

      window.setTimeout(() => {
        router.push("/admin/panel/manage-jobs");
      }, 1200);
    } catch (updateError) {
      console.error("Failed to update government job:", updateError);
      setError("Unable to update the government job. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
          <span className="font-semibold text-slate-700">
            Loading government job...
          </span>
        </div>
      </div>
    );
  }

  if (error && !form.organization) {
    return (
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push("/admin/panel/manage-jobs")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          Back to Manage Jobs
        </button>

        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-bold">Unable to open this job</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-blue-700">Admin Panel</p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Edit Government Job
          </h1>

          <p className="mt-2 text-slate-600">
            Update the government job information below.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/admin/panel/manage-jobs")}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
          Manage Jobs
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="mb-7 flex items-center gap-4 rounded-2xl bg-blue-50 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 text-white">
            <Landmark size={24} />
          </div>

          <div>
            <h2 className="font-bold text-slate-900">
              Government Job Details
            </h2>
            <p className="text-sm text-slate-600">
              Fields marked with * are required.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
          >
            {success}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Organization Name"
            name="organization"
            value={form.organization}
            onChange={handleChange}
            placeholder="Example: Karnataka Public Service Commission"
            required
          />

          <Field
            label="Department"
            name="department"
            value={form.department}
            onChange={handleChange}
            placeholder="Example: Revenue Department"
          />

          <Field
            label="Post Name"
            name="postName"
            value={form.postName}
            onChange={handleChange}
            placeholder="Example: Junior Assistant"
            required
          />

          <Field
            label="Location"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Example: Karnataka"
            required
            icon={<MapPin size={18} />}
          />

          <Field
            label="Qualification"
            name="qualification"
            value={form.qualification}
            onChange={handleChange}
            placeholder="Example: Any Degree"
            required
          />

          <div>
            <label
              htmlFor="category"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Category *
            </label>

            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              <option value="government">Government</option>
              <option value="central-government">
                Central Government
              </option>
              <option value="state-government">
                State Government
              </option>
              <option value="banking">Banking</option>
              <option value="railway">Railway</option>
              <option value="defence">Defence</option>
              <option value="teaching">Teaching</option>
              <option value="public-sector">Public Sector</option>
            </select>
          </div>

          <Field
            label="Number of Vacancies"
            name="vacancies"
            value={form.vacancies}
            onChange={handleChange}
            placeholder="Example: 250"
          />

          <Field
            label="Age Limit"
            name="ageLimit"
            value={form.ageLimit}
            onChange={handleChange}
            placeholder="Example: 18 to 35 years"
          />

          <Field
            label="Salary"
            name="salary"
            value={form.salary}
            onChange={handleChange}
            placeholder="Example: ₹25,500 - ₹81,100"
          />

          <Field
            label="Application Start Date"
            name="applicationStartDate"
            value={form.applicationStartDate}
            onChange={handleChange}
            type="date"
            icon={<CalendarDays size={18} />}
          />

          <Field
            label="Last Date"
            name="lastDate"
            value={form.lastDate}
            onChange={handleChange}
            type="date"
            required
            icon={<CalendarDays size={18} />}
          />

          <Field
            label="Exam Date"
            name="examDate"
            value={form.examDate}
            onChange={handleChange}
            type="date"
            icon={<CalendarDays size={18} />}
          />

          <Field
            label="Notification Link"
            name="notificationLink"
            value={form.notificationLink}
            onChange={handleChange}
            type="url"
            placeholder="https://..."
            icon={<FileText size={18} />}
          />

          <Field
            label="Application Link"
            name="applyLink"
            value={form.applyLink}
            onChange={handleChange}
            type="url"
            placeholder="https://..."
            required
            icon={<Link2 size={18} />}
          />

          <Field
            label="Selection Process"
            name="selectionProcess"
            value={form.selectionProcess}
            onChange={handleChange}
            placeholder="Example: Written Exam + Interview"
          />

          <Field
            label="Application Fee"
            name="applicationFee"
            value={form.applicationFee}
            onChange={handleChange}
            placeholder="Example: General ₹500, SC/ST Nil"
          />

          <div>
            <label
              htmlFor="jobLevel"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Job Level
            </label>

            <select
              id="jobLevel"
              name="jobLevel"
              value={form.jobLevel}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Select job level</option>
              <option value="Central Government">Central Government</option>
              <option value="State Government">State Government</option>
              <option value="PSU">PSU</option>
              <option value="Bank">Bank</option>
              <option value="Railway">Railway</option>
              <option value="Defence">Defence</option>
              <option value="University">University</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="applicationMode"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Application Mode
            </label>

            <select
              id="applicationMode"
              name="applicationMode"
              value={form.applicationMode}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Select application mode</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
              <option value="Walk-in">Walk-in</option>
            </select>
          </div>

          <Field
            label="Official Website"
            name="officialWebsite"
            value={form.officialWebsite}
            onChange={handleChange}
            type="url"
            placeholder="https://example.gov.in"
            icon={<Link2 size={18} />}
          />
        </div>

        <div className="mt-5">
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Description
          </label>

          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={7}
            placeholder="Enter eligibility, selection process, important instructions and other details..."
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/admin/panel/manage-jobs")}
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save size={20} />
                Update Government Job
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
  name: keyof GovernmentJobForm;
  value: string;
  onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
};

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  icon,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
        {required ? " *" : ""}
      </label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
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