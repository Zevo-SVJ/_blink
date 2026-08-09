/**
 * Blink — someone else's public profile, opened from the leaderboard.
 *
 * Everything shown comes from the `leaderboard` view, which only contains
 * profiles that opted in *and* have a verified analysis. That means visibility
 * is enforced by the query rather than by a check here: a private profile
 * simply isn't returned, and the page shows "not available" instead.
 */

import { ArrowLeft, UserX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AppShell } from "@/components/app/AppShell";
import { PublicProfileCard, type PublicProfileView } from "@/components/app/PublicProfileCard";
import { EmptyState, ErrorState, SkeletonList } from "@/components/app/states";
import { useAuth } from "@/hooks/useAuth";
import { fetchPublicStanding, type LeaderboardEntry } from "@/lib/leaderboard";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "missing" }
  | { state: "ready"; entry: LeaderboardEntry };

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ state: "loading" });

  const refresh = useCallback(async () => {
    if (!id) {
      setLoad({ state: "missing" });
      return;
    }
    setLoad({ state: "loading" });
    const res = await fetchPublicStanding(id);
    if (res.status === "error") {
      setLoad({ state: "error", message: res.message });
      return;
    }
    if (!res.data) {
      setLoad({ state: "missing" });
      return;
    }
    setLoad({ state: "ready", entry: res.data });
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const entry = load.state === "ready" ? load.entry : null;
  const title = entry
    ? (entry.handle ? `@${entry.handle}` : (entry.displayName ?? "Profile"))
    : "Profile";

  return (
    <AppShell
      title={title}
      action={
        <button
          type="button"
          onClick={() => navigate("/ranks")}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-bold text-white/80 transition-colors hover:bg-white/[0.1]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Ranks
        </button>
      }
    >
      {load.state === "loading" && <SkeletonList rows={3} />}

      {load.state === "error" && (
        <ErrorState message={load.message} onRetry={() => void refresh()} />
      )}

      {load.state === "missing" && (
        <EmptyState
          icon={UserX}
          title="Profile not available"
          description="This profile is private, or it isn't on the leaderboard yet."
          action={
            <button
              type="button"
              onClick={() => navigate("/ranks")}
              className="rounded-2xl bg-blink-sky px-6 py-3 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02]"
            >
              Back to Ranks
            </button>
          }
        />
      )}

      {entry && (
        <PublicProfileCard
          view={toView(entry)}
          isMe={user?.id === entry.id}
        />
      )}
    </AppShell>
  );
}

/**
 * The board row carries everything a public profile shows except momentum,
 * which lives in private score history. Rather than claim a value we can't
 * see, momentum reads as zero for other people's profiles.
 */
function toView(entry: LeaderboardEntry): PublicProfileView {
  return {
    displayName: entry.displayName,
    handle: entry.handle,
    avatarUrl: entry.avatarUrl,
    country: entry.country,
    instagramUrl: entry.instagramUrl,
    score: entry.score,
    peakScore: entry.peakScore,
    verifiedCount: entry.verifiedCount,
    streak: entry.streak,
    standing: entry,
    // Peak rank isn't exposed publicly; the board's own rank is the honest
    // claim, so best rank is omitted rather than guessed from it.
    bestRank: null,
    momentumDelta: 0,
  };
}
