/**
 * Blink — authenticated home.
 *
 * Answers three things at a glance: where you stand, what to do next, and what
 * that action will change. The primary action is always uploading a new
 * screenshot, because that is the only thing that moves a score.
 */

import { motion } from "framer-motion";
import { ArrowRight, Camera, LayoutGrid, Trophy, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppShell } from "@/components/app/AppShell";
import { ErrorState, SkeletonList } from "@/components/app/states";
import { MomentumPill, StatGrid, StatTile } from "@/components/app/stats";
import { formatRank } from "@/lib/app-nav";
import { useAuth } from "@/hooks/useAuth";
import { fetchFullProfile, type FullProfile } from "@/lib/blink-profile";
import { fetchMyStanding } from "@/lib/leaderboard";
import { pointsToNextTier } from "@/lib/ranking";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; data: FullProfile; rank: number | null };

export default function AppHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ state: "loading" });

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoad({ state: "loading" });

    const standing = await fetchMyStanding(user.id);
    const rank = standing.status === "ok" ? (standing.data?.rank ?? null) : null;

    const full = await fetchFullProfile(user.id, rank);
    if (full.status === "error") {
      setLoad({ state: "error", message: full.message });
      return;
    }
    setLoad({ state: "ready", data: full.data, rank });
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const firstName = user?.name?.split(" ")[0];

  return (
    <AppShell
      title={firstName ? `Hey, ${firstName}` : "Welcome to Blink"}
      subtitle="See how a profile comes across — and make yours read the way you want."
    >
      <div className="space-y-6">
        {/* Primary action */}
        <motion.button
          type="button"
          onClick={() => navigate("/analyze")}
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="group flex w-full items-center gap-4 rounded-3xl bg-blink-sky p-5 text-left transition-transform hover:scale-[1.01]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blink-navy/10">
            <Camera className="h-6 w-6 text-blink-navy" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-blink-navy">Analyze a profile</p>
            <p className="mt-0.5 text-xs font-medium text-blink-navy/65">
              Upload a screenshot — yours or anyone&rsquo;s
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-blink-navy/50 transition-transform group-hover:translate-x-0.5" />
        </motion.button>

        {load.state === "loading" && <SkeletonList rows={2} />}

        {load.state === "error" && (
          <ErrorState message={load.message} onRetry={() => void refresh()} />
        )}

        {load.state === "ready" && (
          <StandingSummary data={load.data} rank={load.rank} />
        )}

        {/* Shortcuts */}
        <div className="grid grid-cols-3 gap-3">
          <Shortcut icon={LayoutGrid} label="Library" onClick={() => navigate("/library")} />
          <Shortcut icon={Trophy} label="Ranks" onClick={() => navigate("/ranks")} />
          <Shortcut icon={User} label="Profile" onClick={() => navigate("/profile")} />
        </div>
      </div>
    </AppShell>
  );
}

function StandingSummary({ data, rank }: { data: FullProfile; rank: number | null }) {
  const navigate = useNavigate();
  const { stats } = data;

  if (stats.verifiedCount === 0) {
    return (
      <section className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6">
        <p className="text-sm font-bold text-white">You don&rsquo;t have a Blink Score yet</p>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          Upload a screenshot of your own profile — the one showing{" "}
          <span className="font-semibold text-white/70">Edit profile</span> — and Blink
          will score how well it reads, then show you what to change.
        </p>
      </section>
    );
  }

  const next = pointsToNextTier(stats.score);

  return (
    <section className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/40">
            Blink Score
          </p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight text-white">
            {stats.score}
          </p>
          <p className="mt-1 text-sm font-semibold text-blink-sky">{stats.tier.label}</p>
        </div>
        <MomentumPill momentum={stats.momentum} />
      </div>

      <div className="mt-5">
        <StatGrid>
          <StatTile label="Rank" value={formatRank(rank)} accent />
          <StatTile label="Best" value={formatRank(stats.bestRank)} />
          <StatTile label="Streak" value={`${stats.streak}w`} />
        </StatGrid>
      </div>

      {next && (
        <p className="mt-4 text-xs leading-relaxed text-white/45">
          {next.points} points to <span className="font-bold text-white/70">{next.tier.label}</span>.
          A higher rank means a more optimized profile.
        </p>
      )}

      <button
        type="button"
        onClick={() => navigate("/profile")}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blink-sky transition-opacity hover:opacity-80"
      >
        View full profile
        <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}

function Shortcut({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Trophy;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
    >
      <Icon className="h-5 w-5 text-white/60" />
      <span className="text-xs font-semibold text-white/70">{label}</span>
    </motion.button>
  );
}
