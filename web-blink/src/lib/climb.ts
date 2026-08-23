/**
 * Blink — how to climb.
 *
 * ## The principle
 *
 * Most profile-scoring products end at "change your profile picture". That is
 * a bad answer twice over: it is generic, and it assumes the user wants to be
 * someone else. Plenty of people like their profile exactly as it is and are
 * still entitled to move up.
 *
 * So the paths here are built on the opposite premise — **the fastest route up
 * is usually to become more of what you already are.** Blink has already
 * decided what your profile reads as; leaning into that is a real strategy,
 * and it costs no redesign. Only one path touches how the profile *looks*, and
 * it is labelled optional and can never sort to the front.
 *
 * ## The shape of a path
 *
 * Every path answers three questions, because a recommendation that only
 * answers the first is an instruction rather than advice:
 *
 *  - **What to try** — the concrete move.
 *  - **Why this helps** — what it does to the score, in perception terms.
 *  - **What you don't need to change** — said explicitly, because the fear
 *    that Blink is about to ask you to rebuild your identity is the thing that
 *    stops people acting on any of it.
 *
 * ## Personalisation
 *
 * When the caller knows the profile's category and strongest signal, the
 * identity path names them. That is the difference between "reinforce your
 * identity" and "Blink reads you as Larp — your profile already communicates
 * mystery well; reinforce that rather than redesigning it." The generic
 * fallback is only used when we genuinely don't know.
 *
 * Impact figures are ranges, not promises: the score is computed from the next
 * analysis, so the honest claim is what a path typically moves, not what it
 * guarantees.
 */

import { categoryLabel } from "@/lib/categories";
import type { ProfileStats } from "@/lib/ranking";
import { scoreOutOfTen } from "@/lib/ranking";

export type ClimbPathId =
  | "identity"
  | "body-of-work"
  | "verify"
  | "streak"
  | "momentum"
  | "lane"
  | "perception";

/**
 * The three routes up.
 *
 * Naming them matters more than it looks. Without the grouping, a list of
 * seven suggestions reads as seven chores and the first one that mentions the
 * profile becomes "what Blink wants me to do". With it, the very first thing
 * a user sees is that *changing the profile is one of three options*, and the
 * only one marked optional.
 */
export type ClimbTrack = "perception" | "momentum" | "recognition";

export const TRACK_LABEL: Record<ClimbTrack, string> = {
  perception: "Improve perception",
  momentum: "Build momentum",
  recognition: "Earn recognition",
};

export interface ClimbPath {
  id: ClimbPathId;
  /** Which of the three routes this belongs to. */
  track: ClimbTrack;
  /** Small label naming the kind of move this is. */
  kind: string;
  title: string;
  /** The concrete move. */
  whatToTry: string;
  /** Why it moves the score, in terms of perception. */
  why: string;
  /** What this path explicitly does not ask for. */
  notNeeded: string;
  /** Typical range, or null when it depends entirely on the profile. */
  impact: string | null;
  /** True when this is the most useful next step for this specific user. */
  priority: boolean;
  /** Requires changing how the profile looks. Never auto-prioritised. */
  redesign: boolean;
}

/** What Blink already believes about this profile, when the caller knows it. */
export interface ClimbIdentity {
  /** Stored category id, e.g. "larp". */
  category?: string | null;
  /** The signal that scored highest, e.g. "Visual Identity". */
  strongestSignal?: string | null;
}

/**
 * Build the climb paths, most useful first.
 *
 * Priority is derived from the user's actual stats rather than fixed: someone
 * who has never re-verified needs a different nudge from someone whose streak
 * has lapsed, and someone doing everything right should be pointed at their
 * own identity rather than at housekeeping.
 */
