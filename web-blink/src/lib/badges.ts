/**
 * Blink — the badge system.
 *
 * Badges were previously six identical rounded rectangles holding six numbers,
 * which is a stat table wearing a costume. A badge has to be *recognisable* —
 * you should know which one it is from its silhouette before you read it, and
 * you should be able to tell at a glance whether it is worth having.
 *
 * So the system has two axes:
 *
 *  - **Silhouette** distinguishes *what* the badge is. Six achievements, four
 *    shapes, assigned by kind rather than at random: standing is a shield,
 *    records are struck hexes, change-over-time points upward, activity is a
 *    token. The shield and the upward tag deliberately point opposite ways so
 *    they never read as the same badge from the corner of your eye.
 *  - **Grade** distinguishes *how good it is*. `locked` is an empty outline,
 *    `earned` takes the house accent, and `elite` — reserved for genuinely
 *    hard thresholds — takes a warm metallic treatment that appears nowhere
 *    else in the product, so it reads as rare rather than as another colour.
 *
 * The thresholds live here, not in the view, so "what counts as elite" is one
 * decision in one place and can be tested.
 */

import { MESSAGES, type Messages } from "@/lib/messages";
import { deltaOutOfTen, scoreOutOfTen } from "@/lib/ranking";

export type EmblemShape = "shield" | "hex" | "disc" | "chevron";
export type BadgeGrade = "locked" | "earned" | "elite";

export type BadgeIcon =
  | "rank"
  | "peak"
  | "movement"
  | "movementDown"
  | "momentum"
  | "streak"
  | "verified"
  /** Status marks — earned by position rather than by activity. */
  | "champion"
  | "elite"
  | "topten";

export interface BadgeSpec {
  id: string;
  /** Short name under the emblem. */
  label: string;
  /** The number or symbol inside the emblem. */
  value: string;
  /** Sentence shown when the badge is opened. */
  detail: string;
  shape: EmblemShape;
  icon: BadgeIcon;
  grade: BadgeGrade;
}

export interface BadgeInput {
  bestRank: number | null;
  peakScore: number;
  /** Places moved on the global board since the last snapshot. */
  movement: number | null;
  /** Points since the previous verified analysis. */
  momentumDelta: number;
  streak: number;
  verifiedCount: number;
}

/**
 * Status earned by *position*, not by activity.
 *
 * These are the collectible half of the system: you can't grind them, you have
 * to be there. They are computed separately from the record badges because
 * they appear and disappear as the board moves, and because a profile that
 * holds none of them should show none rather than three greyed-out ghosts —
 * an empty shelf is honest, a shelf of locked trophies is discouraging.
 */
export interface StatusInput {
  /** Current global rank, or null if unranked. */
  rank: number | null;
  /** Current rank within the profile's category. */
  categoryRank: number | null;
  /** Display label of the category, e.g. "Larp". */
  categoryLabel: string | null;
  /** Places gained since the last snapshot. */
  movement: number | null;
}

/**
 * The dictionary these builders read.
 *
 * `t` is optional because a few callers (tests, and the share-image renderer)
 * have no React context to read a language from. Falling back to the English
 * dictionary keeps one source for the words either way — the alternative was
 * an English literal beside every lookup, which is exactly how eleven badge
 * sentences stayed untranslated and shipped to the French profile page.
 */
function words(t?: Messages) {
  return (t ?? MESSAGES.en).badges;
}

export function buildStatusBadges(input: StatusInput, t?: Messages): BadgeSpec[] {
  const badges: BadgeSpec[] = [];
  const { rank, categoryRank, categoryLabel, movement } = input;

  if (categoryRank === 1 && categoryLabel) {
    badges.push({
      id: "champion",
      label: `${categoryLabel} ${words(t).icon}`,
      value: "#1",
      detail: words(t).details.champion.replace("{category}", categoryLabel),
      shape: "shield",
      icon: "champion",
      grade: "elite",
    });
  }

  if (rank !== null && rank > 0 && rank <= 3) {
    badges.push({
      id: "elite",
      label: t?.badges.elite ?? "Elite",
      value: `#${rank}`,
      detail: words(t).details.elite,
      shape: "hex",
      icon: "elite",
      grade: "elite",
    });
  } else if (rank !== null && rank > 0 && rank <= 10) {
    badges.push({
      id: "topten",
      label: t?.badges.topten ?? "Top 10",
      value: `#${rank}`,
      detail: words(t).details.topten,
      shape: "hex",
      icon: "topten",
      grade: "earned",
    });
  }

  if (movement !== null && movement >= 3) {
    badges.push({
      id: "rising",
      label: t?.badges.rising ?? "Rising",
      value: `+${movement}`,
      detail: words(t).details.rising,
      shape: "chevron",
      icon: "movement",
      grade: movement >= 5 ? "elite" : "earned",
    });
  }

  return badges;
}

