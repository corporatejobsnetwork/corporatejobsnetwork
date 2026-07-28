"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";

type ApplicationModeOption = "direct" | "referral" | "both";

function formatList(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join("\n");
  }

  return String(value ?? "");
}

function convertToList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const jobId = params.id;

  const [company, setCompany] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [role, setRole] = useState("");

  const [jobType, setJobType] = useState("private");
  const [jobCategory, setJobCategory] = useState("freshers");

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

  const [applicationMode, setApplicationMode] =
    useState<ApplicationModeOption>("direct");

  const [loadingJob, setLoadingJob] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const directApplyEnabled =
    applicationMode === "direct" || applicationMode === "both";

  const referralEnabled =
    applicationMode === "referral" || applicationMode === "both";

  useEffect(() => {
    async function loadJob() {
      if (!jobId) {
        setError("Invalid job ID.");
        setLoadingJob(false);
        return;
      }

      try {
        setLoadingJob(true);
        setError("");

        const jobReference = doc(db, "jobs", jobId);
        const jobSnapshot = await getDoc(jobReference);

        if (!jobSnapshot.exists()) {
          setError("Job not found.");
          return;
        }

        const jobData = jobSnapshot.data();

        setCompany(String(jobData.company ?? ""));
        setCompanyLogo(String(jobData.companyLogo ?? ""));
        setRole(String(jobData.role ?? ""));

        setJobType(
          String(jobData.type ?? jobData.jobType ?? "private")
        );

        setJobCategory(
          String(jobData.category ?? jobData.jobCategory ?? "freshers")
        );

        setLocation(String(jobData.location ?? ""));
        setExperience(String(jobData.experience ?? ""));
        setEducation(String(jobData.education ?? ""));

        setPrimarySkills(formatList(jobData.primarySkills));
        setRequiredSkills(formatList(jobData.requiredSkills));

        setEligibilityCriteria(
          formatList(jobData.eligibilityCriteria)
        );

        setJobDescription(
          String(jobData.jobDescription ?? "")
        );

        setResponsibilities(
          formatList(jobData.responsibilities)
        );

        setBenefits(formatList(jobData.benefits));

        setSelectionProcess(
          formatList(jobData.selectionProcess)
        );

        setSalary(
          jobData.salary === "N/A"
            ? ""
            : String(jobData.salary ?? "")
        );

        setLastDate(
          jobData.lastDate === "N/A"
            ? ""
            : String(jobData.lastDate ?? "")
        );

        setApplyLink(String(jobData.applyLink ?? ""));

        const storedApplicationMode = jobData.applicationMode;

        if (
          storedApplicationMode &&
          typeof storedApplicationMode === "object"
        ) {
          const directApply =
            storedApplicationMode.directApply === true;

          const referral =
            storedApplicationMode.referral === true;

          if (directApply && referral) {
            setApplicationMode("both");
          } else if (referral) {
            setApplicationMode("referral");
          } else {
            setApplicationMode("direct");
          }
        } else if (jobData.applyLink) {
          // Compatibility for jobs created before applicationMode existed.
          setApplicationMode("direct");
        } else {
          setApplicationMode("referral");
        }
      } catch (loadError) {
        console.error("Failed to load job:", loadError);
        setError("Unable to load the job details.");
      } finally {
        setLoadingJob(false);
      }
    }

    loadJob();
  }, [jobId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

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
        "Please fill in all required job details, including eligibility criteria."
      );
      return;
    }

    if (directApplyEnabled && !applyLink.trim()) {
      setError(
        "Application link is required when Direct Apply is enabled."
      );
      return;
    }

    if (
      companyLogo.trim() &&
      !/^https?:\/\/.+/i.test(companyLogo.trim())
    ) {
      setError(
        "Please enter a valid company logo URL starting with http:// or https://."
      );
      return;
    }

    if (
      directApplyEnabled &&
      applyLink.trim() &&
      !/^https?:\/\/.+/i.test(applyLink.trim())
    ) {
      setError(
        "Please enter a valid application link starting with http:// or https://."
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

    if (primarySkillsList.length === 0) {
      setError("Please enter at least one primary skill.");
      return;
    }

    if (requiredSkillsList.length === 0) {
      setError("Please enter at least one required skill.");
      return;
    }

    if (eligibilityCriteriaList.length === 0) {
      setError("Please enter at least one eligibility criterion.");
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, "jobs", jobId), {
        company: company.trim(),
        companyLogo: companyLogo.trim(),
        role: role.trim(),

        type: jobType,
        category: jobCategory,

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

        applyLink: directApplyEnabled
          ? applyLink.trim()
          : "",

        applicationMode: {
          directApply: directApplyEnabled,
          referral: referralEnabled,
        },

        updatedAt: serverTimestamp(),
      });

      setSuccess("Job updated successfully.");

      setTimeout(() => {
        router.back();
      }, 1200);
    } catch (updateError) {
      console.error("Failed to update job:", updateError);

      setError(
        "Unable to update the job. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingJob) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="text-center">
          <Loader2
            size={42}
            className="mx-auto animate-spin text-blue-700"
          />

          <p className="mt-4 font-medium text-slate-600">
            Loading job details...
          </p>
        </div>
      </main>
    );
  }

  // Continue with Part 2 below this line.
    return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="font-semibold text-blue-700">
            Admin Panel
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Edit Job
          </h1>

          <p className="mt-2 text-slate-600">
            Update the job information below.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-8 shadow"
        >
          <div className="grid gap-6 md:grid-cols-2">

            {/* Company */}
            <div>
              <label className="mb-2 block font-semibold">
                Company *
              </label>

              <input
                className="w-full rounded-xl border p-3"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            {/* Role */}
            <div>
              <label className="mb-2 block font-semibold">
                Job Role *
              </label>

              <input
                className="w-full rounded-xl border p-3"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>

            {/* Company Logo URL */}
            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Company Logo URL
                <span className="ml-2 text-sm font-normal text-slate-500">
                  Optional
                </span>
              </label>

              <input
                type="url"
                className="w-full rounded-xl border p-3"
                value={companyLogo}
                onChange={(e) => setCompanyLogo(e.target.value)}
                placeholder="https://example.com/company-logo.png"
                disabled={saving}
              />

              <p className="mt-2 text-xs text-slate-500">
                Leave this blank to show the default company building icon.
              </p>
            </div>

            {/* Job Type */}
            <div>
              <label className="mb-2 block font-semibold">
                Job Type
              </label>

              <select
                className="w-full rounded-xl border p-3"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
              >
                <option value="private">Private</option>
                <option value="government">Government</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="mb-2 block font-semibold">
                Category
              </label>

              <select
                className="w-full rounded-xl border p-3"
                value={jobCategory}
                onChange={(e) => setJobCategory(e.target.value)}
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

            {/* Location */}
            <div>
              <label className="mb-2 block font-semibold">
                Location *
              </label>

              <input
                className="w-full rounded-xl border p-3"
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value)
                }
              />
            </div>

            {/* Experience */}
            <div>
              <label className="mb-2 block font-semibold">
                Experience *
              </label>

              <input
                className="w-full rounded-xl border p-3"
                value={experience}
                onChange={(e) =>
                  setExperience(e.target.value)
                }
              />
            </div>

            {/* Education */}
            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Education *
              </label>

              <input
                className="w-full rounded-xl border p-3"
                value={education}
                onChange={(e) =>
                  setEducation(e.target.value)
                }
              />
            </div>

            {/* Primary Skills */}
            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Primary Skills *
              </label>

              <textarea
                rows={4}
                className="w-full rounded-xl border p-3"
                value={primarySkills}
                onChange={(e) =>
                  setPrimarySkills(e.target.value)
                }
              />
            </div>

            {/* Required Skills */}
            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Required Skills *
              </label>

              <textarea
                rows={4}
                className="w-full rounded-xl border p-3"
                value={requiredSkills}
                onChange={(e) =>
                  setRequiredSkills(e.target.value)
                }
              />
            </div>

            {/* Eligibility */}
            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Eligibility Criteria *
              </label>

              <textarea
                rows={4}
                className="w-full rounded-xl border p-3"
                value={eligibilityCriteria}
                onChange={(e) =>
                  setEligibilityCriteria(
                    e.target.value
                  )
                }
              />
            </div>

            {/* Job Description */}
            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Job Description
              </label>

              <textarea
                rows={6}
                className="w-full rounded-xl border p-3"
                value={jobDescription}
                onChange={(e) =>
                  setJobDescription(e.target.value)
                }
              />
            </div>

            {/* Responsibilities */}
            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Responsibilities
              </label>

              <textarea
                rows={4}
                className="w-full rounded-xl border p-3"
                value={responsibilities}
                onChange={(e) =>
                  setResponsibilities(
                    e.target.value
                  )
                }
              />
            </div>

            {/* Benefits */}
            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Benefits
              </label>

              <textarea
                rows={4}
                className="w-full rounded-xl border p-3"
                value={benefits}
                onChange={(e) =>
                  setBenefits(e.target.value)
                }
              />
            </div>

            {/* Selection */}
            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Selection Process
              </label>

              <textarea
                rows={4}
                className="w-full rounded-xl border p-3"
                value={selectionProcess}
                onChange={(e) =>
                  setSelectionProcess(
                    e.target.value
                  )
                }
              />
            </div>

            {/* Salary */}
            <div>
              <label className="mb-2 block font-semibold">
                Salary
              </label>

              <input
                className="w-full rounded-xl border p-3"
                value={salary}
                onChange={(e) =>
                  setSalary(e.target.value)
                }
              />
            </div>

            {/* Last Date */}
            <div>
              <label className="mb-2 block font-semibold">
                Last Date
              </label>

              <input
                type="date"
                className="w-full rounded-xl border p-3"
                value={lastDate}
                onChange={(e) =>
                  setLastDate(e.target.value)
                }
              />
            </div>

            {/* Application Mode */}
            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Application Mode
              </label>

              <select
                value={applicationMode}
                onChange={(e) =>
                  setApplicationMode(
                    e.target
                      .value as ApplicationModeOption
                  )
                }
                className="w-full rounded-xl border p-3"
              >
                <option value="direct">
                  Direct Apply
                </option>

                <option value="referral">
                  Referral Only
                </option>

                <option value="both">
                  Direct + Referral
                </option>
              </select>
            </div>

            {directApplyEnabled && (
              <div className="md:col-span-2">
                <label className="mb-2 block font-semibold">
                  Apply Link *
                </label>

                <input
                  className="w-full rounded-xl border p-3"
                  value={applyLink}
                  onChange={(e) =>
                    setApplyLink(e.target.value)
                  }
                />
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 rounded-xl bg-red-100 p-4 text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-xl bg-green-100 p-4 text-green-700">
              {success}
            </div>
          )}

          <div className="mt-8 flex gap-4">
            <button
              disabled={saving}
              type="submit"
              className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 inline animate-spin" size={18} />
                  Updating...
                </>
              ) : (
                "Update Job"
              )}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border px-6 py-3"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}