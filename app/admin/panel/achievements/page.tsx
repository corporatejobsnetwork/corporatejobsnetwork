"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Loader2,
  Save,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type AchievementForm = {
  jobsPosted: string;
  companiesHiring: string;
  successfulPlacements: string;
  totalFollowers: string;
  monthlyReach: string;
  successRate: string;
};

const defaultValues: AchievementForm = {
  jobsPosted: "0",
  companiesHiring: "0",
  successfulPlacements: "0",
  totalFollowers: "0",
  monthlyReach: "0",
  successRate: "0",
};

export default function AchievementsPage() {
  const [formData, setFormData] =
    useState<AchievementForm>(defaultValues);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAchievements() {
      try {
        const achievementRef = doc(db, "siteStats", "achievements");
        const achievementSnapshot = await getDoc(achievementRef);

        if (achievementSnapshot.exists()) {
          const data = achievementSnapshot.data();

          setFormData({
            jobsPosted: String(data.jobsPosted ?? 0),
            companiesHiring: String(data.companiesHiring ?? 0),
            successfulPlacements: String(
              data.successfulPlacements ?? 0
            ),
            totalFollowers: String(data.totalFollowers ?? 0),
            monthlyReach: String(data.monthlyReach ?? 0),
            successRate: String(data.successRate ?? 0),
          });
        }
      } catch (loadError) {
        console.error("Failed to load achievements:", loadError);
        setError("Unable to load achievement details.");
      } finally {
        setLoading(false);
      }
    }

    loadAchievements();
  }, []);

  function handleChange(
    field: keyof AchievementForm,
    value: string
  ) {
    if (value !== "" && Number(value) < 0) {
      return;
    }

    if (field === "successRate" && Number(value) > 100) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    const values = Object.values(formData);

    if (values.some((value) => value.trim() === "")) {
      setError("Please enter all achievement values.");
      return;
    }

    setSaving(true);

    try {
      const achievementRef = doc(db, "siteStats", "achievements");

      await setDoc(
        achievementRef,
        {
          jobsPosted: Number(formData.jobsPosted),
          companiesHiring: Number(formData.companiesHiring),
          successfulPlacements: Number(
            formData.successfulPlacements
          ),
          totalFollowers: Number(formData.totalFollowers),
          monthlyReach: Number(formData.monthlyReach),
          successRate: Number(formData.successRate),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage("Achievements updated successfully.");
    } catch (saveError) {
      console.error("Failed to update achievements:", saveError);
      setError("Unable to update achievements. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    {
      key: "jobsPosted" as const,
      label: "Jobs Posted",
      icon: BriefcaseBusiness,
      placeholder: "Example: 1250",
      suffix: "",
    },
    {
      key: "companiesHiring" as const,
      label: "Companies Hiring",
      icon: Building2,
      placeholder: "Example: 350",
      suffix: "",
    },
    {
      key: "successfulPlacements" as const,
      label: "Successful Placements",
      icon: CheckCircle2,
      placeholder: "Example: 500",
      suffix: "",
    },
    {
      key: "totalFollowers" as const,
      label: "Total Followers",
      icon: Users,
      placeholder: "Example: 10000",
      suffix: "",
    },
    {
      key: "monthlyReach" as const,
      label: "Monthly Reach",
      icon: TrendingUp,
      placeholder: "Example: 50000",
      suffix: "",
    },
    {
      key: "successRate" as const,
      label: "Success Rate",
      icon: Target,
      placeholder: "Example: 95",
      suffix: "%",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="font-medium">
            Loading achievements...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
          Website Statistics
        </p>

        <h1 className="text-3xl font-bold text-slate-900">
          Manage Achievements
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Update the achievement numbers shown on the homepage.
          Existing values are loaded automatically and can be edited
          anytime.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
          <h2 className="text-lg font-bold text-slate-900">
            Achievement Details
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Enter numbers only. Success rate must be between 0 and
            100.
          </p>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
          {fields.map((field) => {
            const Icon = field.icon;

            return (
              <div key={field.key}>
                <label
                  htmlFor={field.key}
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  {field.label}
                </label>

                <div className="relative">
                  <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id={field.key}
                    type="number"
                    min="0"
                    max={
                      field.key === "successRate"
                        ? "100"
                        : undefined
                    }
                    step="1"
                    value={formData[field.key]}
                    onChange={(event) =>
                      handleChange(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />

                  {field.suffix && (
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                      {field.suffix}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
          {message && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Update Achievements
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}