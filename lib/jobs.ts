import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface SeoJobData {
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
  createdAt: Date | null;
}

function toStringArray(value: unknown): string[] {
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

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export async function getJobById(id: string): Promise<SeoJobData | null> {
  if (!id) {
    return null;
  }

  try {
    const jobReference = doc(db, "jobs", id);
    const jobSnapshot = await getDoc(jobReference);

    if (!jobSnapshot.exists()) {
      return null;
    }

    const data = jobSnapshot.data();

    return {
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
        data.companyImage ??
          data.backgroundImage ??
          data.bannerImage ??
          ""
      ),

      companyLogo: String(
        data.companyLogo ??
          data.logoUrl ??
          data.companyLogoUrl ??
          ""
      ),

      primarySkills: toStringArray(data.primarySkills),
      requiredSkills: toStringArray(data.requiredSkills),
      eligibilityCriteria: toStringArray(data.eligibilityCriteria),

      jobDescription: String(data.jobDescription ?? ""),

      responsibilities: toStringArray(data.responsibilities),
      benefits: toStringArray(data.benefits),
      selectionProcess: toStringArray(data.selectionProcess),

      createdAt: toDate(data.createdAt),
    };
  } catch (error) {
    console.error("Failed to load job for SEO:", error);
    return null;
  }
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}