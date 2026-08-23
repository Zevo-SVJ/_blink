/**
 * Blink — library of past analyses.
 *
 * Own-profile analyses and third-party reads are shown side by side but
 * labelled distinctly, because only the former affect your score.
 */

import { motion } from "framer-motion";
import { LayoutGrid, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AppShell } from "@/components/app/AppShell";
import { EmptyState, ErrorState, SkeletonList } from "@/components/app/states";
import {
  deleteAnalysis,
  fetchSavedAnalyses,
  type SavedAnalysis,
} from "@/lib/analysis";
import { categoryLabel } from "@/lib/categories";
import { useI18n, useT } from "@/lib/i18n";
import { getVoice } from "@/lib/ownership";
import { computeBlinkScore, getTier, scoreOutOfTen } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Filter = "all" | "own" | "other";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; analyses: SavedAnalysis[] };

export default function Library() {
  const navigate = useNavigate();
  const t = useT();
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
        message: t.library.loadFailed,
      });
    }
  }, [t]);

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
    <AppShell title={t.library.title} subtitle={t.library.subtitle}>
      {load.state === "loading" && <SkeletonList rows={4} />}

      {load.state === "error" && (
        <ErrorState message={load.message} onRetry={() => void refresh()} />
      )}

      {load.state === "ready" && analyses.length === 0 && (
        <EmptyState
          icon={LayoutGrid}
          title={t.library.emptyTitle}
          description={t.library.emptyBody}
          action={
            <button
              type="button"
              onClick={() => navigate("/analyze")}
              className="rounded-2xl bg-blink-sky px-6 py-3 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02]"
            >
              {t.home.analyzeTitle}
            </button>
          }
        />
      )}

      {load.state === "ready" && analyses.length > 0 && (
        <div className="space-y-4">
          <FilterTabs filter={filter} onChange={setFilter} />

          {visible.length === 0 ? (
            <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-white/40">
              {t.library.noneWithFilter}
            </p>
          ) : (
            <div className="space-y-2.5">
              {visible.map((analysis, i) => (
                <AnalysisRow
                  key={analysis.id}
                  analysis={analysis}
                  index={i}
                  deleting={deleting === analysis.id}
                  to={`/library/${analysis.id}`}
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
  const t = useT();
  const tabs: Array<{ id: Filter; label: string }> = [
    { id: "all", label: t.ranksPage.all },
    { id: "own", label: t.library.yours },
    { id: "other", label: t.library.others },
  ];

  return (
    <div className="glass-inset flex gap-1 rounded-[var(--r-md)] p-1">
      {tabs.map((tab) => {
        const active = filter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "focus-ring relative min-h-[44px] flex-1 rounded-[var(--r-sm)] px-3 text-xs font-semibold transition-colors sm:text-sm",
              active ? "text-blink-navy" : "text-white/55 hover:text-white",
            )}
          >
            {active && (
              <motion.span
                layoutId="library-tab"
                className="absolute inset-0 rounded-[var(--r-sm)] bg-blink-sky"
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
  to,
  onDelete,
}: {
  analysis: SavedAnalysis;
  index: number;
  deleting: boolean;
  to: string;
  onDelete: () => void;
}) {
  const { lang, t } = useI18n();
  const voice = getVoice(analysis.ownership, analysis.result.subjectGender, lang);
  const score = computeBlinkScore(analysis.result).total;
  const category = categoryLabel(analysis.result.category?.category, t);
  const handle = analysis.result.handle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 32, delay: Math.min(index * 0.04, 0.3) }}
      className="flex items-center gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] transition-colors hover:bg-white/[0.06]"
    >
      {/*
        A link, not a button.

        It navigates to a URL, so it has to be an anchor: a button cannot be
        opened in a new tab, middle-clicked, copied, or read as a destination
        by a screen reader — and this list is the one place in the app where
        "open that one" is the whole interaction. Delete sits outside it so the
        two targets never nest.
      */}
      <Link
        to={to}
        className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-[var(--r-lg)] p-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-sm font-bold text-white">
            <span className="truncate">
              {handle ? `@${handle}` : analysis.result.firstImpression}
            </span>
            {/* Says whose profile was read, not who can see the reading.
                The chip used to say "Public", which was false twice over: the
                analysis is self-read only under RLS, and Ranks labels the very
                same person "Private" — one row, two contradictory claims about
                the same thing. */}
            {!voice.isOwn && (
              <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white/45">
                {t.library.someoneElse}
              </span>
            )}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-white/40">
            {category && <span>{category}</span>}
            {category && <span aria-hidden className="text-white/20">·</span>}
            <span>
              {new Date(analysis.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </p>
        </div>

        <span className="t-numeric shrink-0 text-lg font-extrabold text-white">
          {scoreOutOfTen(score)}
        </span>
      </Link>

      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label={`Delete analysis of ${handle ?? "this profile"}`}
        className="focus-ring mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-md)] text-white/25 transition-colors hover:bg-white/[0.06] hover:text-red-400 disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
