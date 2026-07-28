import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteName = "Corporate Jobs Network";
const siteDescription =
  "Discover verified fresher jobs, experienced roles, internships, work-from-home opportunities, government jobs and referral openings across India.";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },

  description: siteDescription,

  applicationName: siteName,

  keywords: [
    "Corporate Jobs Network",
    "latest jobs",
    "freshers jobs",
    "experienced jobs",
    "private jobs",
    "government jobs",
    "internships",
    "work from home jobs",
    "referral jobs",
    "jobs in India",
    "Bangalore jobs",
    "software jobs",
    "graduate jobs",
  ],

  authors: [
    {
      name: siteName,
    },
  ],

  creator: siteName,
  publisher: siteName,

  category: "Jobs and Careers",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName,
    title: siteName,
    description: siteDescription,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Corporate Jobs Network - Latest Job Opportunities",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/opengraph-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: [
      {
        url: "/favicon.ico",
      },
      {
        url: "/logo.png",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/logo.png",
      },
    ],
  },

  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}