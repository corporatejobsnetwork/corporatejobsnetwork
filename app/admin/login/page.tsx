"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function AdminLoginPage() {
  const router = useRouter();
  const redirectStarted = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (!redirectStarted.current) {
          redirectStarted.current = true;
          router.replace("/admin/panel/dashboard");
        }
        return;
      }

      setCheckingUser(false);
    });

    return () => unsubscribe();
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, cleanEmail, password);

      if (!redirectStarted.current) {
        redirectStarted.current = true;
        router.replace("/admin/panel/dashboard");
      }
    } catch (loginError: unknown) {
      console.error("Admin login failed:", loginError);

      if (
        typeof loginError === "object" &&
        loginError !== null &&
        "code" in loginError
      ) {
        const firebaseErrorCode = String(
          (loginError as { code: string }).code
        );

        switch (firebaseErrorCode) {
          case "auth/invalid-email":
            setError("Please enter a valid email address.");
            break;

          case "auth/user-disabled":
            setError("This admin account has been disabled.");
            break;

          case "auth/too-many-requests":
            setError(
              "Too many unsuccessful attempts. Please try again later."
            );
            break;

          case "auth/network-request-failed":
            setError(
              "Network error. Please check your internet connection."
            );
            break;

          case "auth/invalid-credential":
          case "auth/user-not-found":
          case "auth/wrong-password":
            setError("Invalid email or password.");
            break;

          default:
            setError("Unable to log in. Please try again.");
        }
      } else {
        setError("Unable to log in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Checking admin session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-4 py-10 sm:px-6">
      <div className="mx-auto mb-6 flex max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
          <section className="hidden bg-gradient-to-br from-blue-700 to-indigo-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg">
                  <Image
                    src="/logo.png"
                    alt="Corporate Jobs Network logo"
                    width={64}
                    height={64}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">
                    Admin Portal
                  </p>

                  <h1 className="mt-1 text-2xl font-bold">
                    Corporate Jobs Network
                  </h1>
                </div>
              </div>

              <div className="mt-16">
                <h2 className="max-w-md text-4xl font-bold leading-tight">
                  Manage your job portal from one secure dashboard.
                </h2>

                <p className="mt-5 max-w-md leading-7 text-blue-100">
                  Add new jobs, update achievements and manage website
                  content from the Corporate Jobs Network admin panel.
                </p>
              </div>
            </div>

            <p className="text-sm text-blue-200">
              Secure administrator access only.
            </p>
          </section>

          <section className="flex items-center p-6 sm:p-10 lg:p-14">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <Image
                      src="/logo.png"
                      alt="Corporate Jobs Network logo"
                      width={56}
                      height={56}
                      className="h-full w-full object-contain"
                      priority
                    />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                      Admin Portal
                    </p>

                    <p className="font-bold text-slate-900">
                      Corporate Jobs Network
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-semibold text-blue-700">
                  Welcome back
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  Admin Login
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Enter your authorized Firebase admin account details.
                </p>
              </div>

              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="email"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={loading}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      title={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff size={20} aria-hidden="true" />
                      ) : (
                        <Eye size={20} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    "Login to Admin Panel"
                  )}
                </button>
              </form>

              <div className="mt-8 border-t border-slate-200 pt-6 text-center">
                <p className="text-xs leading-5 text-slate-500">
                  Only authorized administrators can access this panel.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}