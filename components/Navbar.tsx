"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn, Menu, UserRoundPlus, X } from "lucide-react";

const navigationLinks = [
  { name: "Home", href: "/" },
  { name: "Latest Jobs", href: "/latest-jobs" },
  { name: "Freshers", href: "/freshers" },
  { name: "Government Jobs", href: "/government-jobs" },
  { name: "Companies", href: "/companies" },
  { name: "Contact", href: "/contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
      <nav className="mx-auto flex min-h-[76px] max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 sm:gap-3"
          aria-label="Corporate Jobs Network home"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm transition duration-300 group-hover:scale-105 group-hover:shadow-md sm:h-12 sm:w-12">
            <Image
              src="/logo.png"
              alt="Corporate Jobs Network"
              width={48}
              height={48}
              className="h-full w-full object-cover"
              priority
            />
          </div>

          <div className="w-[170px] sm:w-[225px] xl:w-[215px] 2xl:w-[245px]">
            <p className="text-[15px] font-extrabold leading-tight tracking-tight text-blue-700 sm:text-[18px] 2xl:text-[20px]">
              Corporate Jobs Network
            </p>

            <p className="mt-0.5 hidden text-[11px] leading-tight text-slate-500 sm:block 2xl:text-xs">
              Genuine Jobs. Better Careers.
            </p>
          </div>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-1 xl:flex">
          {navigationLinks.map((link) => {
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold transition duration-200 2xl:px-3 ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50 hover:text-blue-700"
                }`}
              >
                {link.name}

                {active && (
                  <span className="absolute inset-x-2 -bottom-[13px] h-0.5 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}

          <Link
            href="/referral"
            className={`ml-2 flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-bold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md 2xl:px-4 ${
              isActive("/referral")
                ? "bg-emerald-700 text-white"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            <UserRoundPlus size={18} />
            Candidate Referral
          </Link>

          <Link
            href="/admin/login"
            className={`ml-1 flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md 2xl:px-4 ${
              isActive("/admin")
                ? "bg-blue-800"
                : "bg-blue-700 hover:bg-blue-800"
            }`}
          >
            <LogIn size={18} />
            Admin Login
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((currentValue) => !currentValue)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 xl:hidden"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          {menuOpen ? <X size={25} /> : <Menu size={25} />}
        </button>
      </nav>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 top-[76px] z-40 bg-slate-950/35 backdrop-blur-[1px] xl:hidden"
          />

          <div
            id="mobile-navigation"
            className="absolute left-0 right-0 top-full z-50 max-h-[calc(100vh-76px)] overflow-y-auto border-t border-slate-200 bg-white px-4 py-4 shadow-2xl sm:px-6 xl:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1.5">
              {navigationLinks.map((link) => {
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-xl px-4 py-3 font-semibold transition ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}

              <div className="my-2 h-px bg-slate-200" />

              <Link
                href="/referral"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold transition ${
                  isActive("/referral")
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                <UserRoundPlus size={20} />
                Candidate Referral
              </Link>

              <Link
                href="/admin/login"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white transition ${
                  isActive("/admin")
                    ? "bg-blue-800"
                    : "bg-blue-700 hover:bg-blue-800"
                }`}
              >
                <LogIn size={20} />
                Admin Login
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}