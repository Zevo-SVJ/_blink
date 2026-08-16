/**
 * Blink — score, rank and progression.
 *
 * What the Blink Score measures: how well a profile communicates a clear,
 * intentional first impression. Nothing here reads follower counts, verified
 * badges, wealth or fame — those aren't inputs, so a 200-follower account with
 * a coherent identity outranks a celebrity with a muddled one. That is the
 * whole point of the ladder.
 *
 * What moves it: a newly uploaded screenshot of your own profile that Blink
 * re-analyses. Opening the app does nothing. Re-uploading a screenshot you
 * already submitted does nothing. See `verifyProgression`.
 */

import type { AnalysisResult, SignalScore } from "@/lib/analysis";
import type { Messages } from "@/lib/messages";

// ---------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------

export const MAX_SCORE = 1000;

/** Signals where "higher is unambiguously better optimised". */
const CRAFT_SIGNALS = ["Visual Identity", "Aesthetic", "Confidence"];

export interface ScoreBreakdown {
  /** Strength of the overall first impression. */
  impression: number;
  /** Craft of the controllable visual signals. */
  craft: number;
  /** How consistently the signals tell one story. */
  coherence: number;
  /** How legibly the profile communicates a recognisable identity. */
  clarity: number;
  /** Final 0-1000 score. */
  total: number;
}

const WEIGHTS = {
  impression: 0.4,
  craft: 0.3,
  coherence: 0.2,
  clarity: 0.1,
} as const;

/**
 * Tier wording for the reader's language.
 *
 * `TIERS` keeps the ids and thresholds — those are the ranking system and must
 * not move with a translation — and the words are looked up by id.
 */
export function tierLabel(tier: { id: string; label: string }, t?: Messages): string {
  return t?.tiers[tier.id as keyof Messages["tiers"]]?.label ?? tier.label;
}

export function tierMeaning(tier: { id: string; meaning: string }, t?: Messages): string {
  return t?.tiers[tier.id as keyof Messages["tiers"]]?.meaning ?? tier.meaning;
}

