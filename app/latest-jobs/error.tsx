"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-100 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
          ⚠️
        </div>

        <h1 className="mt-5 text-3xl font-extrabold text-slate-900">
          Something went wrong
        </h1>

        <p className="mt-3 text-slate-600">
          We couldn't load the latest jobs. Please try again.
        </p>

        {process.env.NODE_ENV === "development" && (
          <pre className="mt-6 overflow-auto rounded-xl bg-slate-100 p-4 text-left text-xs text-red-600">
            {error.message}
          </pre>
        )}

        <button
          onClick={reset}
          className="mt-8 rounded-xl bg-blue-700 px-6 py-3 font-bold text-white transition hover:bg-blue-800"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}