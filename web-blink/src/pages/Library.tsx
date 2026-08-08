/**
 * Blink — library of past analyses.
 *
 * Own-profile analyses and third-party reads are shown side by side but
 * labelled distinctly, because only the former affect your score.
 */

import { motion } from "framer-motion";
import { LayoutGrid, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppShell } from "@/components/app/AppShell";
import { EmptyState, ErrorState, SkeletonList } from "@/components/app/states";
import {
  deleteAnalysis,
  fetchSavedAnalyses,
  type SavedAnalysis,
} from "@/lib/analysis";
import { getVoice } from "@/lib/ownership";
import { computeBlinkScore, getTier } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Filter = "all" | "own" | "other";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; analyses: SavedAnalysis[] };

export default function Library() {
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [filter, setFilter] = useState<Filter>("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoad({ state: "loading" });
    try {
      const analyses = await fetchSavedAnalyses();
      setLoad({ state: "ready", analyses });
    } catch (err) {
      console.error("[Library]", err);
      setLoad({
        state: "error",
        message: "Blink couldn't load your analyses. Check your connection and try again.",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const ok = await deleteAnalysis(id);
    setDeleting(null);
    if (ok && load.state === "ready") {
      setLoad({
        state: "ready",
        analyses: load.analyses.filter((a) => a.id !== id),
      });
    }
  };

  const analyses = load.state === "ready" ? load.analyses : [];
  const visible = analyses.filter((a) =>
    filter === "all" ? true : filter === "own" ? a.ownership === "own" : a.ownership !== "own",
  );

  return (
    <AppShell title="Library" subtitle="Every profile you've analyzed.">
      {load.state === "loading" && <SkeletonList rows={4} />}

      {load.state === "error" && (
        <ErrorState message={load.message} onRetry={() => void refresh()} />
      )}

      {load.state === "ready" && analyses.length === 0 && (
        <EmptyState
          icon={LayoutGrid}
          title="No analyses yet"
          description="Analyze a profile to start building your library."
          action={
            <button
              type="button"
              onClick={() => navigate("/analyze")}
              className="rounded-2xl bg-blink-sky px-6 py-3 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02]"
            >
              Analyze a profile
            </button>
          }
        />
      )}

      {load.state === "ready" && analyses.length > 0 && (
        <div className="space-y-4">
          <FilterTabs filter={filter} onChange={setFilter} />

          {visible.length === 0 ? (
            <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-white/40">
              Nothing here with that filter.
            </p>
          ) : (
            <div className="space-y-2.5">
              {visible.map((analysis, i) => (
                <AnalysisRow
                  key={analysis.id}
                  analysis={analysis}
                  index={i}
                  deleting={deleting === analysis.id}
                  onOpen={() => navigate(`/library/${analysis.id}`)}
                  onDelete={() => void handleDelete(analysis.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

function FilterTabs({
  filter,
  onChange,
}: {
  filter: Filter;
  onChange: (f: Filter) => void;
}) {
  const tabs: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "All" },
    { id: "own", label: "Your profile" },
    { id: "other", label: "Others" },
  ];

  return (
    <div className="flex gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1">
      {tabs.map((tab) => {
        const active = filter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:text-sm",
              active ? "text-blink-navy" : "text-white/55 hover:text-white",
            )}
          >
            {active && (
              <motion.span
                layoutId="library-tab"
                className="absolute inset-0 rounded-xl bg-blink-sky"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function AnalysisRow({
  analysis,
  index,
  deleting,
  onOpen,
  onDelete,
}: {
  analysis: SavedAnalysis;
  index: number;
  deleting: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const voice = getVoice(analysis.ownership, analysis.result.subjectGender);
  const score = computeBlinkScore(analysis.result).total;
  const tier = getTier(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 32, delay: Math.min(index * 0.04, 0.3) }}
      className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] transition-colors hover:bg-white/[0.06]"
    >
      {/* The row itself is the button; delete sits outside it so the two
          targets never nest. */}
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 rounded-2xl p-4 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold",
              voice.isOwn
                ? "bg-blink-sky/20 text-blink-sky"
                : "bg-white/[0.08] text-white/55",
            )}
          >
            {voice.isOwn ? "Your profile" : voice.Subject}
          </span>
          {analysis.result.handle && (
            <span className="truncate text-xs font-medium text-white/35">
              @{analysis.result.handle}
            </span>
          )}
        </div>

        <p className="mt-1.5 truncate text-sm font-bold text-white">
          {analysis.result.firstImpression}
        </p>
        <p className="mt-0.5 text-xs text-white/35">
          {tier.label} ·{" "}
          {new Date(analysis.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </button>

      <div className="shrink-0 text-right">
        <p className="text-lg font-extrabold tabular-nums text-white">{score}</p>
        <p className="text-[0.6rem] uppercase tracking-wider text-white/30">score</p>
      </div>

      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label={`Delete analysis of ${analysis.result.handle ?? "this profile"}`}
        className="mr-2 shrink-0 rounded-xl p-2 text-white/25 transition-colors hover:bg-white/[0.06] hover:text-red-400 disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
