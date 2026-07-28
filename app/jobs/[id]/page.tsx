import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JobDetails from "./JobDetails";
import { getJobById, getSiteUrl } from "@/lib/jobs";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function getDescription(job: {
  role: string;
  company: string;
  location: string;
  experience: string;
  jobDescription: string;
}) {
  const fallback = `${job.company} is hiring for ${job.role} in ${job.location}. Experience: ${job.experience}.`;

  const description = cleanText(job.jobDescription || fallback);

  return description.length > 155
    ? description.slice(0, 152) + "..."
    : description;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

  const job = await getJobById(id);

  if (!job) {
    return {
      title: "Job Not Found",
      description: "Requested job not found.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const site = getSiteUrl();

  const title = `${job.role} | ${job.company} | Corporate Jobs Network`;

  const description = getDescription(job);

  const image =
    job.companyImage ||
    job.companyLogo ||
    `${site}/opengraph-image.png`;

  return {
    title,
    description,

    alternates: {
      canonical: `${site}/jobs/${job.id}`,
    },

    openGraph: {
      title,
      description,
      url: `${site}/jobs/${job.id}`,
      siteName: "Corporate Jobs Network",
      type: "website",

      images: [
        {
          url: image,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function Page({
  params,
}: PageProps) {
  const { id } = await params;

  const job = await getJobById(id);

  if (!job) {
    notFound();
  }

  const site = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",

    title: job.role,

    description: cleanText(
      job.jobDescription ||
        `${job.company} hiring for ${job.role}`
    ),

    datePosted: job.createdAt?.toISOString(),

    employmentType:
      job.category.toLowerCase().includes("intern")
        ? "INTERN"
        : "FULL_TIME",

    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      logo: job.companyLogo,
    },

    jobLocation: {
      "@type": "Place",

      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: "IN",
      },
    },

    applicantLocationRequirements: {
      "@type": "Country",
      name: "India",
    },

    identifier: {
      "@type": "PropertyValue",
      name: "Corporate Jobs Network",
      value: job.id,
    },

    url: `${site}/jobs/${job.id}`,

    directApply: !!job.applyLink,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <JobDetails />
    </>
  );
}