/**
 * The edit.
 *
 * Six scenes, twelve seconds, thirty frames a second. Every number here comes
 * from the brief rather than from taste — the beats are specified to the frame
 * and this file is where they live, so a scene component never contains a
 * timing decision.
 *
 * ## Why twelve seconds
 *
 * Half the length of the cut it replaces. A vertical ad is not a short film;
 * it is a thing a thumb decides about. Compressing the same story into twelve
 * seconds forces every beat to justify itself, and there is nowhere left for a
 * scene to sit and breathe on its own — which is exactly the note the previous
 * version failed.
 *
 * ## Reading the table
 *
 * `from` and `duration` are absolute frames. Sub-beats inside a scene are
 * exported as named constants rather than written inline, so the four hook
 * impacts land on 0/15/30/45 in the timeline *and* in the cue sheet, and
 * moving one moves both.
 */

export const FPS = 30;

export type SceneId = "hook" | "illusion" | "scan" | "flag" | "score" | "cta";

export interface Scene {
  id: SceneId;
  from: number;
  duration: number;
}

/** 0.0s – 2.0s — four text impacts, nothing else. */
const HOOK = { from: 0, duration: 60 };
/** 2.0s – 3.5s — whip pan onto the profile. */
const ILLUSION = { from: 60, duration: 45 };
/** 3.5s – 6.0s — the eye, the scan, the tags. */
const SCAN = { from: 105, duration: 75 };
/** 6.0s – 8.0s — the interrupt. */
const FLAG = { from: 180, duration: 60 };
/** 8.0s – 10.0s — the score. */
const SCORE = { from: 240, duration: 60 };
/** 10.0s – 12.0s — the product, and the ask. */
const CTA = { from: 300, duration: 60 };

export const SCENES: Scene[] = [
  { id: "hook", ...HOOK },
  { id: "illusion", ...ILLUSION },
  { id: "scan", ...SCAN },
  { id: "flag", ...FLAG },
  { id: "score", ...SCORE },
  { id: "cta", ...CTA },
];

export const DURATION = SCENES.reduce((n, s) => Math.max(n, s.from + s.duration), 0);

const INDEX = new Map(SCENES.map((s) => [s.id, s]));

export const at = (id: SceneId): number => INDEX.get(id)?.from ?? 0;
export const len = (id: SceneId): number => INDEX.get(id)?.duration ?? 0;
export const end = (id: SceneId): number => at(id) + len(id);

/* ── beats inside the scenes ─────────────────────────────────────────
   Named because both the picture and the sound refer to them. A beat that
   only existed as a literal inside a component would drift the moment the
   scene moved. */

/** The four hook impacts, absolute. */
export const HOOK_BEATS = [0, 15, 30, 45];

/** The whip that carries the hook into the profile. */
export const WHIP = at("illusion") - 4;
/** The profile springing up from below. */
export const PROFILE_IN = at("illusion") + 4;

/** The eye slamming over the profile. */
export const EYE_IN = at("scan");
/** The laser starting and finishing its pass down the grid. */
export const SCAN_FROM = at("scan") + 8;
export const SCAN_TO = at("scan") + 32;
/** The three tags, absolute — 120, 130, 140 in the brief. */
export const TAG_BEATS = [120, 130, 140];

/**
 * The glitch that tears into the red flag.
 *
 * Three frames *before* the cut, not on it. On the cut itself there is
 * nothing on screen to tear — the outgoing scene has ended and the incoming
 * one has not drawn a thing yet — so the effect fired over flat navy and the
 * frame came back empty. Starting early means it tears the end of the scan
 * and carries through into the flag, which is what a torn signal across an
 * edit actually looks like.
 */
export const GLITCH = at("flag") - 3;
/** The word landing. */
export const FLAG_WORD = at("flag") + 10;

/** The gauge fills in fifteen frames, not slowly. */
export const GAUGE_FROM = at("score") + 6;
export const GAUGE_TO = GAUGE_FROM + 15;

/** Typing, one character every two frames. */
export const TYPE_FROM = at("cta") + 6;
export const KEY_EVERY = 2;
/** The button being pressed, and the slogan under it. */
export const PRESS = at("cta") + 34;
export const SLOGAN = at("cta") + 40;