/** Thresholds at which a badge stops being routine. Deliberately demanding. */
const ELITE = {
  bestRank: 10,
  peakScore: 800,
  movement: 5,
  momentum: 40,
  streak: 4,
  verified: 10,
} as const;

function grade(earned: boolean, elite: boolean): BadgeGrade {
  if (!earned) return "locked";
  return elite ? "elite" : "earned";
}

/** Signed movement as a symbol, since the arrow carries the meaning. */
function movementValue(movement: number | null): string {
  if (movement === null || movement === 0) return "—";
  return movement > 0 ? `+${movement}` : String(movement);
}

export function buildBadges(input: BadgeInput, isMe: boolean, t?: Messages): BadgeSpec[] {
  const who = isMe ? words(t).details.mine : words(t).details.theirs;
  const { bestRank, peakScore, movement, momentumDelta, streak, verifiedCount } = input;

  return [
    {
      id: "best",
      label: t?.badges.bestRank ?? "Best rank",
      value: bestRank === null || bestRank <= 0 ? "—" : `#${bestRank}`,
      detail: words(t).details.best.replace("{whose}", who),
      shape: "shield",
      icon: "rank",
      grade: grade(bestRank !== null && bestRank > 0, bestRank !== null && bestRank <= ELITE.bestRank),
    },
    {
      id: "peak",
      label: t?.badges.peakScore ?? "Peak score",
      value: peakScore > 0 ? scoreOutOfTen(peakScore) : "—",
      detail: words(t).details.peak.replace("{whose}", who),
      shape: "hex",
      icon: "peak",
      grade: grade(peakScore > 0, peakScore >= ELITE.peakScore),
    },
    {
      id: "movement",
      label: t?.badges.movement ?? "Movement",
      value: movementValue(movement),
      detail:
        movement === null ? words(t).details.movementNone : words(t).details.movement,
      shape: "chevron",
      /* The glyph has to agree with the number printed inside it. It was
         always the rising arrow, so a profile that had *lost* a place showed
         an upward arrow over the value "-1" — the emblem asserting the
         opposite of its own number, and the opposite of the ↓ the leaderboard
         showed for the same profile. */
      icon: movement !== null && movement < 0 ? "movementDown" : "movement",
      grade: grade(
        movement !== null && movement !== 0,
        movement !== null && movement >= ELITE.movement,
      ),
    },
    {
      id: "momentum",
      label: t?.badges.momentum ?? "Momentum",
      value: deltaOutOfTen(momentumDelta),
      detail: words(t).details.momentum,
      shape: "chevron",
      icon: "momentum",
      grade: grade(momentumDelta !== 0, momentumDelta >= ELITE.momentum),
    },
    {
      id: "streak",
      label: t?.badges.streak ?? "Streak",
      value: `${streak}${words(t).weeks}`,
      detail: words(t).details.streak,
      shape: "disc",
      icon: "streak",
      grade: grade(streak > 0, streak >= ELITE.streak),
    },
    {
      id: "verified",
      label: t?.badges.verified ?? "Verified",
      value: String(verifiedCount),
      detail: words(t).details.verified,
      shape: "hex",
      icon: "verified",
      grade: grade(verifiedCount > 0, verifiedCount >= ELITE.verified),
    },
  ];
}

/** How many of a set have actually been earned — used for the section header. */
export function earnedCount(badges: BadgeSpec[]): number {
  return badges.filter((b) => b.grade !== "locked").length;
}
