
"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUp, ExternalLink, Mail, MapPin } from "lucide-react";

const quickLinks = [
  { name: "Home", href: "/" },
  { name: "Latest Jobs", href: "/latest-jobs" },
  { name: "Freshers", href: "/freshers" },
  { name: "Government Jobs", href: "/government-jobs" },
  { name: "Companies", href: "/companies" },
  { name: "Contact Us", href: "/contact" },
];

const jobCategories = [
  {
    name: "Freshers Jobs",
    href: "/latest-jobs?type=private&category=freshers",
  },
  {
    name: "Experienced Jobs",
    href: "/latest-jobs?type=private&category=experienced",
  },
  {
    name: "Work From Home",
    href: "/latest-jobs?type=private&category=work-from-home",
  },
  {
    name: "Internships",
    href: "/latest-jobs?type=private&category=internship",
  },
  {
    name: "Walk-In Drives",
    href: "/latest-jobs?type=private&category=walkin",
  },
  {
    name: "Candidate Referral",
    href: "/referral",
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer className="relative overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-700/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-emerald-600/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3"
              aria-label="Corporate Jobs Network home"
            >
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white shadow-lg">
                <Image
                  src="/logo.png"
                  alt="Corporate Jobs Network"
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <p className="text-xl font-extrabold leading-tight text-white">
                  Corporate Jobs Network
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Genuine Jobs. Better Careers.
                </p>
              </div>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
              Discover verified private jobs, government jobs, freshers
              opportunities, internships, work-from-home roles and referral
              openings across India.
            </p>

            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <a
                href="mailto:corporatejobsnetwork@gmail.com"
                className="flex items-center gap-3 transition hover:text-blue-400"
              >
                <Mail className="h-5 w-5 shrink-0 text-blue-400" />
                corporatejobsnetwork@gmail.com
              </a>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-blue-400" />
                <span>Bengaluru, Karnataka, India</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">Quick Links</h3>
            <div className="mt-2 h-1 w-12 rounded-full bg-blue-600" />

            <ul className="mt-6 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:translate-x-1 hover:text-blue-400"
                  >
                    <span className="text-blue-500">›</span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">Job Categories</h3>
            <div className="mt-2 h-1 w-12 rounded-full bg-emerald-500" />

            <ul className="mt-6 space-y-3">
              {jobCategories.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:translate-x-1 hover:text-emerald-400"
                  >
                    <span className="text-emerald-500">›</span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">Follow Us</h3>
            <div className="mt-2 h-1 w-12 rounded-full bg-pink-500" />

            <p className="mt-6 text-sm leading-7 text-slate-300">
              Follow us for daily verified job updates, internships,
              work-from-home openings and referral opportunities.
            </p>

            <a
              href="https://www.instagram.com/corporatejobsnetwork/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-orange-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-xl sm:w-auto"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                📷
              </span>
              Follow @corporatejobsnetwork
              <ExternalLink className="h-4 w-4" />
            </a>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs leading-6 text-slate-400">
                Corporate Jobs Network is an independent job information
                platform. Always verify details on the official company or
                government website before applying.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <div className="flex flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">
            <p className="text-sm text-slate-400">
              © {currentYear}{" "}
              <span className="font-semibold text-white">
                Corporate Jobs Network
              </span>
              . All Rights Reserved.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              <Link
                href="/privacy-policy"
                className="text-slate-400 transition hover:text-blue-400"
              >
                Privacy Policy
              </Link>

              <Link
                href="/terms"
                className="text-slate-400 transition hover:text-blue-400"
              >
                Terms & Conditions
              </Link>

              <Link
                href="/disclaimer"
                className="text-slate-400 transition hover:text-blue-400"
              >
                Disclaimer
              </Link>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 text-white shadow-xl transition hover:-translate-y-1 hover:bg-blue-800"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </footer>
  );
}