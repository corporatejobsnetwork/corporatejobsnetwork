export default function LoadingLatestJobs() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="animate-pulse space-y-8">
          <div className="rounded-3xl bg-white/80 p-8 shadow-sm">
            <div className="mx-auto h-4 w-40 rounded bg-slate-200" />
            <div className="mx-auto mt-4 h-10 w-72 rounded bg-slate-200" />
            <div className="mx-auto mt-4 h-5 w-full max-w-xl rounded bg-slate-200" />
          </div>

          <div className="rounded-3xl bg-white/80 p-6 shadow-sm">
            <div className="h-5 w-40 rounded bg-slate-200" />

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_auto]">
              <div className="h-12 rounded-xl bg-slate-200" />
              <div className="h-12 w-full rounded-xl bg-slate-200 lg:w-28" />
              <div className="h-12 w-full rounded-xl bg-slate-200 lg:w-36" />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-9 w-28 rounded-full bg-slate-200"
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-3xl bg-white/80 p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-200" />

                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-2/3 rounded bg-slate-200" />
                    <div className="h-4 w-1/2 rounded bg-slate-200" />
                  </div>
                </div>

                <div className="mt-6 h-6 w-3/4 rounded bg-slate-200" />

                <div className="mt-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="h-4 w-full rounded bg-slate-200"
                    />
                  ))}
                </div>

                <div className="mt-6 flex gap-2">
                  <div className="h-7 w-24 rounded-full bg-slate-200" />
                  <div className="h-7 w-24 rounded-full bg-slate-200" />
                </div>

                <div className="mt-7 h-12 rounded-xl bg-slate-200" />
                <div className="mt-3 h-12 rounded-xl bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}