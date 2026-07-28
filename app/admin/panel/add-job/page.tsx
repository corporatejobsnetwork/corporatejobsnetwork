"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";

type JobType = "private" | "government";

type JobCategory =
  | "freshers"
  | "experienced"
  | "freshers-experienced"
  | "work-from-home"
  | "internship"
  | "walk-in";

type ApplicationMode = "direct" | "referral" | "both";

function convertToList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AddJobPage() {
  const router = useRouter();

  const [company, setCompany] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [education, setEducation] = useState("");

  const [primarySkills, setPrimarySkills] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [eligibilityCriteria, setEligibilityCriteria] = useState("");

  const [jobDescription, setJobDescription] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [benefits, setBenefits] = useState("");
  const [selectionProcess, setSelectionProcess] = useState("");

  const [salary, setSalary] = useState("");
  const [lastDate, setLastDate] = useState("");
  const [applyLink, setApplyLink] = useState("");

  const [jobType, setJobType] = useState<JobType>("private");
  const [category, setCategory] =
    useState<JobCategory>("freshers");

  const [applicationMode, setApplicationMode] =
    useState<ApplicationMode>("direct");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const directApplyEnabled =
    applicationMode === "direct" || applicationMode === "both";

  const referralEnabled =
    applicationMode === "referral" || applicationMode === "both";

  function resetForm() {
    setCompany("");
    setCompanyLogo("");
    setRole("");
    setLocation("");
    setExperience("");
    setEducation("");

    setPrimarySkills("");
    setRequiredSkills("");
    setEligibilityCriteria("");

    setJobDescription("");
    setResponsibilities("");
    setBenefits("");
    setSelectionProcess("");

    setSalary("");
    setLastDate("");
    setApplyLink("");

    setJobType("private");
    setCategory("freshers");
    setApplicationMode("direct");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccess("");
    setError("");

    if (
      !company.trim() ||
      !role.trim() ||
      !location.trim() ||
      !experience.trim() ||
      !education.trim() ||
      !primarySkills.trim() ||
      !requiredSkills.trim() ||
      !eligibilityCriteria.trim()
    ) {
      setError(
        "Please fill in company, job role, location, experience, education, primary skills, required skills and eligibility criteria."
      );
      return;
    }

    if (directApplyEnabled && !applyLink.trim()) {
      setError(
        "Application link is required when Direct Apply is selected."
      );
      return;
    }

    const primarySkillsList = convertToList(primarySkills);
    const requiredSkillsList = convertToList(requiredSkills);
    const eligibilityCriteriaList =
      convertToList(eligibilityCriteria);

    const responsibilitiesList =
      convertToList(responsibilities);

    const benefitsList = convertToList(benefits);

    const selectionProcessList =
      convertToList(selectionProcess);

    try {
      setLoading(true);

      await addDoc(collection(db, "jobs"), {
        company: company.trim(),
        companyLogo: companyLogo.trim(),
        role: role.trim(),
        location: location.trim(),
        experience: experience.trim(),
        education: education.trim(),

        primarySkills: primarySkillsList,
        requiredSkills: requiredSkillsList,
        eligibilityCriteria: eligibilityCriteriaList,

        jobDescription: jobDescription.trim(),
        responsibilities: responsibilitiesList,
        benefits: benefitsList,
        selectionProcess: selectionProcessList,

        salary: salary.trim() || "N/A",
        lastDate: lastDate || "N/A",

        applicationMode: {
          directApply: directApplyEnabled,
          referral: referralEnabled,
        },

        applyLink: directApplyEnabled ? applyLink.trim() : "",

        type: jobType,
        category,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess("Job added successfully.");

      resetForm();

      router.push("/admin/panel/manage-jobs");
    } catch (submitError) {
      console.error("Failed to add job:", submitError);
      setError("Unable to add the job. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="font-semibold text-blue-700">
            Admin Panel
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Add New Job
          </h1>

          <p className="mt-2 text-slate-600">
            Enter the complete job details below.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="company"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Company
              </label>

              <input
                id="company"
                type="text"
                value={company}
                onChange={(event) =>
                  setCompany(event.target.value)
                }
                placeholder="Example: Infosys"
                disabled={loading}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="companyLogo"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Company Logo URL
                <span className="ml-2 text-xs font-normal text-slate-500">
                  Optional
                </span>
              </label>

              <input
                id="companyLogo"
                type="url"
                value={companyLogo}
                onChange={(event) =>
                  setCompanyLogo(event.target.value)
                }
                placeholder="https://example.com/company-logo.png"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Paste a public image URL. Leave blank to show the default company icon.
              </p>
            </div>

            <div>
              <label
                htmlFor="role"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Job Role
              </label>

              <input
                id="role"
                type="text"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value)
                }
                placeholder="Example: Software Engineer"
                disabled={loading}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="jobType"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Job Type
              </label>

              <select
                id="jobType"
                value={jobType}
                onChange={(event) =>
                  setJobType(event.target.value as JobType)
                }
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="private">Private Job</option>
                <option value="government">
                  Government Job
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Job Category
              </label>

              <select
                id="category"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value as JobCategory
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="freshers">Freshers</option>
                <option value="experienced">
                  Experienced
                </option>
                <option value="freshers-experienced">
                  Freshers &amp; Experienced
                </option>
                <option value="work-from-home">
                  Work From Home
                </option>
                <option value="internship">
                  Internship
                </option>
                <option value="walk-in">
                  Walk-In Drive
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="location"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Location
              </label>

              <input
                id="location"
                type="text"
                value={location}
                onChange={(event) =>
                  setLocation(event.target.value)
                }
                placeholder="Example: Bengaluru"
                disabled={loading}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="experience"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Experience
              </label>

              <input
                id="experience"
                type="text"
                value={experience}
                onChange={(event) =>
                  setExperience(event.target.value)
                }
                placeholder="Example: Freshers or 0–1 years"
                disabled={loading}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="education"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Education
              </label>

              <input
                id="education"
                type="text"
                value={education}
                onChange={(event) =>
                  setEducation(event.target.value)
                }
                placeholder="Example: B.E / B.Tech / BCA / MCA / Any Degree"
                disabled={loading}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="primarySkills"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Primary Skills
              </label>

              <textarea
                id="primarySkills"
                value={primarySkills}
                onChange={(event) =>
                  setPrimarySkills(event.target.value)
                }
                placeholder="Example: Java, Spring Boot, SQL, React"
                disabled={loading}
                required
                rows={3}
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Separate each skill using a comma or new line.
              </p>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="requiredSkills"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Required Skills
              </label>

              <textarea
                id="requiredSkills"
                value={requiredSkills}
                onChange={(event) =>
                  setRequiredSkills(event.target.value)
                }
                placeholder="Example: Communication, Problem solving, Teamwork"
                disabled={loading}
                required
                rows={4}
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Separate each skill using a comma or new line.
              </p>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="eligibilityCriteria"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Eligibility Criteria
              </label>

              <textarea
                id="eligibilityCriteria"
                value={eligibilityCriteria}
                onChange={(event) =>
                  setEligibilityCriteria(event.target.value)
                }
                placeholder={`Example:
2025/2026 pass-out
Minimum 60% throughout academics
No active backlogs
Immediate joiners preferred`}
                disabled={loading}
                required
                rows={5}
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Required. Enter each criterion on a new line or
                separate them with commas.
              </p>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="jobDescription"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Job Description
                <span className="ml-2 text-xs font-normal text-slate-500">
                  Optional
                </span>
              </label>

              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(event) =>
                  setJobDescription(event.target.value)
                }
                placeholder="Enter the complete job description"
                disabled={loading}
                rows={6}
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="responsibilities"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Responsibilities
                <span className="ml-2 text-xs font-normal text-slate-500">
                  Optional
                </span>
              </label>

              <textarea
                id="responsibilities"
                value={responsibilities}
                onChange={(event) =>
                  setResponsibilities(event.target.value)
                }
                placeholder={`Example:
Develop and maintain applications
Fix defects
Work with the development team`}
                disabled={loading}
                rows={5}
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="benefits"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Benefits
                <span className="ml-2 text-xs font-normal text-slate-500">
                  Optional
                </span>
              </label>

              <textarea
                id="benefits"
                value={benefits}
                onChange={(event) =>
                  setBenefits(event.target.value)
                }
                placeholder={`Example:
Health insurance
Learning opportunities
Hybrid work`}
                disabled={loading}
                rows={4}
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="selectionProcess"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Selection Process
                <span className="ml-2 text-xs font-normal text-slate-500">
                  Optional
                </span>
              </label>

              <textarea
                id="selectionProcess"
                value={selectionProcess}
                onChange={(event) =>
                  setSelectionProcess(event.target.value)
                }
                placeholder={`Example:
Online assessment
Technical interview
HR interview`}
                disabled={loading}
                rows={4}
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="salary"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Salary
                <span className="ml-2 text-xs font-normal text-slate-500">
                  Optional
                </span>
              </label>

              <input
                id="salary"
                type="text"
                value={salary}
                onChange={(event) =>
                  setSalary(event.target.value)
                }
                placeholder="Example: 4–6 LPA"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="lastDate"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Last Date
                <span className="ml-2 text-xs font-normal text-slate-500">
                  Optional
                </span>
              </label>

              <input
                id="lastDate"
                type="date"
                value={lastDate}
                onChange={(event) =>
                  setLastDate(event.target.value)
                }
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="applicationMode"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Application Mode
              </label>

              <select
                id="applicationMode"
                value={applicationMode}
                onChange={(event) =>
                  setApplicationMode(
                    event.target.value as ApplicationMode
                  )
                }
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="direct">
                  Direct Apply Only
                </option>

                <option value="referral">
                  Referral Only
                </option>

                <option value="both">
                  Direct Apply and Referral
                </option>
              </select>

              <p className="mt-2 text-xs text-slate-500">
                Referral jobs will open the Corporate Jobs
                Network candidate referral page.
              </p>
            </div>

            {directApplyEnabled && (
              <div className="md:col-span-2">
                <label
                  htmlFor="applyLink"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Direct Application Link
                </label>

                <input
                  id="applyLink"
                  type="url"
                  value={applyLink}
                  onChange={(event) =>
                    setApplyLink(event.target.value)
                  }
                  placeholder="https://company.com/apply"
                  disabled={loading}
                  required={directApplyEnabled}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                />

                <p className="mt-2 text-xs text-slate-500">
                  This field is required for Direct Apply and
                  Both application modes.
                </p>
              </div>
            )}

            {referralEnabled && (
              <div className="md:col-span-2">
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
                  <p className="font-bold text-violet-800">
                    Referral Available
                  </p>

                  <p className="mt-2 text-sm leading-6 text-violet-700">
                    The Request Referral button will open the
                    candidate referral page and automatically pass
                    this job ID.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
            >
              {success}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving Job..." : "Add Job"}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/admin/panel/dashboard")
              }
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}