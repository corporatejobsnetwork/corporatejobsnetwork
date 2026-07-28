import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Categories from "@/components/Categories";
import LatestJobs from "@/components/LatestJobs";
import Stats from "@/components/Stats";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="relative isolate overflow-hidden bg-gradient-to-b from-blue-50/80 via-white to-slate-50">
        {/* Premium background decorations */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-blue-300/20 blur-3xl" />
          <div className="absolute -right-32 top-[720px] h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute -left-28 top-[1450px] h-80 w-80 rounded-full bg-indigo-300/15 blur-3xl" />
          <div className="absolute -right-24 bottom-24 h-96 w-96 rounded-full bg-emerald-300/15 blur-3xl" />

          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #2563eb 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <Hero />

        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          <Categories />
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          <LatestJobs />
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          <Stats />
        </div>
      </main>

      <Footer />
    </div>
  );
}