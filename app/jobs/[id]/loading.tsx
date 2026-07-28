export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="animate-pulse">
        <div className="h-96 bg-slate-200" />

        <div className="mx-auto max-w-7xl p-6">
          <div className="mb-6 h-12 w-2/3 rounded bg-slate-200" />

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-3xl bg-white shadow"
                />
              ))}
            </div>

            <div className="space-y-6">
              <div className="h-96 rounded-3xl bg-white shadow" />
              <div className="h-56 rounded-3xl bg-white shadow" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}