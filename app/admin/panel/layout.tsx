"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  Download,
  House,
  Landmark,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  MessageSquareText,
  PlusCircle,
  Trophy,
  UserRoundPlus,
  X,
} from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Toaster, toast } from "sonner";
import { auth } from "@/lib/firebase";

type AdminPanelLayoutProps = {
  children: ReactNode;
};

const navigationItems = [
  {
    name: "Dashboard",
    href: "/admin/panel/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Add Private Job",
    href: "/admin/panel/add-job",
    icon: PlusCircle,
  },
  {
    name: "Add Government Job",
    href: "/admin/panel/add-government-job",
    icon: Landmark,
  },
  {
    name: "Manage Jobs",
    href: "/admin/panel/manage-jobs",
    icon: BriefcaseBusiness,
  },
  {
    name: "Imported Jobs",
    href: "/admin/panel/imported-jobs",
    icon: Download,
  },
  {
    name: "Referral Requests",
    href: "/admin/panel/referrals",
    icon: UserRoundPlus,
  },
  {
    name: "Contact Messages",
    href: "/admin/panel/contact-messages",
    icon: MessageSquareText,
  },
  {
    name: "Achievements",
    href: "/admin/panel/achievements",
    icon: Trophy,
  },
];

export default function AdminPanelLayout({
  children,
}: AdminPanelLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const redirectStarted = useRef(false);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        if (!redirectStarted.current) {
          redirectStarted.current = true;
          router.replace("/admin/login");
        }

        return;
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function signOutAndOpenLogin() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);
      setSidebarOpen(false);

      await signOut(auth);

      if (!redirectStarted.current) {
        redirectStarted.current = true;
        router.replace("/admin/login");
      }
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  function isActiveRoute(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (checkingAuth || loggingOut) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-slate-100">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />

            <span className="font-semibold text-slate-700">
              {loggingOut ? "Opening login page..." : "Checking admin access..."}
            </span>
          </div>
        </div>

        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={3000}
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-100">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex min-h-20 items-center justify-between border-b border-white/10 px-6">
            <Link
              href="/admin/panel/dashboard"
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
                <BarChart3 className="h-6 w-6" />
              </div>

              <div>
                <p className="text-base font-bold">Corporate Jobs</p>

                <p className="text-xs font-medium text-slate-400">
                  Admin Panel
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Main Menu
            </p>

            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveRoute(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-white/10 p-4">
            <Link
              href="/"
              className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-blue-600 hover:text-white"
            >
              <House className="h-5 w-5" />
              Back to Home
            </Link>

            <button
              type="button"
              onClick={signOutAndOpenLogin}
              disabled={loggingOut}
              className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-300 transition hover:bg-amber-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-5 w-5" />
              Back to Login
            </button>

            <button
              type="button"
              onClick={signOutAndOpenLogin}
              disabled={loggingOut}
              className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </aside>

        <div className="min-h-screen lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-h-14 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-slate-900">
                    Admin Control Panel
                  </h2>

                  <p className="hidden text-sm text-slate-500 sm:block">
                    Manage jobs, referrals, messages and website information
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/"
                  className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-600 hover:bg-blue-600 hover:text-white md:inline-flex"
                >
                  <House className="h-4 w-4" />
                  Home
                </Link>

                <button
                  type="button"
                  onClick={signOutAndOpenLogin}
                  className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-900 hover:bg-slate-900 hover:text-white md:inline-flex"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Login
                </button>

                <div className="hidden text-right xl:block">
                  <p className="text-sm font-bold text-slate-800">
                    Administrator
                  </p>

                  <p className="text-xs text-slate-500">
                    Corporate Jobs Network
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 sm:h-11 sm:w-11">
                  A
                </div>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>

      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={3000}
      />
    </>
  );
}