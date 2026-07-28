"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  MapPin,
  Search,
} from "lucide-react";

const categories = [
  { label: "Freshers", href: "/freshers" },
  { label: "Latest Jobs", href: "/latest-jobs" },
  { label: "Government", href: "/government-jobs" },
  { label: "Companies", href: "/companies" },
  { label: "Referral", href: "/referral" },
];

export default function Hero() {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const term = searchTerm.trim();

    router.push(
      term
        ? `/latest-jobs?search=${encodeURIComponent(term)}`
        : "/latest-jobs"
    );
  };

  return (
    <section className="relative bg-transparent">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-20">
        <div>
          <span className="inline-flex items-center rounded-full border border-blue-200/80 bg-white/80 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm backdrop-blur">
            🚀 Updated Daily • Genuine Opportunities
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Find Your Dream
            <span className="block bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Corporate Career
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Discover the latest private jobs, government jobs, freshers roles,
            experienced opportunities, internships and work-from-home openings
            across India.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-8 flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/80 p-3 shadow-xl shadow-blue-900/5 backdrop-blur-xl sm:flex-row"
          >
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search company, role, skills or location..."
                className="min-h-14 w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              className="min-h-14 rounded-2xl bg-blue-700 px-7 font-bold text-white shadow-lg shadow-blue-700/20 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-xl"
            >
              Search Jobs
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            {categories.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                className="rounded-full border border-blue-200/80 bg-white/75 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-blue-700 hover:text-white"
              >
                {category.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="relative w-full max-w-md">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-blue-300/30 via-cyan-200/20 to-emerald-200/20 blur-2xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-blue-900/10 backdrop-blur-xl sm:p-8">
              <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-[4rem] bg-gradient-to-br from-blue-100 to-cyan-50" />

              <img
                src="/logo.png"
                alt="Corporate Jobs Network"
                className="relative mx-auto h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg sm:h-36 sm:w-36"
              />

              <h2 className="relative mt-6 text-center text-2xl font-extrabold text-slate-900">
                Corporate Jobs Network
              </h2>

              <p className="relative mt-2 text-center text-sm text-slate-500">
                Genuine Jobs. Better Careers.
              </p>

              <div className="relative mt-7 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-center">
                  <Briefcase className="mx-auto h-6 w-6 text-blue-700" />
                  <p className="mt-2 text-2xl font-extrabold text-blue-700">
                    1000+
                  </p>
                  <p className="text-xs font-semibold text-slate-600">Jobs</p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-center">
                  <Building2 className="mx-auto h-6 w-6 text-emerald-700" />
                  <p className="mt-2 text-2xl font-extrabold text-emerald-700">
                    300+
                  </p>
                  <p className="text-xs font-semibold text-slate-600">
                    Companies
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-4 text-center">
                  <MapPin className="mx-auto h-6 w-6 text-orange-700" />
                  <p className="mt-2 text-xl font-extrabold text-orange-700">
                    PAN India
                  </p>
                  <p className="text-xs font-semibold text-slate-600">
                    Locations
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-100 bg-violet-50/80 p-4 text-center">
                  <ArrowRight className="mx-auto h-6 w-6 text-violet-700" />
                  <p className="mt-2 text-2xl font-extrabold text-violet-700">
                    Daily
                  </p>
                  <p className="text-xs font-semibold text-slate-600">
                    Updates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}