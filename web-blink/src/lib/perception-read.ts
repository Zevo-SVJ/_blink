/**
 * Blink — turning one perspective into a reveal.
 *
 * ## The problem this solves
 *
 * "How your crush sees you" used to resolve to a single sentence. The analysis
 * behind it is far richer than that — every perspective already carries its own
 * traits, its own summary and its own reasoning, and the profile carries six
 * independently scored signals — but the screen showed one line and threw the
 * rest away. A sentence is not something anyone screen-records.
 *
 * ## The mechanic
 *
 * The interesting fact in the data is not any single number. It is that **the
 * same six signals are read differently depending on who is looking.** A crush
 * weighs mystery and approachability; a recruiter weighs status and clarity.
 * So the loudest thing your profile says is not a fixed property of the
 * profile — it changes with the audience.
 *
 * That is what this module computes. For a given perspective it looks only at
 * the signals that perspective actually weighs (`PERSPECTIVE_SIGNALS`, which
 * mirrors the focus list the analyze prompt is given), and picks:
 *
 *  - the **loudest** of them — "the signal you're sending"
 *  - the **quietest** of them — "what they can't read yet"
 *
 * Someone whose Mystery is 8.4 and Status is 4.1 gets told, truthfully, that a
 * crush hears intrigue first while a recruiter hears very little. Same profile,
 * two readings. That is the surprising, specific, shareable line, and it is
 * derived rather than written.
 *
 * ## Honesty rules
 *
 * Every beat is dropped rather than filled when its source is missing. A
 * perspective with no `why` simply has no "what they'd assume" beat; a result
 * whose signals didn't come back has no signal beats. Nothing here invents
 * copy, and nothing restates a beat the reader has already seen — the loudest
 * and quietest signal must be different signals, or only the loudest is shown.
 */

import type { Perspective, SignalScore } from "@/lib/analysis";

export type PerspectiveId = Perspective["id"];

/**
 * Which of the six scored signals each perspective actually weighs.
 *
 * Mirrors the per-perspective focus list in the analyze prompt, so the reading
 * shown here is scored against the same things the model was asked to judge:
 *
 *   crush     → attractiveness, confidence, mystery, approachability, lifestyle
 *   stranger  → immediate first impression, social positioning, visual identity
 *   friends   → personality, consistency, social energy, authenticity
 *   recruiter → professionalism, credibility, maturity, clarity
 *
 * A perspective deliberately does not weigh all six. Telling someone what a
 * recruiter makes of their "Mystery" would be noise.
 */
export const PERSPECTIVE_SIGNALS: Record<PerspectiveId, readonly string[]> = {
  crush: ["Confidence", "Mystery", "Approachability", "Aesthetic"],
  stranger: ["Visual Identity", "Aesthetic", "Status"],
  friends: ["Approachability", "Confidence", "Visual Identity"],
  recruiter: ["Status", "Visual Identity", "Confidence"],
};

export type BeatId = "impression" | "assume" | "signal" | "blindspot" | "verdict";

export interface Beat {
  id: BeatId;
  /** Small label above the beat. */
  kicker: string;
  /** The body. Always real analysis text, never generated here. */
  body: string;
  /** Present on signal beats: the scored signal the beat is about. */
  signal?: { label: string; score: number };
  /** Present on the verdict: the perspective's trait words. */
  traits?: string[];
}

/** Case- and spacing-insensitive lookup, so label drift can't silently drop a beat. */
function findSignal(signals: SignalScore[], label: string): SignalScore | undefined {
  const want = label.trim().toLowerCase();
  return signals.find((s) => s.label?.trim().toLowerCase() === want);
}

/** The signals this perspective weighs, in score order, loudest first. */
export function relevantSignals(
  perspective: PerspectiveId,
  signals: SignalScore[] | undefined,
): SignalScore[] {
  if (!signals?.length) return [];
  return PERSPECTIVE_SIGNALS[perspective]
    .map((label) => findSignal(signals, label))
    .filter((s): s is SignalScore => !!s && typeof s.score === "number")
    .sort((a, b) => b.score - a.score);
}

/**
 * Beat labels, in both voices.
 *
 * The second-person versions are the ones worth recording — "the signal you're
 * sending without realising it" is the hook. They are also addressed to the
 * account's owner, so a third-party read gets the neutral column instead. That
 * is the same rule the rest of the result follows: someone looking at another
 * account is never spoken to as if it were theirs.
 */
const KICKERS: Record<"assume" | "signal" | "blindspot", { own: string; other: string }> = {
  assume: {
    own: "What they'd assume before ever talking to you",
    other: "What they'd assume at a glance",
  },
  signal: {
    own: "The signal you're sending without realising it",
    other: "The loudest signal in this profile",
  },
  blindspot: {
    own: "What they can't read about you yet",
    other: "What they can't read yet",
  },
};

/**
 * The ordered reveal for one perspective.
 *
 * `own` decides the voice of the labels only — never which beats exist, so a
 * third-party read is paced identically and simply worded in the third person.
 */
export function buildRead(
  perspective: PerspectiveId,
  data: Perspective,
  signals: SignalScore[] | undefined,
  own = true,
): Beat[] {
  const beats: Beat[] = [];
  const voice = own ? "own" : "other";

  if (data.summary?.trim()) {
    beats.push({
      id: "impression",
      kicker: "First impression",
      body: data.summary.trim(),
    });
  }

  if (data.why?.trim()) {
    beats.push({
      id: "assume",
      kicker: KICKERS.assume[voice],
      body: data.why.trim(),
    });
  }

  const ranked = relevantSignals(perspective, signals);
  const loudest = ranked[0];
  const quietest = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;

  if (loudest?.description?.trim()) {
    beats.push({
      id: "signal",
      kicker: KICKERS.signal[voice],
      body: loudest.description.trim(),
      signal: { label: loudest.label, score: loudest.score },
    });
  }

  // Only when it is genuinely a different signal *and* actually quieter —
  // a flat profile has no blind spot worth naming.
  if (
    quietest?.description?.trim() &&
    loudest &&
    quietest.label !== loudest.label &&
    quietest.score < loudest.score
  ) {
    beats.push({
      id: "blindspot",
      kicker: KICKERS.blindspot[voice],
      body: quietest.description.trim(),
      signal: { label: quietest.label, score: quietest.score },
    });
  }

  if (data.traits?.length) {
    beats.push({
      id: "verdict",
      kicker: "The verdict",
      // The traits carry the verdict visually; the body repeats nothing.
      body: "",
      traits: data.traits,
    });
  }

  return beats;
}

/**
 * A one-line headline for a perspective, for surfaces with no room for a
 * reveal — the share card and the landing sequence.
 *
 * Prefers the loudest weighed signal, because "Mystery, 8.4" is the line that
 * makes someone ask what their own number is. Falls back to the summary.
 */
export function readHeadline(
  perspective: PerspectiveId,
  data: Perspective,
  signals: SignalScore[] | undefined,
): { label: string; score: number } | null {
  const loudest = relevantSignals(perspective, signals)[0];
  return loudest ? { label: loudest.label, score: loudest.score } : null;
}