function signalByLabel(signals: SignalScore[], label: string): number {
  return signals.find((s) => s.label === label)?.score ?? 5;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Turn an analysis into a 0-1000 Blink Score.
 *
 * Coherence rewards a profile whose signals agree with each other. A profile
 * that reads 9/10 on some axes and 2/10 on others is sending mixed messages,
 * which is exactly what optimisation is supposed to resolve — so spread is
 * penalised even when the average is high.
 */
export function computeBlinkScore(result: AnalysisResult): ScoreBreakdown {
  const signals = result.signals ?? [];
  const values = signals.map((s) => s.score);

  const impression = clamp(result.overallScore ?? 5, 0, 10);
  const craft = mean(CRAFT_SIGNALS.map((l) => signalByLabel(signals, l)));

  // Population standard deviation, mapped so 0 spread => 10, ~3.3 spread => 0.
  const avg = mean(values);
  const variance = mean(values.map((v) => (v - avg) ** 2));
  const spread = Math.sqrt(variance);

  // A profile that scores near zero on everything is technically "consistent",
  // but consistency at the floor is the absence of an identity, not a coherent
  // one. Scale the credit by how much signal there is to be coherent about, so
  // an empty profile earns nothing here.
  const coherenceWeight = clamp(avg / 5, 0, 1);
  const coherence = clamp(10 - spread * 3, 0, 10) * coherenceWeight;

  const clarity = clamp((result.category?.categoryConfidence ?? 0) * 10, 0, 10);

  const weighted =
    impression * WEIGHTS.impression +
    craft * WEIGHTS.craft +
    coherence * WEIGHTS.coherence +
    clarity * WEIGHTS.clarity;

  return {
    impression,
    craft,
    coherence,
    clarity,
    total: Math.round(clamp(weighted, 0, 10) * (MAX_SCORE / 10)),
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------

export interface Tier {
  id: string;
  label: string;
  /** Inclusive lower bound. */
  min: number;
  /** What reaching this tier actually means. */
  meaning: string;
}

export const TIERS: Tier[] = [
  { id: "unread", label: "Unread", min: 0, meaning: "The profile hasn't decided what it's saying yet." },
  { id: "emerging", label: "Emerging", min: 400, meaning: "A direction is forming, but it reads inconsistently." },
  { id: "defined", label: "Defined", min: 550, meaning: "The impression is clear and holds together." },
  { id: "sharp", label: "Sharp", min: 680, meaning: "Deliberate. Every element is pulling the same way." },
  { id: "magnetic", label: "Magnetic", min: 790, meaning: "Reads as intentional within seconds." },
  { id: "iconic", label: "Iconic", min: 890, meaning: "Nothing is accidental. The impression is unmistakable." },
];

export function getTier(score: number): Tier {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (score >= tier.min) current = tier;
  }
  return current;
}

/** Points still needed to reach the next tier, or null at the top. */
export function pointsToNextTier(score: number): { tier: Tier; points: number } | null {
  const next = TIERS.find((t) => t.min > score);
  return next ? { tier: next, points: next.min - score } : null;
}

// ---------------------------------------------------------------------------
// History & progression
// ---------------------------------------------------------------------------

export interface ScoreEntry {
  id: string;
  /** ISO timestamp. */
  createdAt: string;
  score: number;
  category: string | null;
  /** Hash of the uploaded screenshot — how we tell a real re-upload from a repeat. */
  imageHash: string | null;
  /** Whether this entry was allowed to move the user's rank. */
  verified: boolean;
}

export type RejectionReason =
  | "NOT_OWN_PROFILE"
  | "DUPLICATE_SCREENSHOT";

export interface ProgressionCheck {
  /** True when this upload is allowed to change the score and rank. */
  counts: boolean;
  reason?: RejectionReason;
  /** User-facing explanation when it doesn't count. */
  message?: string;
}

export const REJECTION_MESSAGES: Record<RejectionReason, string> = {
  NOT_OWN_PROFILE:
    "Only your own profile affects your Blink Score. Upload a screenshot showing Edit profile.",
  DUPLICATE_SCREENSHOT:
    "This is the same screenshot as your last analysis. Change something on your profile, then upload a fresh one.",
};

/**
 * Decide whether an upload is allowed to move the user's rank.
 *
 * Two gates, both deliberate:
 *   1. It must be the user's own profile — you can't climb by analysing others.
 *   2. The screenshot must differ from the last verified one. Without this,
 *      re-submitting the same capture would inflate a streak and a score
 *      without the profile ever changing, which is exactly the fake progress
 *      the ladder is supposed to exclude.
 */
export function verifyProgression(
  result: AnalysisResult,
  imageHash: string | null,
  history: ScoreEntry[],
): ProgressionCheck {
  if (result.ownership !== "own") {
    return {
      counts: false,
      reason: "NOT_OWN_PROFILE",
      message: REJECTION_MESSAGES.NOT_OWN_PROFILE,
    };
  }

  const lastVerified = history.find((e) => e.verified);
  if (imageHash && lastVerified?.imageHash && lastVerified.imageHash === imageHash) {
    return {
      counts: false,
      reason: "DUPLICATE_SCREENSHOT",
      message: REJECTION_MESSAGES.DUPLICATE_SCREENSHOT,
    };
  }

  return { counts: true };
}

/** SHA-256 of the screenshot bytes, used to detect repeat uploads. */
export async function hashImage(base64: string): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const bytes = new TextEncoder().encode(base64);
    const digest = await subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Derived stats
// ---------------------------------------------------------------------------

export type MomentumDirection = "up" | "down" | "flat";

export interface Momentum {
  direction: MomentumDirection;
  /** Points gained or lost since the previous verified analysis. */
  delta: number;
  /** Human-readable summary. English; `momentumLabel` translates it. */
  label: string;
  /**
   * Which sentence this is, so the UI can render it in the reader's language
   * without parsing the English one back apart.
   */
  key: "flat" | "delta";
}

/** The momentum summary, in the reader's language. */
export function momentumLabel(momentum: Momentum, t?: Messages): string {
  if (!t) return momentum.label;
  if (momentum.key === "flat") return t.badges.noChange;
  const signed = momentum.delta > 0 ? `+${momentum.delta}` : String(momentum.delta);
  return `${signed} ${t.badges.sinceLast}`;
}

export interface ProfileStats {
  score: number;
  tier: Tier;
  peakScore: number;
  /** Null until the user appears on a leaderboard. */
  rank: number | null;
  bestRank: number | null;
  category: string | null;
  momentum: Momentum;
  /** Consecutive weeks containing at least one verified analysis. */
  streak: number;
  /** Count of verified analyses that improved on the previous one. */
  weeklyWins: number;
  verifiedCount: number;
}

/**
 * Momentum is the change since the previous *verified* analysis, so it always
 * reflects a real profile change rather than activity.
 */
export function computeMomentum(history: ScoreEntry[]): Momentum {
  const verified = history.filter((e) => e.verified);
  if (verified.length < 2) {
    return { direction: "flat", delta: 0, label: "No change yet", key: "flat" as const };
  }
  const delta = verified[0].score - verified[1].score;
  if (delta > 0) {
    return { direction: "up", delta, label: `+${delta} since last update`, key: "delta" as const };
  }
  if (delta < 0) {
    return { direction: "down", delta, label: `${delta} since last update`, key: "delta" as const };
  }
  return { direction: "flat", delta: 0, label: "Holding steady", key: "flat" as const };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** ISO week index — used to group entries into weeks. */
function weekIndex(iso: string): number {
  return Math.floor(new Date(iso).getTime() / WEEK_MS);
}

/**
 * Consecutive weeks with at least one verified analysis, counting back from
 * the current week. A week with only app opens and no new screenshot breaks
 * the streak, by design.
 */
export function computeStreak(history: ScoreEntry[], now: Date = new Date()): number {
  const weeks = new Set(
    history.filter((e) => e.verified).map((e) => weekIndex(e.createdAt)),
  );
  if (weeks.size === 0) return 0;

  const currentWeek = Math.floor(now.getTime() / WEEK_MS);
  // Allow the streak to be "alive" if last week counted but this week hasn't yet.
  let cursor = weeks.has(currentWeek) ? currentWeek : currentWeek - 1;
  if (!weeks.has(cursor)) return 0;

  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}

/** Verified analyses that scored higher than the one before them. */
export function countImprovements(history: ScoreEntry[]): number {
  const verified = [...history.filter((e) => e.verified)].reverse(); // oldest first
  let wins = 0;
  for (let i = 1; i < verified.length; i++) {
    if (verified[i].score > verified[i - 1].score) wins++;
  }
  return wins;
}

/**
 * Roll a user's verified history up into everything the Profile screen shows.
 * `history` must be newest-first.
 */
export function computeProfileStats(
  history: ScoreEntry[],
  rank: number | null = null,
  bestRank: number | null = null,
): ProfileStats {
  const verified = history.filter((e) => e.verified);
  const score = verified[0]?.score ?? 0;
  const peakScore = verified.reduce((max, e) => Math.max(max, e.score), 0);

  return {
    score,
    tier: getTier(score),
    peakScore,
    rank,
    bestRank: bestRank ?? rank,
    category: verified[0]?.category ?? null,
    momentum: computeMomentum(history),
    streak: computeStreak(history),
    weeklyWins: countImprovements(history),
    verifiedCount: verified.length,
  };
}

// ---------------------------------------------------------------------------
// Improvement loop
// ---------------------------------------------------------------------------

export interface ScoreDelta {
  previous: number;
  current: number;
  delta: number;
  improved: boolean;
  /** Which score components moved, for the "what changed" readout. */
  components: Array<{ label: string; delta: number }>;
}

/** Compare two analyses of the same profile, for the re-upload verification screen. */
export function compareAnalyses(
  previous: AnalysisResult,
  current: AnalysisResult,
): ScoreDelta {
  const a = computeBlinkScore(previous);
  const b = computeBlinkScore(current);

  return {
    previous: a.total,
    current: b.total,
    delta: b.total - a.total,
    improved: b.total > a.total,
    components: [
      { label: "First impression", delta: round1(b.impression - a.impression) },
      { label: "Visual craft", delta: round1(b.craft - a.craft) },
      { label: "Coherence", delta: round1(b.coherence - a.coherence) },
      { label: "Clarity", delta: round1(b.clarity - a.clarity) },
    ],
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
