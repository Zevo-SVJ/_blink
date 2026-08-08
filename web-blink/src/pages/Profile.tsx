/**
 * Blink — your profile.
 *
 * Everything shown here is earned from verified analyses: a new screenshot of
 * your own profile. Opening the app changes nothing on this page, which is why
 * the score, streak and rank can be trusted as a record of real optimisation.
 */

import { motion } from "framer-motion";
import {
  ExternalLink,
  Flame,
  Globe,
  Lock,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppShell } from "@/components/app/AppShell";
import { EmptyState, ErrorState, SkeletonList } from "@/components/app/states";
import {
  MomentumPill,
  ScoreDial,
  StatGrid,
  StatTile,
} from "@/components/app/stats";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchFullProfile,
  updateBlinkProfile,
  type FullProfile,
} from "@/lib/blink-profile";
import { formatRank } from "@/lib/app-nav";
import { fetchMyStanding } from "@/lib/leaderboard";
import { pointsToNextTier } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; data: FullProfile; rank: number | null };

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [savingVisibility, setSavingVisibility] = useState(false);

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

  const toggleVisibility = async () => {
    if (load.state !== "ready" || !user) return;
    const next = !(load.data.profile?.isPublic ?? false);
    setSavingVisibility(true);
    const res = await updateBlinkProfile(user.id, { isPublic: next });
    setSavingVisibility(false);
    if (res.status === "ok") void refresh();
  };

  return (
    <AppShell
      title="Your profile"
      subtitle="Your Blink Score reflects how optimized your profile is — not how many people follow you."
    >
      {load.state === "loading" && <SkeletonList rows={4} />}

      {load.state === "error" && (
        <ErrorState message={load.message} onRetry={() => void refresh()} />
      )}

      {load.state === "ready" && (
        <ProfileBody
          data={load.data}
          rank={load.rank}
          savingVisibility={savingVisibility}
          onToggleVisibility={toggleVisibility}
          onAnalyze={() => navigate("/analyze")}
        />
      )}
    </AppShell>
  );
}

