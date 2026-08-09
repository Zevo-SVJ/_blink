/**
 * Blink — how to climb.
 *
 * The score rewards how clearly a profile reads, but that is not only a design
 * problem. Someone who likes their profile exactly as it is should still have
 * real ways to move: adding to the body of work, staying consistent, showing
 * up regularly, and re-verifying what they've changed.
 *
 * So the paths below deliberately span both kinds of effort, and the ones that
 * ask you to *change* how the profile looks are never presented as required.
 * Nothing here suggests replacing a profile picture; the model's own
 * recommendations cover profile-specific opportunities, and those are shown
 * alongside these as a separate list.
 *
 * Impact figures are ranges, not promises: the score is computed from the next
 * analysis, so the honest claim is what a path typically moves, not what it
 * guarantees.
 */

import type { ProfileStats } from "@/lib/ranking";

export type ClimbPathId =
  | "content-depth"
  | "consistency"
  | "verify"
  | "streak"
  | "momentum"
  | "clarity";

export interface ClimbPath {
  id: ClimbPathId;
  title: string;
  /** What to actually do. */
  action: string;
  /** Why it moves the score, in terms of perception. */
  why: string;
  /** Typical range, or null when it depends entirely on the profile. */
  impact: string | null;
  /** True when this is the most useful next step for this specific user. */
  priority: boolean;
  /** Requires changing how the profile looks. Never auto-prioritised. */
  redesign: boolean;
}

/**
 * Build the climb paths for a user, ordered with the most useful first.
 *
 * Priority is derived from their actual stats rather than fixed: someone with
 * a broken streak needs a different nudge from someone who has never
 * re-verified.
 */
export function getClimbPaths(stats: ProfileStats): ClimbPath[] {
  const neverReVerified = stats.verifiedCount <= 1;
  const streakBroken = stats.streak === 0;
  const losingGround = stats.momentum.direction === "down";
  const belowPeak = stats.peakScore > stats.score;

  const paths: ClimbPath[] = [
    {
      id: "content-depth",
      title: "Add to the body of work",
      action:
        "Post a few more in the treatment you already use — Reels included. You don't need a new look, just more of the one you have.",
      why: "A grid that stops early reads as abandoned rather than curated. Depth turns a consistent look into a body of work, which is what lifts Visual Identity and Aesthetic.",
      impact: "Typically +20-60",
      priority: !neverReVerified && !streakBroken,
      redesign: false,
    },
    {
      id: "consistency",
      title: "Keep the through-line",
      action:
        "Keep new posts in the same palette and framing as the ones you like most. Nothing to redo — just don't break the pattern.",
      why: "Coherence is a fifth of the score. Scattered signals cost more than any single weak post, so holding one line raises the floor across every axis.",
      impact: "Typically +15-40",
      priority: false,
      redesign: false,
    },
    {
      id: "verify",
      title: "Re-verify what you've changed",
      action:
        "Upload a fresh screenshot after any real change. Blink re-reads the profile and the new score replaces the old one.",
      why: "Nothing moves your rank until it's verified. Changes you've already made are worth nothing to the board until a new screenshot proves them.",
      impact: "Unlocks every other path",
      priority: neverReVerified || belowPeak,
      redesign: false,
    },
    {
      id: "streak",
      title: "Show up weekly",
      action:
        "One verified analysis a week keeps your streak alive. A single upload counts.",
      why: "Streaks record sustained attention, and an active profile holds position while dormant ones drift down as others improve.",
      impact: "Protects your rank",
      priority: streakBroken,
      redesign: false,
    },
    {
      id: "momentum",
      title: "Recover momentum",
      action:
        "Momentum is the gap between your last two verified analyses. Make one concrete change and re-upload to turn it positive.",
      why: "Momentum is what separates profiles on similar scores, and it's the signal weekly winners are chosen on — biggest verified improvement, not highest score.",
      impact: "Decides close positions",
      priority: losingGround,
      redesign: false,
    },
    {
      id: "clarity",
      title: "Make the subject legible",
      action:
        "If someone landing cold can't tell what the account is about in three seconds, say it in the name field or bio. Optional — plenty of strong profiles work by withholding.",
      why: "Clarity is a tenth of the score, and it's the axis most often left on the table. But deliberate opacity is a valid strategy: if mystery is the point, skip this.",
      impact: "Typically +10-30",
      priority: false,
      redesign: true,
    },
  ];

  // Priority paths first, then non-redesign work, preserving order within groups.
  return [...paths].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    if (a.redesign !== b.redesign) return a.redesign ? 1 : -1;
    return 0;
  });
}

/** One-line summary of where the user stands, used above the paths. */
export function climbHeadline(stats: ProfileStats, rank: number | null): string {
  if (stats.verifiedCount === 0) {
    return "Analyze your own profile to get a score and a position.";
  }
  if (rank === null) {
    return `You're at ${stats.score}. Turn on leaderboard visibility to take a position.`;
  }
  if (stats.momentum.direction === "up") {
    return `You're at ${stats.score}, rank #${rank}, and climbing.`;
  }
  if (stats.momentum.direction === "down") {
    return `You're at ${stats.score}, rank #${rank}. Momentum has turned negative.`;
  }
  return `You're at ${stats.score}, rank #${rank}.`;
}
