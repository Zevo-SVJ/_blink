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
import { MESSAGES, type Messages } from "@/lib/messages";
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

/**
 * The three track names, in the reader's language.
 *
 * Was a constant map of English strings, which is why the French Profile
 * screen offered "Improve perception · Build momentum · Earn recognition".
 */
export function trackLabel(track: ClimbTrack, t: Messages): string {
  return t.climbPaths.tracks[track];
}

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
  t?: Messages,
): ClimbPath[] {
  /* The words come from the dictionary; which paths appear, in what order, is
     still decided here from the reader's own stats. */
  const copy = (t ?? MESSAGES.en).climbPaths;
  const fill = (text: string) =>
    text
      .replace("{label}", label ?? "")
      .replace("{signal}", signal ?? "")
      .trim();
  const neverReVerified = stats.verifiedCount <= 1;
  const streakBroken = stats.streak === 0;
  const losingGround = stats.momentum.direction === "down";
  const belowPeak = stats.peakScore > stats.score;

  const label = categoryLabel(identity.category ?? stats.category, t);
  const signal = identity.strongestSignal;

  // The identity path leads whenever nothing more urgent is wrong.
  const housekeepingNeeded = neverReVerified || streakBroken || losingGround;

  const paths: ClimbPath[] = [
    {
      id: "identity",
      track: "recognition",
      kind: copy.identity.kind,
      title: label ? fill(copy.identity.title) : copy.identity.titleUnknown,
      whatToTry: label ? fill(copy.identity.whatToTry) : copy.identity.whatToTryUnknown,
      why: signal ? fill(copy.identity.why) : copy.identity.whyUnknown,
      notNeeded: copy.identity.notNeeded,
      impact: copy.identity.impact,
      priority: !housekeepingNeeded,
      redesign: false,
    },
    {
      id: "body-of-work",
      track: "momentum",
      kind: copy.bodyOfWork.kind,
      title: copy.bodyOfWork.title,
      whatToTry: copy.bodyOfWork.whatToTry,
      why: copy.bodyOfWork.why,
      notNeeded: copy.bodyOfWork.notNeeded,
      impact: copy.bodyOfWork.impact,
      priority: false,
      redesign: false,
    },
    {
      id: "lane",
      track: "recognition",
      kind: copy.lane.kind,
      title: label ? fill(copy.lane.title) : copy.lane.titleUnknown,
      whatToTry: label ? fill(copy.lane.whatToTry) : copy.lane.whatToTryUnknown,
      why: copy.lane.why,
      notNeeded: copy.lane.notNeeded,
      impact: copy.lane.impact,
      priority: false,
      redesign: false,
    },
    {
      id: "verify",
      track: "momentum",
      kind: copy.verify.kind,
      title: copy.verify.title,
      whatToTry: copy.verify.whatToTry,
      why: copy.verify.why,
      notNeeded: copy.verify.notNeeded,
      impact: copy.verify.impact,
      priority: neverReVerified || belowPeak,
      redesign: false,
    },
    {
      id: "streak",
      track: "momentum",
      kind: copy.streak.kind,
      title: copy.streak.title,
      whatToTry: copy.streak.whatToTry,
      why: copy.streak.why,
      notNeeded: copy.streak.notNeeded,
      impact: copy.streak.impact,
      priority: streakBroken,
      redesign: false,
    },
    {
      id: "momentum",
      track: "momentum",
      kind: copy.momentum.kind,
      title: copy.momentum.title,
      whatToTry: copy.momentum.whatToTry,
      why: copy.momentum.why,
      notNeeded: copy.momentum.notNeeded,
      impact: copy.momentum.impact,
      priority: losingGround,
      redesign: false,
    },
    {
      id: "perception",
      track: "perception",
      kind: copy.perception.kind,
      title: copy.perception.title,
      whatToTry: copy.perception.whatToTry,
      why: copy.perception.why,
      notNeeded: copy.perception.notNeeded,
      impact: copy.perception.impact,
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
export function climbHeadline(
  stats: ProfileStats,
  rank: number | null,
  t?: Messages,
): string {
  const copy = (t ?? MESSAGES.en).climbPaths.standing;
  const score = scoreOutOfTen(stats.score);

  if (stats.verifiedCount === 0) return copy.noScore;
  if (rank === null) return copy.unranked.replace("{score}", score);

  const line =
    stats.momentum.direction === "up" ? copy.climbing
    : stats.momentum.direction === "down" ? copy.falling
    : copy.steady;

  return line.replace("{score}", score).replace("{rank}", String(rank));
}

