/**
 * Sound, written against the picture.
 *
 * There is no voice-over, so the sound carries a share of the story rather
 * than decorating it: the weight of the print landing, the glass dragging
 * across paper, the fracture, the stamp bottoming out. Those are the beats a
 * viewer feels even with the phone half-muted.
 *
 * ## Five sounds
 *
 * The palette is deliberately tiny and used densely, which is how the
 * reference this was designed against works: 8.7 seconds carrying 23 audible
 * events, a median quarter-second apart, out of a handful of textures at
 * different pitches and levels. Variety comes from placement and gain, not
 * from a library of one-shots.
 *
 * The filenames are the ones the film ships with. Anything can be swapped by
 * dropping a file of the same name into `public/audio/` — no import to edit,
 * because `Track.tsx` resolves them through `staticFile()`.
 *
 * ## Overlapping
 *
 * Cues are allowed to ring into each other: a swoosh under a pop under the
 * tail of a sub is the point, not a mistake. Nothing here is quantised to a
 * grid — every frame number is imported from `timeline.ts`, so moving a beat
 * moves its sound and the mix cannot drift out of sync with the cut. A cue on
 * a frame where nothing visibly happens is noise and does not belong.
 */

import {
  APP_IN,
  CARD_BEATS,
  CRACK,
  CTA_BUTTON,
  DETAIL_BEATS,
  DIVE,
  DURATION,
  FRAGMENT,
  HOOK_A,
  HOOK_A_LINES,
  HOOK_B,
  HOOK_B_LINES,
  INK,
  LABEL_BEATS,
  LOUPE_ENTER,
  LOUPE_FROM,
  LOUPE_IN,
  LOUPE_TO,
  MIRROR_IN,
  MIRROR_LABEL,
  MOVES,
  PHOTO_DROP,
  PHOTO_REST,
  PRESS,
  PROJECT,
  PULL_FROM,
  PULL_TO,
  SCENES,
  SCORE_FROM,
  SCORE_LOCK,
  SCORE_TO,
  SEAM,
  SHEET_LIFT,
  SLIDE_IN,
  SLOGAN,
  SLOGAN_LINES,
  SPRINGS,
  STAMP_HIT,
  STAMP_LIFT,
  STAMP_UP,
  TRUTH,
  TYPED_KEYS,
  TYPE_FROM,
  VERDICT_LABEL,
  VERDICT_PUSH,
  mounts,
} from "../timeline";

/**
 * The kit, by filename.
 *
 * Named for the file rather than for a role, so every use of a sound is one
 * grep away and swapping the file is the whole job.
 */
export type Sfx =
  /** Heavy reveals. Sub-dominant, 20ms attack — felt rather than struck. */
  | "deep_sub_bass_pulse"
  /** A word, a label, a card. A bubble, not a click. */
  | "ui_soft_pop_bubble"
  /** Whips and transitions. Cottony rather than bright. */
  | "soft_air_swoosh"
  /** Typing. Muffled, so thirty in a row are not a machine gun. */
  | "asmr_muffled_clicks"
  /** The loupe crossing the print. Sustained, laid under a whole move. */
  | "glass_slide_friction";

export interface Cue {
  frame: number;
  sfx: Sfx;
  gain?: number;
}

/** A pop, at a level. The most-used sound in the film by a distance. */
/*
  And the pops up, for the mirror-image reason.

  They are the most frequent sound in the film by a distance and they live
  between 150 and 800 Hz — the band the mix was thinnest in. Lifting them is
  what fills it, and a bubble with a twenty-millisecond attack does not become
  aggressive when it gets louder, it becomes present.
*/
const POP_LIFT = 1.4;
const pop = (frame: number, gain = 0.34): Cue => ({
  frame,
  sfx: "ui_soft_pop_bubble",
  gain: Math.min(1, gain * POP_LIFT),
});
/*
  Sub-bass, scaled down at source.

  Measured against the reference, the finished master had its sub within a
  decibel — and everything above 120 Hz between seven and sixteen decibels
  quieter. The reference is the other way round: its body is *louder* than its
  sub. Fourteen long, loud sub pulses were simply eating the mix, so every one
  of them is taken down here rather than each call being re-tuned by hand.

  Retuned to 0.4 when the sound itself gained a resonant tail: the file is a
  second and a half of ringing low end, so it is four decibels hotter in
  average terms than it was as a bare swell even though its peak is the same.
  The number to watch is not the peak, it is the gap between the master's
  20–120 Hz band and everything above it — the reference keeps its body
  *louder* than its sub, and anything past about eight decibels the other way
  is a boomy mix.
*/
const SUB_TRIM = 0.4;
const sub = (frame: number, gain = 0.85): Cue => ({
  frame,
  sfx: "deep_sub_bass_pulse",
  gain: gain * SUB_TRIM,
});
const air = (frame: number, gain = 0.5): Cue => ({ frame, sfx: "soft_air_swoosh", gain });
const tap = (frame: number, gain = 0.3): Cue => ({ frame, sfx: "asmr_muffled_clicks", gain });
const glass = (frame: number, gain = 0.34): Cue => ({ frame, sfx: "glass_slide_friction", gain });

