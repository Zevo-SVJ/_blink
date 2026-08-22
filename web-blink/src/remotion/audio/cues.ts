/**
 * Sound, written against the picture.
 *
 * Every cue sits on a frame where something visibly happens, and every frame
 * number is imported from `timeline.ts` rather than typed here — so moving a
 * beat moves its sound, and the mix cannot drift out of sync with the cut.
 *
 * Levels are a mix, not a list. The bed sits at about a third of full scale;
 * the loudest thing in the film is the interrupt, at roughly four times a tag
 * landing, because that ratio is what makes it an interrupt rather than a
 * louder tag.
 */

import {
  at,
  DURATION,
  FLAG_WORD,
  GAUGE_FROM,
  GAUGE_TO,
  GLITCH,
  HOOK_BEATS,
  KEY_EVERY,
  PRESS,
  PROFILE_IN,
  SCAN_FROM,
  SLOGAN,
  TAG_BEATS,
  TYPE_FROM,
  WHIP,
} from "../timeline";

export type SfxName =
  | "impact"
  | "bass-hit"
  | "drop"
  | "glitch"
  | "whoosh"
  | "whoosh-short"
  | "pop"
  | "click"
  | "key"
  | "blip"
  | "scan"
  | "riser"
  | "confirm"
  | "chime"
  | "land"
  | "lock";

export interface Cue {
  frame: number;
  sfx: SfxName;
  gain?: number;
}

const LIST: Cue[] = [
  /* ── 1 · hook ────────────────────────────────────────────────────
     Four sub-bass hits, one per text impact, rising. The fourth is the
     loudest because it is the one that has to be remembered. */
  ...HOOK_BEATS.map((f, i) => ({
    frame: f,
    sfx: "bass-hit" as SfxName,
    gain: 0.72 + i * 0.09,
  })),

  /* ── 2 · the illusion ────────────────────────────────────────────
     The whip carries the cut; the profile arrives on a UI pop. */
  { frame: WHIP, sfx: "whoosh", gain: 1 },
  { frame: PROFILE_IN, sfx: "pop", gain: 0.75 },
  { frame: PROFILE_IN + 2, sfx: "land", gain: 0.5 },

  /* ── 3 · the scan ────────────────────────────────────────────────
     The eye lands hard, the scanner runs under it, and a burst of small
     metallic clicks fires as the tags arrive. */
  { frame: at("scan"), sfx: "whoosh-short", gain: 0.8 },
  { frame: at("scan") + 1, sfx: "impact", gain: 0.85 },
  { frame: SCAN_FROM, sfx: "scan", gain: 0.55 },
  ...[0, 1, 2, 3, 4, 5].map((i) => ({
    frame: SCAN_FROM + 2 + i * 4,
    sfx: "blip" as SfxName,
    gain: 0.3,
  })),
  ...TAG_BEATS.flatMap((f): Cue[] => [
    { frame: f, sfx: "pop", gain: 0.8 },
    { frame: f + 1, sfx: "click", gain: 0.55 },
    { frame: f + 3, sfx: "click", gain: 0.35 },
  ]),

  /* ── 4 · the interrupt ───────────────────────────────────────────
     A riser that stops dead on the tear, the tear itself, then the
     heaviest sound in the film under the word. */
  { frame: GLITCH - 12, sfx: "riser", gain: 0.75 },
  { frame: GLITCH, sfx: "glitch", gain: 1 },
  { frame: GLITCH + 1, sfx: "drop", gain: 1 },
  { frame: FLAG_WORD, sfx: "impact", gain: 0.9 },

  /* ── 5 · the score ───────────────────────────────────────────────
     A riser across the fifteen frames the gauge takes, and a chime on the
     frame it completes. */
  { frame: at("score"), sfx: "whoosh-short", gain: 0.6 },
  { frame: GAUGE_FROM - 4, sfx: "riser", gain: 0.7 },
  { frame: GAUGE_TO, sfx: "confirm", gain: 0.95 },
  { frame: GAUGE_TO + 1, sfx: "impact", gain: 0.6 },

  /* ── 6 · the product ─────────────────────────────────────────────
     One key per typed character, then the press, then the last sound in
     the film. */
  { frame: at("cta"), sfx: "whoosh-short", gain: 0.6 },
  ...Array.from({ length: 11 }, (_, i) => ({
    frame: TYPE_FROM + i * KEY_EVERY,
    sfx: "key" as SfxName,
    gain: 0.42,
  })),
  { frame: PRESS, sfx: "click", gain: 0.9 },
  { frame: PRESS + 2, sfx: "whoosh-short", gain: 0.55 },
  { frame: SLOGAN, sfx: "impact", gain: 0.8 },
  { frame: SLOGAN + 2, sfx: "chime", gain: 0.85 },
];

export const CUES: Cue[] = [...LIST]
  // A cue outside the film would be muxed as silence at the head of the
  // track, which is worse than not existing.
  .filter((c) => c.frame >= 0 && c.frame < DURATION)
  .sort((a, b) => a.frame - b.frame);

/** The bed runs under the whole picture. */
export const BED = { from: 0, to: DURATION };
