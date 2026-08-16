/**
 * Blink — a saved analysis, reopened from the Library.
 *
 * Renders the same result surface as the live flow, so the own/other privacy
 * split and the wording are identical. Read-only: no progression card, because
 * verification already happened when the analysis was first recorded.
 */

import { FileQuestion, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AnalysisResult } from "@/components/analysis/AnalysisResult";
import { ShareSheet } from "@/components/analysis/ShareSheet";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useBackTo } from "@/lib/app-nav";
import { useT } from "@/lib/i18n";
import { EmptyState, ErrorState, SkeletonList } from "@/components/app/states";
import { fetchAnalysisById, type SavedAnalysis } from "@/lib/analysis";
import { fetchMyStanding, fetchScoreStanding } from "@/lib/leaderboard";
import { computeBlinkScore } from "@/lib/ranking";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "missing" }
  | { state: "ready"; analysis: SavedAnalysis };



export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  // Reachable from Library *and* from the Ranks analysed board, so Back has
  // to mean "where I came from", not one hardcoded screen.
  const goBack = useBackTo("/library");
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [standing, setStanding] = useState<{ rank: number; total: number } | null>(null);
  const [shareRank, setShareRank] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) {
      setLoad({ state: "missing" });
      return;
    }
    setLoad({ state: "loading" });
    const res = await fetchAnalysisById(id);
    if (res.status === "error") {
      setLoad({ state: "error", message: res.message });
      return;
    }
    if (res.status === "not-found") {
      setLoad({ state: "missing" });
      return;
    }
    setLoad({ state: "ready", analysis: res.analysis });
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Resolve the rank shown on the result and carried onto the share card.
   *
   * Own analyses use the user's real standing. Third-party reads use where
   * that score *would* place, which is also the only rank a public read can
   * honestly claim. Failures stay silent: the card omits rank rather than
   * blocking the page.
   */
  useEffect(() => {
    if (load.state !== "ready") return;
    let cancelled = false;
    const { result } = load.analysis;

    if (result.ownership === "own") {
      if (!user) return;
      void fetchMyStanding(user.id).then((res) => {
        if (!cancelled && res.status === "ok") setShareRank(res.data?.rank ?? null);
      });
    } else {
      void fetchScoreStanding(computeBlinkScore(result).total).then((res) => {
        if (cancelled || res.status !== "ok") return;
        setStanding(res.data);
        setShareRank(res.data?.rank ?? null);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [load, user]);

  const analysis = load.state === "ready" ? load.analysis : null;
  const date = analysis
    ? new Date(analysis.createdAt).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : undefined;

  return (
    <AppShell
      title={t.detail.title}
      subtitle={date}
      action={
        analysis ? (
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label={t.detail.shareThis}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-bold text-white/80 transition-colors hover:bg-white/[0.1]"
          >
            <Share2 className="h-3.5 w-3.5" />
            {t.detail.share}
          </button>
        ) : undefined
      }
    >
      {load.state === "loading" && <SkeletonList rows={4} />}

      {load.state === "error" && (
        <ErrorState message={load.message} onRetry={() => void refresh()} />
      )}

      {load.state === "missing" && (
        <EmptyState
          icon={FileQuestion}
          title={t.detail.notFoundTitle}
          description={t.detail.notFoundBody}
          action={
            <button
              type="button"
              onClick={goBack}
              className="rounded-2xl bg-blink-sky px-6 py-3 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02]"
            >
              {t.common.back}
            </button>
          }
        />
      )}

      {analysis && (
        <>
          <AnalysisResult result={analysis.result} standing={standing} />
          <ShareSheet
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            result={analysis.result}
            rank={shareRank}
          />
        </>
      )}
    </AppShell>
  );
}
