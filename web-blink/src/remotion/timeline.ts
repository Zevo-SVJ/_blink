/**
 * The edit.
 *
 * One flat list of moments, in order, each with a length in frames. Nothing
 * here knows what a moment looks like — a moment is a name and a duration, and
 * the film mounts a component for each. That is what makes the order
 * changeable: drop a moment, reorder two, lengthen the hook, and every cue
 * after it moves with it because positions are derived, never written down.
 *
 * ## Why so many
 *
 * The previous cut had seven scenes across twenty-three seconds — a visual
 * event roughly every three seconds, which is a slideshow. This has
 * twenty-five across twenty-one, averaging under a second each. A vertical ad
 * is competing with a thumb; the cadence *is* the retention mechanism.
 *
 * That is not the same as making everything fast. The list deliberately
 * alternates: bursts of three or four short moments, then one longer beat that
 * holds still. `breath: true` marks the ones that are allowed to be slow, and
 * they exist so the fast ones read as fast.
 */

export type MomentId =
  // Act 1 — hook
  | "slam"
  | "hookLine"
  | "lock"
  | "pushToEye"
  // Act 2 — the analysis
  | "eyeOpen"
  | "scanPass"
  | "signals"
  | "readingLine"
  | "wipeToTags"
  // Act 3 — perceptions
  | "tag1"
  | "tag2"
  | "tag3"
  | "tag4"
  | "stack"
  | "redFlagHit"
  | "redFlagWord"
  // Act 4 — the score
  | "scoreRise"
  | "scoreLand"
  | "scoreLine"
  // Act 5 — the product, and the ask
  | "appOpen"
  | "typing"
  | "submit"
  | "resultFlash"
  | "ctaLine"
  | "logo";

export interface Moment {
  id: MomentId;
  /** Frames this moment owns. */
  duration: number;
  /**
   * A beat that is allowed to sit still. Marked rather than inferred so the
   * rhythm can be read off this file: three of these in a row would be the
   * bug the last cut had.
   */
  breath?: boolean;
  /**
   * Frames this moment is mounted *before* its slot, so it can animate on
   * underneath the one still leaving. Cuts are hard; overlaps are for
   * transitions that physically carry one picture into the next.
   */
  lead?: number;
}

const LIST: Moment[] = [
  // ── Act 1 · hook ──────────────────────────────────────────────────
  // A profile is on screen at frame zero. No logo, no fade up: the first
  // thing the viewer sees is the thing the ad is about.
  { id: "slam", duration: 20 },
  { id: "hookLine", duration: 28 },
  { id: "lock", duration: 22 },
  { id: "pushToEye", duration: 20 },

  // ── Act 2 · the analysis ──────────────────────────────────────────
  // The avatar became the iris on the cut, so the eye is already the same
  // object the viewer was looking at a frame ago.
  { id: "eyeOpen", duration: 22, lead: 6 },
  { id: "scanPass", duration: 30 },
  { id: "signals", duration: 34 },
  { id: "readingLine", duration: 22, breath: true },
  { id: "wipeToTags", duration: 16 },

  // ── Act 3 · perceptions ───────────────────────────────────────────
  { id: "tag1", duration: 22 },
  { id: "tag2", duration: 22 },
  { id: "tag3", duration: 22 },
  { id: "tag4", duration: 22 },
  { id: "stack", duration: 20, breath: true },
  // The interrupt. Everything that has just been established gets taken away.
  { id: "redFlagHit", duration: 26 },
  { id: "redFlagWord", duration: 28 },

  // ── Act 4 · the score ─────────────────────────────────────────────
  { id: "scoreRise", duration: 30 },
  { id: "scoreLand", duration: 26 },
  { id: "scoreLine", duration: 22, breath: true },

  // ── Act 5 · the product, and the ask ──────────────────────────────
  // Somebody who has never heard of Blink has to leave knowing what it does,
  // so the last third is the product being used rather than more claims.
  { id: "appOpen", duration: 20 },
  { id: "typing", duration: 36 },
  { id: "submit", duration: 16 },
  { id: "resultFlash", duration: 24 },
  { id: "ctaLine", duration: 32 },
  { id: "logo", duration: 48, breath: true },
];

export interface Slot extends Moment {
  /** Absolute frame this moment begins on. */
  from: number;
}

export const MOMENTS: Slot[] = (() => {
  let cursor = 0;
  return LIST.map((m) => {
    const slot = { ...m, from: cursor };
    cursor += m.duration;
    return slot;
  });
})();

export const DURATION = MOMENTS.reduce((n, m) => n + m.duration, 0);

const INDEX = new Map(MOMENTS.map((m) => [m.id, m]));

/** Absolute frame a moment starts on. */
export const at = (id: MomentId): number => INDEX.get(id)?.from ?? 0;

/** How long a moment holds. */
export const len = (id: MomentId): number => INDEX.get(id)?.duration ?? 0;

/** Absolute frame a moment ends on. */
export const end = (id: MomentId): number => at(id) + len(id);

/** Acts, for the studio's chapter markers and for reasoning about pace. */
export const ACTS = [
  { id: "hook", label: "Hook", from: at("slam"), to: end("pushToEye") },
  { id: "analysis", label: "Analysis", from: at("eyeOpen"), to: end("wipeToTags") },
  { id: "perceptions", label: "Perceptions", from: at("tag1"), to: end("redFlagWord") },
  { id: "score", label: "Score", from: at("scoreRise"), to: end("scoreLine") },
  { id: "cta", label: "CTA", from: at("appOpen"), to: end("logo") },
] as const;
