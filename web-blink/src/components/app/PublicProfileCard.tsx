/**
 * Blink — the public profile presentation.
 *
 * One component for your own profile and for anyone you open from the
 * leaderboard, so the two can't drift apart.
 *
 * Rank claims are the delicate part. A stored `category` string is not
 * evidence of a category standing — the profile may be private, may have no
 * verified analysis, or may simply not be in that board. So every claim here
 * is driven by a real leaderboard row, and anything we don't have is omitted
 * rather than shown as a placeholder.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ExternalLink,
  Flame,
  Medal,
  Sparkles,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { AvatarPreview } from "@/components/app/IdentityForm";
import { formatRank } from "@/lib/app-nav";
import { categoryLabel } from "@/lib/categories";
import { countryName, flagEmoji } from "@/lib/countries";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { MAX_SCORE, getTier } from "@/lib/ranking";
import { cn } from "@/lib/utils";

export interface PublicProfileView {
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
  country: string | null;
  instagramUrl: string | null;
  score: number;
  peakScore: number;
  verifiedCount: number;
  streak: number;
  /** The user's real row on the global board, or null if they aren't on it. */
  standing: LeaderboardEntry | null;
  bestRank: number | null;
  /** Points since the previous verified analysis. */
  momentumDelta: number;
}

export function PublicProfileCard({
  view,
  isMe = false,
}: {
  view: PublicProfileView;
  isMe?: boolean;
}) {
  const name = view.displayName || (view.handle ? `@${view.handle}` : "Anonymous");
  const tier = getTier(view.score);
  const progress = Math.min(100, (view.score / MAX_SCORE) * 100);

  // Only claim a category standing when there is an actual row in that board.
  const categoryClaim =
    view.standing?.category && view.standing.categoryRank > 0
      ? { label: categoryLabel(view.standing.category)!, rank: view.standing.categoryRank }
      : null;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-5">
        <div className="flex items-center gap-4">
          <AvatarPreview url={view.avatarUrl} name={name} size={64} />

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate text-lg font-extrabold leading-tight text-white">
              <span className="truncate">{name}</span>
              {view.country && (
                <span
                  className="shrink-0"
                  title={countryName(view.country) ?? view.country}
                  aria-label={countryName(view.country) ?? view.country}
                >
                  {flagEmoji(view.country)}
                </span>
              )}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45">
              {view.handle && <span className="font-semibold text-white/60">@{view.handle}</span>}
              {categoryClaim && <span>{categoryClaim.label}</span>}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-2xl font-extrabold tabular-nums leading-none text-white">
              {view.score}
            </p>
            <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-blink-sky">
              {tier.label}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full rounded-full bg-blink-sky"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[0.7rem] text-white/40">
            {/* Never "#— global": if they aren't ranked, say so plainly. */}
            <span>
              {view.standing ? `${formatRank(view.standing.rank)} global` : "Not ranked"}
            </span>
            {categoryClaim && (
              <span>
                {formatRank(categoryClaim.rank)} in {categoryClaim.label}
              </span>
            )}
          </div>
        </div>

        {/* Only rendered when a real link exists. */}
        {view.instagramUrl && (
          <a
            href={view.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] py-2.5 text-xs font-bold text-white/80 transition-colors hover:bg-white/[0.1]"
          >
            View Instagram
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </section>

      <Badges view={view} isMe={isMe} />
    </div>
  );
}

interface Badge {
  id: string;
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  earned: boolean;
}

function buildBadges(view: PublicProfileView, isMe: boolean): Badge[] {
  const who = isMe ? "your" : "their";
  const movement = view.standing?.movement ?? null;

  return [
    {
      id: "best",
      icon: Medal,
      label: "Best rank",
      value: formatRank(view.bestRank),
      detail: `The highest position ${who} profile has held. It never drops, even when the current rank does.`,
      earned: view.bestRank !== null,
    },
    {
      id: "peak",
      icon: Trophy,
      label: "Peak score",
      value: view.peakScore > 0 ? String(view.peakScore) : "—",
      detail: `The highest verified Blink Score ${who} profile has reached.`,
      earned: view.peakScore > 0,
    },
    {
      id: "movement",
      icon: TrendingUp,
      label: "Movement",
      value: movement === null ? "—" : movement > 0 ? `↑${movement}` : movement < 0 ? `↓${-movement}` : "—",
      detail:
        movement === null
          ? "Places moved since the last leaderboard snapshot. Nothing recorded yet."
          : "Places moved on the global board since the last snapshot.",
      earned: movement !== null && movement !== 0,
    },
    {
      id: "momentum",
      icon: Sparkles,
      label: "Momentum",
      value: view.momentumDelta > 0 ? `+${view.momentumDelta}` : String(view.momentumDelta),
      detail:
        "Points gained or lost since the previous verified analysis. Only a new screenshot moves it.",
      earned: view.momentumDelta !== 0,
    },
    {
      id: "streak",
      icon: Flame,
      label: "Streak",
      value: `${view.streak}w`,
      detail: "Consecutive weeks with a verified analysis. Opening the app doesn't count.",
      earned: view.streak > 0,
    },
    {
      id: "verified",
      icon: Check,
      label: "Verified",
      value: String(view.verifiedCount),
      detail: "Profile changes Blink has confirmed from a new screenshot.",
      earned: view.verifiedCount > 0,
    },
  ];
}

function Badges({ view, isMe }: { view: PublicProfileView; isMe: boolean }) {
  const badges = buildBadges(view, isMe);
  const [open, setOpen] = useState<string | null>(null);
  const active = badges.find((b) => b.id === open) ?? null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white/40">
        {isMe ? "Earned" : "Record"}
      </h2>

      <div className="grid grid-cols-3 gap-2.5">
        {badges.map((badge) => {
          const Icon = badge.icon;
          const isOpen = open === badge.id;
          return (
            <motion.button
              key={badge.id}
              type="button"
              onClick={() => setOpen(isOpen ? null : badge.id)}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              aria-expanded={isOpen}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-colors",
                isOpen
                  ? "border-blink-sky/40 bg-blink-sky/[0.09]"
                  : badge.earned
                    ? "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07]"
                    : "border-white/[0.05] bg-white/[0.02]",
              )}
            >
              <Icon className={cn("h-4 w-4", badge.earned ? "text-blink-sky" : "text-white/25")} />
              <span
                className={cn(
                  "text-base font-extrabold tabular-nums leading-none",
                  badge.earned ? "text-white" : "text-white/30",
                )}
              >
                {badge.value}
              </span>
              <span className="text-center text-[0.62rem] font-semibold leading-tight text-white/40">
                {badge.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {active && (
          <motion.p
            key={active.id}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-white/55"
          >
            <span className="font-bold text-white/75">{active.label}. </span>
            {active.detail}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
