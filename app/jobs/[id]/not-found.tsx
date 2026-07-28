import Link from "next/link";

export default function JobNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <p className="text-sm font-extrabold uppercase tracking-wider text-blue-700">
          Corporate Jobs Network
        </p>

        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
          Job Not Found
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          This job may have been removed, expired, or the link may be incorrect.
        </p>

        <Link
          href="/latest-jobs"
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-6 py-3 font-extrabold text-white transition hover:bg-blue-800"
        >
          View Latest Jobs
        </Link>
      </div>
    </main>
  );
}