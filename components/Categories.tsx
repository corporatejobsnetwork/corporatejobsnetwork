import Link from "next/link";
import {
  Briefcase,
  GraduationCap,
  Building2,
  Home,
  Laptop,
  Users,
  UserRoundPlus,
  ArrowRight,
} from "lucide-react";

const categories = [
  {
    name: "Latest Jobs",
    desc: "Newest openings",
    href: "/latest-jobs",
    icon: Briefcase,
    color: "text-blue-600",
    bg: "from-blue-50 to-blue-100",
  },
  {
    name: "Freshers",
    desc: "0-1 Year Jobs",
    href: "/latest-jobs?type=private&category=freshers",
    icon: GraduationCap,
    color: "text-green-600",
    bg: "from-green-50 to-green-100",
  },
  {
    name: "Experienced",
    desc: "Experienced Roles",
    href: "/latest-jobs?type=private&category=experienced",
    icon: Users,
    color: "text-indigo-600",
    bg: "from-indigo-50 to-indigo-100",
  },
  {
    name: "Government Jobs",
    desc: "Central & State",
    href: "/government-jobs",
    icon: Building2,
    color: "text-red-600",
    bg: "from-red-50 to-red-100",
  },
  {
    name: "Work From Home",
    desc: "Remote Careers",
    href: "/latest-jobs?type=private&category=work-from-home",
    icon: Home,
    color: "text-purple-600",
    bg: "from-purple-50 to-purple-100",
  },
  {
    name: "Internships",
    desc: "Students & Graduates",
    href: "/latest-jobs?type=private&category=internship",
    icon: Laptop,
    color: "text-orange-600",
    bg: "from-orange-50 to-orange-100",
  },
  {
    name: "Walk-In Drives",
    desc: "Direct Hiring",
    href: "/latest-jobs?type=private&category=walkin",
    icon: Briefcase,
    color: "text-cyan-600",
    bg: "from-cyan-50 to-cyan-100",
  },
  {
    name: "Candidate Referral",
    desc: "Get Referred",
    href: "/referral",
    icon: UserRoundPlus,
    color: "text-emerald-600",
    bg: "from-emerald-50 to-emerald-100",
  },
];

export default function Categories() {
  return (
    <section className="relative bg-transparent py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-blue-200/70 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur-md">
            Browse Opportunities
          </span>

          <h2 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-4xl">
            Explore Job Categories
          </h2>

          <p className="mt-4 text-slate-600">
            Choose your preferred category and discover verified opportunities.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <Link
                key={category.name}
                href={category.href}
                className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-6 shadow-xl shadow-blue-900/5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-3 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/10"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${category.bg} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className={`h-8 w-8 ${category.color}`} />
                </div>

                <h3 className="text-xl font-bold text-slate-900 transition-colors duration-300 group-hover:text-blue-700">
                  {category.name}
                </h3>

                <p className="mt-2 text-sm text-slate-500">{category.desc}</p>

                <div className="mt-6 flex items-center gap-2 font-semibold text-blue-700 transition-all duration-300 opacity-70 group-hover:translate-x-2 group-hover:opacity-100">
                  Explore <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}