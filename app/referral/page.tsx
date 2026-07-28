"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { sendReferralStatusEmail } from "@/lib/email";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Send,
} from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";

type ReferralForm = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  careerGap: string;
  company: string;
  jobRole: string;
  jobId: string;
  experience: string;
  location: string;
  linkedin: string;
  resumeLink: string;
  message: string;
};

const initialForm: ReferralForm = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  careerGap: "",
  company: "",
  jobRole: "",
  jobId: "",
  experience: "",
  location: "",
  linkedin: "",
  resumeLink: "",
  message: "",
};

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isGoogleDriveLink(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    return (
      hostname === "drive.google.com" ||
      hostname.endsWith(".drive.google.com") ||
      hostname === "docs.google.com" ||
      hostname.endsWith(".docs.google.com")
    );
  } catch {
    return false;
  }
}

export default function ReferralPage() {
  const [form, setForm] = useState<ReferralForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }

    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const validateForm = (): string => {
    if (!form.fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!form.email.trim()) {
      return "Please enter your email address.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(form.email.trim())) {
      return "Please enter a valid email address.";
    }

    if (!form.phone.trim()) {
      return "Please enter your mobile number.";
    }

    const phonePattern = /^[0-9+\-\s()]{10,15}$/;

    if (!phonePattern.test(form.phone.trim())) {
      return "Please enter a valid mobile number.";
    }

    if (!form.dateOfBirth) {
      return "Please select your date of birth.";
    }

    const selectedDate = new Date(form.dateOfBirth);
    const today = new Date();

    if (Number.isNaN(selectedDate.getTime()) || selectedDate >= today) {
      return "Please enter a valid date of birth.";
    }

    if (!form.careerGap.trim()) {
      return "Please select your career gap status.";
    }

    if (!form.company.trim()) {
      return "Please enter the company name.";
    }

    if (!form.jobRole.trim()) {
      return "Please enter the job role.";
    }

    if (!form.experience.trim()) {
      return "Please select your experience.";
    }

    if (!form.location.trim()) {
      return "Please enter your current location.";
    }

    if (!form.resumeLink.trim()) {
      return "Please paste your Google Drive resume link.";
    }

    if (!isValidUrl(form.resumeLink.trim())) {
      return "Please enter a valid resume link.";
    }

    if (!isGoogleDriveLink(form.resumeLink.trim())) {
      return "Please use a Google Drive resume link.";
    }

    if (form.linkedin.trim() && !isValidUrl(form.linkedin.trim())) {
      return "Please enter a valid LinkedIn profile link.";
    }

    return "";
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const candidateEmailData = {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        company: form.company.trim(),
        jobRole: form.jobRole.trim(),
        jobId: form.jobId.trim(),
      };

      await addDoc(collection(db, "referralRequests"), {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
        careerGap: form.careerGap.trim(),
        company: form.company.trim(),
        jobRole: form.jobRole.trim(),
        jobId: form.jobId.trim(),
        experience: form.experience.trim(),
        location: form.location.trim(),
        linkedin: form.linkedin.trim(),
        message: form.message.trim(),

        // Keep resumeUrl for compatibility with the admin referral page.
        resumeUrl: form.resumeLink.trim(),
        resumeLink: form.resumeLink.trim(),
        resumeName: "Google Drive Resume",
        resumeStoragePath: "",

        status: "application_received",
        createdAt: serverTimestamp(),
      });

      try {
        await sendReferralStatusEmail(
          candidateEmailData,
          "application_received"
        );
      } catch (emailError) {
        console.error("Application received email failed:", emailError);
        // The application is already saved in Firestore, so do not fail the form.
      }

      setForm(initialForm);

      setSuccessMessage(
        "Your referral request has been submitted successfully. Our team will review your details and resume link."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Referral submission error:", error);

      setErrorMessage(
        "Unable to submit your referral request. Please check your internet connection and Firestore rules, then try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 px-4 py-14 text-white sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-100 sm:px-5 sm:text-sm">
            <FileText size={18} />
            Referral Request
          </span>

          <h1 className="mt-6 text-3xl font-extrabold sm:text-5xl">
            Submit Your Resume for Referral
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-slate-200 sm:text-lg sm:leading-8">
            Share your job details and paste a public Google Drive link
            to your resume. Our team will review your request and contact
            you when a suitable referral opportunity is available.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.5fr]">
          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h2 className="text-2xl font-extrabold text-slate-900">
                Before You Submit
              </h2>

              <div className="mt-6 space-y-4 text-sm leading-6 text-slate-600">
                <p className="flex gap-3">
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-green-600"
                  />
                  Upload your latest resume to Google Drive.
                </p>

                <p className="flex gap-3">
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-green-600"
                  />
                  Set resume access to “Anyone with the link”.
                </p>

                <p className="flex gap-3">
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-green-600"
                  />
                  Paste the correct company, role, and Job ID.
                </p>

                <p className="flex gap-3">
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-green-600"
                  />
                  Referral is not guaranteed and depends on eligibility
                  and job availability.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-blue-700 p-6 text-white shadow-sm sm:p-7">
              <h3 className="text-xl font-extrabold">
                Important Safety Notice
              </h3>

              <p className="mt-4 text-sm leading-7 text-blue-50">
                Corporate Jobs Network does not charge candidates for
                referrals or job applications. Never share OTPs,
                passwords, or banking information.
              </p>
            </div>
          </aside>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-9">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
                Candidate Details
              </p>

              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Referral Application Form
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Fields marked with * are required.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Full Name *
                  </label>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Email Address *
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Mobile Number *
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter mobile number"
                    autoComplete="tel"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Current Location *
                  </label>

                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Example: Bengaluru"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="dateOfBirth"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Date of Birth *
                  </label>

                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="careerGap"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Career Gap *
                  </label>

                  <select
                    id="careerGap"
                    name="careerGap"
                    value={form.careerGap}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Select career gap</option>
                    <option value="No career gap">No career gap</option>
                    <option value="Less than 6 months">Less than 6 months</option>
                    <option value="6-12 months">6–12 months</option>
                    <option value="1-2 years">1–2 years</option>
                    <option value="More than 2 years">More than 2 years</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="company"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Company Name *
                  </label>

                  <input
                    id="company"
                    name="company"
                    type="text"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="Example: Infosys"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="jobRole"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Job Role *
                  </label>

                  <input
                    id="jobRole"
                    name="jobRole"
                    type="text"
                    value={form.jobRole}
                    onChange={handleChange}
                    placeholder="Example: Java Developer"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="jobId"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Job ID / Reference Number
                  </label>

                  <input
                    id="jobId"
                    name="jobId"
                    type="text"
                    value={form.jobId}
                    onChange={handleChange}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="experience"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Experience *
                  </label>

                  <select
                    id="experience"
                    name="experience"
                    value={form.experience}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Select experience</option>
                    <option value="Fresher">Fresher</option>
                    <option value="0-1 years">0–1 years</option>
                    <option value="1-2 years">1–2 years</option>
                    <option value="2-3 years">2–3 years</option>
                    <option value="3-5 years">3–5 years</option>
                    <option value="5+ years">5+ years</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="linkedin"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  LinkedIn Profile
                </label>

                <input
                  id="linkedin"
                  name="linkedin"
                  type="url"
                  value={form.linkedin}
                  onChange={handleChange}
                  placeholder="https://www.linkedin.com/in/your-profile"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="resumeLink"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Google Drive Resume Link *
                </label>

                <div className="relative">
                  <Link2
                    size={20}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="resumeLink"
                    name="resumeLink"
                    type="url"
                    value={form.resumeLink}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                  <p className="font-bold">
                    How to share your resume:
                  </p>

                  <p className="mt-1">
                    Upload the resume to Google Drive → click Share →
                    change access to “Anyone with the link” → copy and
                    paste the link above.
                  </p>
                </div>

                {form.resumeLink.trim() &&
                  isValidUrl(form.resumeLink.trim()) && (
                    <a
                      href={form.resumeLink.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900"
                    >
                      <ExternalLink size={16} />
                      Test resume link
                    </a>
                  )}
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Additional Message
                </label>

                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={5}
                  maxLength={1000}
                  placeholder="Mention any additional information..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />

                <p className="mt-2 text-right text-xs text-slate-500">
                  {form.message.length}/1000
                </p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm font-medium text-green-700"
                >
                  <CheckCircle2
                    size={21}
                    className="mt-0.5 shrink-0"
                  />

                  <span>{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-4 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Submit Referral Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}