function ProfileBody({
  data,
  rank,
  savingVisibility,
  onToggleVisibility,
  onAnalyze,
}: {
  data: FullProfile;
  rank: number | null;
  savingVisibility: boolean;
  onToggleVisibility: () => void;
  onAnalyze: () => void;
}) {
  const { stats, profile } = data;

  if (stats.verifiedCount === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No verified analysis yet"
        description="Upload a screenshot of your own Instagram profile — the one showing Edit profile — to get your first Blink Score."
        action={
          <button
            type="button"
            onClick={onAnalyze}
            className="rounded-2xl bg-blink-sky px-6 py-3 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02]"
          >
            Analyze your profile
          </button>
        }
      />
    );
  }

  const next = pointsToNextTier(stats.score);

  return (
    <div className="space-y-6">
      {/* Score */}
      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex flex-col items-center rounded-3xl border border-white/[0.07] bg-white/[0.03] p-7"
      >
        <ScoreDial score={stats.score} tier={stats.tier} />
        <p className="mt-5 max-w-sm text-center text-sm leading-relaxed text-white/55">
          {stats.tier.meaning}
        </p>
        <div className="mt-4">
          <MomentumPill momentum={stats.momentum} />
        </div>

        {next && (
          <div className="mt-6 w-full max-w-xs">
            <div className="flex items-center justify-between text-[0.7rem] font-semibold text-white/40">
              <span>{stats.tier.label}</span>
              <span>{next.tier.label}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className="h-full rounded-full bg-blink-sky"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, ((stats.score - stats.tier.min) / (next.tier.min - stats.tier.min)) * 100)}%`,
                }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-white/40">
              {next.points} points to {next.tier.label}
            </p>
          </div>
        )}
      </motion.section>

      {/* Standings */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white/40">
          Standing
        </h2>
        <StatGrid>
          <StatTile label="Current rank" value={formatRank(rank)} accent hint="Global" />
          <StatTile label="Best rank" value={formatRank(stats.bestRank)} hint="All time" />
          <StatTile label="Peak score" value={String(stats.peakScore)} hint="Your highest" />
          <StatTile
            label="Category"
            value={stats.category ?? "—"}
            hint={stats.category ? "Ranked within" : "Not yet assigned"}
          />
          <StatTile
            label="Momentum"
            value={stats.momentum.delta > 0 ? `+${stats.momentum.delta}` : String(stats.momentum.delta)}
            hint="Since last update"
          />
          <StatTile
            label="Streak"
            value={`${stats.streak}w`}
            hint="Weeks improving"
          />
        </StatGrid>
      </section>

      {/* Achievements */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white/40">
          Achievements
        </h2>
        <div className="space-y-2.5">
          <Achievement
            icon={Trophy}
            label="Verified improvements"
            value={`${stats.weeklyWins}`}
            description="Analyses that beat your previous score"
            earned={stats.weeklyWins > 0}
          />
          <Achievement
            icon={Flame}
            label="Current streak"
            value={`${stats.streak} ${stats.streak === 1 ? "week" : "weeks"}`}
            description="Consecutive weeks with a fresh screenshot"
            earned={stats.streak > 0}
          />
          <Achievement
            icon={Sparkles}
            label="Verified analyses"
            value={`${stats.verifiedCount}`}
            description="Real profile changes Blink has confirmed"
            earned={stats.verifiedCount > 0}
          />
        </div>
      </section>

      {/* Visibility + Instagram */}
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-bold text-white">
              {profile?.isPublic ? (
                <Globe className="h-4 w-4 text-blink-sky" />
              ) : (
                <Lock className="h-4 w-4 text-white/40" />
              )}
              {profile?.isPublic ? "On the leaderboard" : "Private"}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-white/45">
              {profile?.isPublic
                ? "Your handle and Blink Score appear in public standings."
                : "Your score is yours alone. Go public to appear in the leaderboards."}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleVisibility}
            disabled={savingVisibility}
            className={cn(
              "shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition-colors disabled:opacity-50",
              profile?.isPublic
                ? "border border-white/10 bg-white/[0.05] text-white/80 hover:bg-white/10"
                : "bg-blink-sky text-blink-navy hover:bg-[hsl(var(--blink-sky-2))]",
            )}
          >
            {savingVisibility ? "Saving…" : profile?.isPublic ? "Go private" : "Go public"}
          </button>
        </div>

        {profile?.handle && (
          <a
            href={`https://instagram.com/${profile.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            @{profile.handle}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </section>

      {/* Loop reminder */}
      <section className="rounded-2xl border border-blink-sky/20 bg-blink-sky/[0.05] p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-blink-sky">
          How to climb
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Change something real on Instagram, then upload a new screenshot. Blink
          re-analyzes it and your score moves only if the profile actually improved.
        </p>
        <button
          type="button"
          onClick={onAnalyze}
          className="mt-4 rounded-2xl bg-blink-sky px-5 py-3 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Upload a new screenshot
        </button>
      </section>
    </div>
  );
}

function Achievement({
  icon: Icon,
  label,
  value,
  description,
  earned,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  description: string;
  earned: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-4",
        earned
          ? "border-white/[0.09] bg-white/[0.04]"
          : "border-white/[0.05] bg-white/[0.02]",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          earned ? "bg-blink-sky/15" : "bg-white/[0.04]",
        )}
      >
        <Icon className={cn("h-5 w-5", earned ? "text-blink-sky" : "text-white/25")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="mt-0.5 text-xs leading-snug text-white/40">{description}</p>
      </div>
      <span
        className={cn(
          "shrink-0 text-lg font-extrabold tabular-nums",
          earned ? "text-white" : "text-white/25",
        )}
      >
        {value}
      </span>
    </div>
  );
}
