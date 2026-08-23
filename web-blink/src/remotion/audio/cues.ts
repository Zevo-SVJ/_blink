/**
 * Sound, written against the picture.
 *
 * There is no voice-over, so the sound is carrying a share of the story
 * rather than decorating it: the weight of the print landing, the glass
 * dragging across paper, the fracture, the stamp bottoming out. Those are the
 * beats a viewer feels even with the phone half-muted.
 *
 * Every frame number is imported from `timeline.ts` rather than typed here,
 * so moving a beat moves its sound and the mix cannot drift out of sync with
 * the cut. If a cue is not on a frame where something visibly happens, it is
 * noise and it does not belong.
 */

import {
  APP_IN,
  CARD_BEATS,
  CRACK,
  DETAIL_BEATS,
  DIVE,
  DURATION,
  FRAGMENT,
  HOOK_A,
  HOOK_B,
  INK,
  KEY_EVERY,
  LABEL_BEATS,
  LOUPE_FROM,
  LOUPE_IN,
  MIRROR_IN,
  PHOTO_DROP,
  PRESS,
  PROJECT,
  PULL_FROM,
  SCORE_FROM,
  SCORE_TO,
  SLOGAN,
  CTA_BUTTON,
  STAMP_HIT,
  STAMP_LIFT,
  STAMP_UP,
  TRUTH,
  TYPE_FROM,
  WHIP,
  at,
} from "../timeline";

export type SfxName =
  | "impact" | "bass-hit" | "drop" | "glitch"
  | "whoosh" | "whoosh-short" | "pop" | "click" | "key" | "blip"
  | "scan" | "riser" | "confirm" | "chime" | "land" | "lock"
  | "paper" | "card" | "glass" | "crack" | "stamp" | "projector";

export interface Cue {
  frame: number;
  sfx: SfxName;
  gain?: number;
}

const LIST: Cue[] = [
  /* ── 1 · the print lands ─────────────────────────────────────────── */
  // Paper and weight together: the slap of the print and the thud of the
  // desk taking it. Neither alone sounds like something heavy landing.
  { frame: PHOTO_DROP + 7, sfx: "paper", gain: 1 },
  { frame: PHOTO_DROP + 7, sfx: "bass-hit", gain: 0.72 },
  // The rebound, a third of the level.
  { frame: PHOTO_DROP + 13, sfx: "paper", gain: 0.3 },

  { frame: HOOK_A, sfx: "impact", gain: 0.68 },
  { frame: HOOK_A + 10, sfx: "impact", gain: 0.78 },
  { frame: HOOK_A + 20, sfx: "impact", gain: 0.88 },
  // The interrupt: a riser that stops dead into the heaviest hit so far.
  { frame: HOOK_B - 10, sfx: "riser", gain: 0.6 },
  { frame: HOOK_B, sfx: "bass-hit", gain: 1 },
  { frame: HOOK_B, sfx: "impact", gain: 0.82 },
  { frame: HOOK_B + 8, sfx: "impact", gain: 0.88 },
  { frame: HOOK_B + 16, sfx: "impact", gain: 0.95 },

  /* ── 2 · the loupe ───────────────────────────────────────────────── */
  { frame: LOUPE_IN, sfx: "whoosh-short", gain: 0.6 },
  // Glass dragging, under the whole pass.
  { frame: LOUPE_FROM, sfx: "glass", gain: 0.7 },
  { frame: LOUPE_FROM + 26, sfx: "glass", gain: 0.5 },
  // Each thing it finds.
  ...DETAIL_BEATS.flatMap((f): Cue[] => [
    { frame: f, sfx: "blip", gain: 0.5 },
    { frame: f + 1, sfx: "pop", gain: 0.42 },
  ]),

  /* ── 3 · the cards ───────────────────────────────────────────────── */
  { frame: FRAGMENT, sfx: "paper", gain: 0.5 },
  ...CARD_BEATS.flatMap((f, i): Cue[] => [
    { frame: f, sfx: "card", gain: 0.75 + i * 0.05 },
    { frame: f + 2, sfx: "click", gain: 0.34 },
  ]),

  /* ── 4 · the mirror ──────────────────────────────────────────────── */
  { frame: WHIP, sfx: "whoosh", gain: 1 },
  { frame: MIRROR_IN, sfx: "land", gain: 0.6 },
  // Tension into the fracture, then the fracture, then what it uncovers.
  { frame: CRACK - 14, sfx: "riser", gain: 0.68 },
  { frame: CRACK, sfx: "crack", gain: 1 },
  { frame: CRACK + 1, sfx: "drop", gain: 0.72 },
  { frame: TRUTH, sfx: "impact", gain: 0.8 },

  /* ── 5 · the stamp ───────────────────────────────────────────────── */
  { frame: STAMP_LIFT, sfx: "whoosh-short", gain: 0.45 },
  // The single heaviest sound in the film.
  { frame: STAMP_HIT, sfx: "stamp", gain: 1 },
  { frame: STAMP_HIT, sfx: "bass-hit", gain: 0.85 },
  { frame: STAMP_UP, sfx: "paper", gain: 0.4 },

  /* ── 6 · into the ink ────────────────────────────────────────────── */
  { frame: DIVE, sfx: "riser", gain: 0.8 },
  { frame: INK, sfx: "whoosh", gain: 0.9 },
  // The machine.
  { frame: PROJECT, sfx: "projector", gain: 0.9 },
  { frame: SCORE_FROM, sfx: "scan", gain: 0.35 },
  { frame: SCORE_TO, sfx: "confirm", gain: 0.95 },
  { frame: SCORE_TO + 1, sfx: "impact", gain: 0.55 },

  /* ── 7 · the desk ────────────────────────────────────────────────── */
  { frame: PULL_FROM, sfx: "whoosh", gain: 0.55 },
  ...LABEL_BEATS.map((f) => ({ frame: f, sfx: "pop" as SfxName, gain: 0.5 })),

  /* ── 8 · the app ─────────────────────────────────────────────────── */
  { frame: APP_IN, sfx: "whoosh-short", gain: 0.62 },
  ...Array.from({ length: 11 }, (_, i) => ({
    frame: TYPE_FROM + i * KEY_EVERY,
    sfx: "key" as SfxName,
    gain: 0.42,
  })),
  { frame: PRESS, sfx: "click", gain: 0.9 },
  { frame: PRESS + 2, sfx: "whoosh-short", gain: 0.5 },
  { frame: SLOGAN, sfx: "impact", gain: 0.78 },
  { frame: SLOGAN + 4, sfx: "impact", gain: 0.7 },
  { frame: SLOGAN + 8, sfx: "impact", gain: 0.66 },
  { frame: CTA_BUTTON, sfx: "pop", gain: 0.7 },
  { frame: CTA_BUTTON + 1, sfx: "chime", gain: 0.9 },
];

export const CUES: Cue[] = [...LIST]
  // A cue outside the film would be muxed as silence at the head of the
  // track, which is worse than not existing.
  .filter((c) => c.frame >= 0 && c.frame < DURATION)
  .sort((a, b) => a.frame - b.frame);

/** The bed runs under the whole picture. */
export const BED = { from: 0, to: DURATION };