const LIST: Cue[] = [
  /* ── every seam ────────────────────────────────────────────────────
     The swoosh starts two frames into the overlap, while the outgoing scene
     is still on screen — the transition is audible before it is obvious. */
  ...SCENES.filter((s) => SEAM[s.id] !== "cut").flatMap((s) => [
    air(mounts(s.id), 0.52),
    pop(mounts(s.id) + 6, 0.2),
  ]),

  /* ── 1 · the print lands, and two statements hit it ─────────────────
     Water on the way down, sub on the landing, a drop as it rebounds. */
  air(PHOTO_DROP, 0.34),
  sub(PHOTO_DROP + 6, 0.9),
  pop(PHOTO_DROP + 8, 0.26),
  pop(PHOTO_REST, 0.18),
  // One drop per line, each on the frame its spring starts.
  ...HOOK_A_LINES.map((f, i) => pop(f, 0.4 + i * 0.04)),
  air(HOOK_B - 4, 0.4),
  sub(HOOK_B, 1),
  ...HOOK_B_LINES.map((f, i) => pop(f, 0.5 + i * 0.025)),

  /* ── 2 · the loupe ─────────────────────────────────────────────────
     One friction bed laid under the whole pass and re-struck at each detail,
     so the glass never stops moving between the things it finds. */
  glass(LOUPE_ENTER, 0.3),
  // The lens touching down on the print. The camera shakes here and nothing
  // was heard on it — a knock with no sound reads as a glitch, not a bump.
  sub(LOUPE_IN, 0.3),
  glass(LOUPE_IN, 0.22),
  glass(LOUPE_FROM + 6, 0.34),
  ...DETAIL_BEATS.flatMap((f) => [glass(f - 6, 0.26), pop(f, 0.4)]),
  glass(LOUPE_TO - 20, 0.24),
  pop(LOUPE_TO, 0.2),

  /* ── 3 · the print comes apart ─────────────────────────────────────
     A drop for each card on its own spring frame, and a quieter one between
     them for the tiles leaving — the print is losing pieces the whole time,
     not only when a card arrives. */
  air(FRAGMENT, 0.3),
  ...CARD_BEATS.flatMap((f, i) => [pop(f, 0.42 + i * 0.02), pop(f + 7, 0.16)]),
  sub(CARD_BEATS[3], 0.34),
  pop(CARD_BEATS[3] + 14, 0.2),
  air(CARD_BEATS[3] + 22, 0.26),

  /* ── 4 · the mirror ────────────────────────────────────────────────
     The crack is the loudest thing in the first half of the film. */
  pop(MIRROR_IN, 0.3),
  pop(MIRROR_LABEL, 0.24),
  // The glass settling under its own sheen. The mirror holds its intact
  // reflection here and it was the longest silence left in the mix.
  glass(MIRROR_IN + 18, 0.26),
  pop(MIRROR_IN + 18, 0.18),
  air(CRACK - 5, 0.44),
  sub(CRACK, 1),
  // The fracture spreading: three drops, tightening.
  pop(CRACK + 2, 0.5),
  pop(CRACK + 6, 0.38),
  pop(CRACK + 11, 0.28),
  sub(TRUTH, 0.62),
  pop(TRUTH, 0.42),
  // The four readings surfacing behind the glass.
  pop(TRUTH + 6, 0.3),
  pop(TRUTH + 11, 0.3),
  pop(TRUTH + 16, 0.3),

  /* ── 5 · the stamp ─────────────────────────────────────────────────
     The heaviest cue in the film, with a swoosh already under it. */
  air(STAMP_LIFT, 0.4),
  pop(VERDICT_LABEL, 0.24),
  pop(STAMP_LIFT + 12, 0.2),
  air(STAMP_HIT - 5, 0.5),
  sub(STAMP_HIT, 1),
  tap(STAMP_HIT, 0.5),
  air(STAMP_UP, 0.34),
  pop(STAMP_UP + 18, 0.22),
  // The push toward the mark begins — audible before it is obvious.
  air(VERDICT_PUSH, 0.3),
  pop(SHEET_LIFT, 0.2),

  /* ── 6 · into the ink, and the projector ───────────────────────────
     The dive is one long swell rather than a hit: two swooshes overlapping
     into the sub that lands on the match cut. */
  air(DIVE, 0.4),
  air(DIVE + 7, 0.5),
  sub(INK, 0.95),
  pop(PROJECT, 0.36),
  air(PROJECT + 2, 0.3),
  pop(SLIDE_IN, 0.34),
  // The counter running. Sampled, not one per tenth — thirty drops in
  // twenty-six frames is a rattle, not a machine.
  ...[0, 0.28, 0.55, 0.78, 1].map((k) =>
    pop(Math.round(SCORE_FROM + (SCORE_TO - SCORE_FROM) * k), 0.2 + k * 0.16),
  ),
  sub(SCORE_LOCK, 0.5),
  pop(SCORE_LOCK, 0.44),

  /* ── 7 · the whole desk ────────────────────────────────────────────
     The pull-back is a long airy exhale with the objects surfacing under it. */
  air(PULL_FROM, 0.44),
  air(PULL_FROM + 14, 0.3),
  pop(PULL_FROM + 22, 0.2),
  pop(PULL_TO, 0.3),
  ...LABEL_BEATS.map((f, i) => pop(f, 0.3 + i * 0.03)),

  /* ── 8 · the app, and the ask ──────────────────────────────────────
     One muffled thock per character, on the frames the caret actually
     moves. */
  pop(APP_IN, 0.4),
  pop(APP_IN + 10, 0.22),
  ...TYPED_KEYS.map((f) => tap(f, 0.26)),
  tap(PRESS, 0.5),
  sub(PRESS, 0.6),
  air(PRESS + 2, 0.4),
  ...SLOGAN_LINES.map((f, i) => pop(f, 0.46 - (i % 2) * 0.04)),
  sub(CTA_BUTTON, 0.72),
  pop(CTA_BUTTON, 0.5),
  pop(CTA_BUTTON + 6, 0.24),
];

/** In order, and inside the film. */
export const CUES: Cue[] = LIST.filter((c) => c.frame >= 0 && c.frame < DURATION).sort(
  (a, b) => a.frame - b.frame,
);

/** The music bed, under everything. */
export const BED = { from: 0, to: DURATION };