export function getClimbPaths(
  stats: ProfileStats,
  identity: ClimbIdentity = {},
): ClimbPath[] {
  const neverReVerified = stats.verifiedCount <= 1;
  const streakBroken = stats.streak === 0;
  const losingGround = stats.momentum.direction === "down";
  const belowPeak = stats.peakScore > stats.score;

  const label = categoryLabel(identity.category ?? stats.category);
  const signal = identity.strongestSignal;

  // The identity path leads whenever nothing more urgent is wrong.
  const housekeepingNeeded = neverReVerified || streakBroken || losingGround;

  const paths: ClimbPath[] = [
    {
      id: "identity",
      track: "recognition",
      kind: "Your identity",
      title: label ? `Lean into ${label}` : "Lean into what you already are",
      whatToTry: label
        ? `Blink reads you as ${label}. Post two or three more in the treatment that already reads that way — same palette, same framing, same energy. You are not starting a new direction, you are making the existing one unmistakable.`
        : "Pick the three posts that feel most like you and make the next few look like they belong beside them. Not a new direction — a clearer version of the one you have.",
      why: signal
        ? `${signal} is already your strongest signal. Signals compound: the clearer a profile is about one thing, the higher every other axis reads, because nothing is fighting for the interpretation.`
        : "Coherence is a fifth of the score, and it is the axis that lifts the others. A profile that is unmistakably about one thing reads as deliberate rather than accumulated.",
      notNeeded: "Nothing about your profile as it stands. No new bio, no new picture, no new aesthetic.",
      impact: "Typically +0.3 to +0.7",
      priority: !housekeepingNeeded,
      redesign: false,
    },
    {
      id: "body-of-work",
      track: "momentum",
      kind: "Your work",
      title: "Deepen the body of work",
      whatToTry:
        "Add to the grid in the treatment you already use — Reels count. Depth, not variety: five more posts that look like they belong together do more than five that each try something new.",
      why: "A grid that stops early reads as abandoned rather than curated. Volume in one direction is what turns a consistent look into a body of work, which is what lifts Visual Identity and Aesthetic together.",
      notNeeded: "A new look. This path is explicitly about more of the same.",
      impact: "Typically +0.2 to +0.6",
      priority: false,
      redesign: false,
    },
    {
      id: "lane",
      track: "recognition",
      kind: "Your lane",
      title: label ? `Compete inside ${label}` : "Compete inside your category",
      whatToTry: label
        ? `The global board mixes every kind of profile. ${label} is a much smaller field, and it is the one where your signals are actually comparable. Keep your category clear and your position in it moves faster than your global rank ever will.`
        : "Categories are smaller boards where your signals are compared against profiles doing the same thing. The clearer your category reads, the more meaningful — and the more winnable — your position becomes.",
      why: "Category rank is computed from the same score against a narrower field, so the same improvement moves you further. It is also how weekly winners are chosen.",
      notNeeded: "Changing what kind of account you run to chase an easier category.",
      impact: "Moves your category rank fastest",
      priority: false,
      redesign: false,
    },
    {
      id: "verify",
      track: "momentum",
      kind: "Housekeeping",
      title: "Re-verify what you've already changed",
      whatToTry:
        "Upload a fresh screenshot after any real change. Blink re-reads the profile and the new score replaces the old one.",
      why: "Nothing moves your rank until it is verified. Changes you have already made are worth nothing to the board until a new screenshot proves them.",
      notNeeded: "Any further changes — this is about banking the ones you already made.",
      impact: "Unlocks every other path",
      priority: neverReVerified || belowPeak,
      redesign: false,
    },
    {
      id: "streak",
      track: "momentum",
      kind: "Housekeeping",
      title: "Show up weekly",
      whatToTry: "One verified analysis a week keeps your streak alive. A single upload counts.",
      why: "Streaks record sustained attention, and an active profile holds its position while dormant ones drift down as others improve.",
      notNeeded: "Posting on a schedule. This is about analysing, not performing.",
      impact: "Protects your rank",
      priority: streakBroken,
      redesign: false,
    },
    {
      id: "momentum",
      track: "momentum",
      kind: "Momentum",
      title: "Turn momentum positive",
      whatToTry:
        "Momentum is the gap between your last two verified analyses. Make one concrete change — any of the paths here — and re-upload to flip it.",
      why: "Momentum is what separates profiles on similar scores, and it is the signal weekly winners are chosen on: biggest verified improvement, not highest score.",
      notNeeded: "A big change. The smallest real one still registers.",
      impact: "Decides close positions",
      priority: losingGround,
      redesign: false,
    },
    {
      id: "perception",
      track: "perception",
      kind: "Optional",
      title: "Sharpen the first three seconds",
      whatToTry:
        "If someone landing cold can't tell what the account is about, the fastest fixes are the name field, the first line of the bio, and highlight covers in your existing palette. Take any one of them, or none.",
      why: "Clarity is a tenth of the score and the axis most often left on the table. But deliberate opacity is a valid strategy — if being hard to read is the point, this path is not for you.",
      notNeeded: "Your profile picture, your aesthetic, or how you already present yourself.",
      impact: "Typically +0.1 to +0.3",
      priority: false,
      redesign: true,
    },
  ];

  // Priority first, then everything that asks for no redesign, preserving the
  // declared order inside each group.
  return [...paths].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    if (a.redesign !== b.redesign) return a.redesign ? 1 : -1;
    return 0;
  });
}

/** One-line summary of where the user stands, shown above the paths. */
export function climbHeadline(stats: ProfileStats, rank: number | null): string {
  if (stats.verifiedCount === 0) {
    return "Analyze your own profile to get a score and a position.";
  }
  if (rank === null) {
    return `You're at ${scoreOutOfTen(stats.score)}. Turn on leaderboard visibility to take a position.`;
  }
  if (stats.momentum.direction === "up") {
    return `You're at ${scoreOutOfTen(stats.score)}, rank #${rank}, and climbing.`;
  }
  if (stats.momentum.direction === "down") {
    return `You're at ${scoreOutOfTen(stats.score)}, rank #${rank}. Momentum has turned negative.`;
  }
  return `You're at ${scoreOutOfTen(stats.score)}, rank #${rank}.`;
}
