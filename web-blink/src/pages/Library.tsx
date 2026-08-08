import { motion } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchSavedAnalyses, type SavedAnalysis } from "@/lib/analysis";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/hooks/useAuth";

export default function Library() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchSavedAnalyses()
      .then(setAnalyses)
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="fixed inset-0 -z-10"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(220 70% 14%) 0%, hsl(220 84% 10%) 40%, hsl(220 80% 8%) 100%)",
          }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-blink-sky/30 border-t-blink-sky"
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Continuous background */}
      <div
        className="fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(220 70% 14%) 0%, hsl(220 84% 10%) 40%, hsl(220 80% 8%) 100%)",
        }}
      />

      <header className="fixed inset-x-0 top-0 z-50 bg-white/[0.03] shadow-[0_1px_0_rgba(175,224,249,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <span className="text-lg font-bold tracking-tight text-white">{BRAND.name}</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/app")}
              className="text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="hidden text-sm font-medium text-white/60 transition-colors hover:text-white sm:block"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="text-sm font-medium text-white/60 transition-colors hover:text-white sm:hidden"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={() => navigate("/app")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Library
          </h1>
          <p className="mt-3 text-sm text-white/50">
            Your previous analyses and saved profiles.
          </p>

          {/* Analyses list */}
          <div className="mt-8 space-y-3">
            {loading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-5 w-5 rounded-full border-2 border-blink-sky/30 border-t-blink-sky"
                />
                <span className="text-sm text-white/50">Loading your analyses…</span>
              </div>
            ) : analyses.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center">
                <Clock className="mx-auto h-8 w-8 text-white/30" />
                <p className="mt-4 text-sm font-medium text-white/60">No analyses yet</p>
                <p className="mt-1 text-xs text-white/40">
                  Analyze a profile to start building your library.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/analyze")}
                  className="mt-5 inline-flex items-center justify-center rounded-2xl bg-blink-sky px-6 py-3 text-sm font-bold text-blink-navy transition-all hover:scale-[1.02]"
                >
                  Analyze a profile
                </button>
              </div>
            ) : (
              analyses.map((analysis, i) => (
                <motion.div
                  key={analysis.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] p-5"
                >
                  <div>
                    <p className="text-sm font-bold text-white">
                      Score: {(analysis.result.overallScore ?? 0).toFixed(1)}
                    </p>
                    <p className="mt-0.5 text-xs text-white/40">
                      {analysis.result.firstImpression}
                    </p>
                    <p className="mt-0.5 text-xs text-white/30">
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(analysis.result.traits ?? []).slice(0, 2).map((trait) => (
                      <span
                        key={trait}
                        className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/70"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
