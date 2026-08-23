/**
 * The edit.
 *
 * Eight scenes, twenty-five seconds, thirty frames a second. Every timing
 * lives here and every sub-beat is exported by name, so the picture and the
 * sound read the same numbers and a scene component contains no timing
 * decision of its own.
 *
 * ## The story the objects tell
 *
 * There is no voice-over, so the objects have to carry the explanation. Each
 * one is a step, and each hands over to the next physically rather than by
 * cutting away from it:
 *
 *   photo      the profile, as an object you can pick up
 *   loupe      Blink looking at it — actually looking, not indicating
 *   cards      what it pulled out
 *   mirror     the gap between how you see yourself and how you are seen
 *   stamp      the verdict, delivered with weight
 *   ink        the camera goes *into* it, and the ink becomes the next room
 *   projector  the score, as a machine reporting a measurement
 *   desk       all of it at once, so the process is legible in retrospect
 *   app        the thing you can actually do about it
 *
 * ## Rhythm
 *
 * The brief asks for a visual event every 0.5–1.2 seconds. `BEATS` below is
 * the list of them, and a test asserts the gaps. It is not decoration: it is
 * how "dynamic" was made checkable instead of a matter of opinion.
 */

export const FPS = 30;

export type SceneId =
  | "hook"
  | "observe"
  | "cards"
  | "mirror"
  | "verdict"
  | "score"
  | "desk"
  | "cta";

export interface Scene {
  id: SceneId;
  from: number;
  duration: number;
}

export const SCENES: Scene[] = [
  /** 0–3s — the photo lands, two type impacts. */
  { id: "hook", from: 0, duration: 90 },
  /** 3–6s — the loupe crosses the photo and finds things. */
  { id: "observe", from: 90, duration: 90 },
  /** 6–9s — cards and labels are pulled out of it. */
  { id: "cards", from: 180, duration: 90 },
  /** 9–12s — whip pan to the mirror, which then cracks. */
  { id: "mirror", from: 270, duration: 90 },
  /** 12–15s — the stamp. */
  { id: "verdict", from: 360, duration: 90 },
  /** 15–18s — into the ink, and the projector. */
  { id: "score", from: 450, duration: 90 },
  /** 18–22s — the whole desk, pulled back. */
  { id: "desk", from: 540, duration: 120 },
  /** 22–25s — the app, and the ask. */
  { id: "cta", from: 660, duration: 90 },
];

export const DURATION = SCENES.reduce((n, s) => Math.max(n, s.from + s.duration), 0);

const INDEX = new Map(SCENES.map((s) => [s.id, s]));

export const at = (id: SceneId): number => INDEX.get(id)?.from ?? 0;
export const len = (id: SceneId): number => INDEX.get(id)?.duration ?? 0;
export const end = (id: SceneId): number => at(id) + len(id);

/* ── 1 · hook ──────────────────────────────────────────────────────── */
/** The photo falls in. */
export const PHOTO_DROP = 0;
/** It settles and stops bouncing. */
export const PHOTO_REST = 14;
/** "CE QUE TON PROFIL DIT DE TOI." strikes it, word by word. */
export const HOOK_A = 20;
/** "SANS QUE TU LE SACHES." — the interrupt, much harder. */
export const HOOK_B = 56;

/* ── 2 · observation ───────────────────────────────────────────────── */
/** The loupe enters from the right. */
export const LOUPE_IN = 92;
/** It travels across the photo between these frames. */
export const LOUPE_FROM = 100;
export const LOUPE_TO = 158;
/** Micro-details found under the glass, absolute. */
export const DETAIL_BEATS = [112, 128, 146];

/* ── 3 · the cards ─────────────────────────────────────────────────── */
/** The photo starts coming apart. */
export const FRAGMENT = 182;
/** Each card is pulled free. */
export const CARD_BEATS = [188, 206, 224, 242];

/* ── 4 · the mirror ────────────────────────────────────────────────── */
/** The whip that carries us to it. */
export const WHIP = 266;
/** The mirror settles, showing the polished version. */
export const MIRROR_IN = 274;
/** The impact point, and the fracture spreading. */
export const CRACK = 320;
/** What was actually behind it. */
export const TRUTH = 336;

/* ── 5 · the verdict ───────────────────────────────────────────────── */
/** The stamp starts its descent. */
export const STAMP_LIFT = 362;
/** It hits. Everything shakes. */
export const STAMP_HIT = 382;
/** The imprint is left behind as the stamp lifts away. */
export const STAMP_UP = 396;

/* ── 6 · the score ─────────────────────────────────────────────────── */
/** The camera starts diving into the red ink. */
export const DIVE = 452;
/** The ink fills the frame — the match cut. */
export const INK = 470;
/** The projector's lamp strikes. */
export const PROJECT = 478;
/** The score counts up mechanically and lands. */
export const SCORE_FROM = 492;
export const SCORE_TO = 516;

/* ── 7 · the desk ──────────────────────────────────────────────────── */
/** The pull-back that reveals everything. */
export const PULL_FROM = 542;
export const PULL_TO = 596;
/** Each object is named as the camera settles, absolute. */
export const LABEL_BEATS = [600, 614, 628, 642];

/* ── 8 · the app ───────────────────────────────────────────────────── */
/** The dive into the interface. */
export const APP_IN = 662;
/** Typing, one character every two frames. */
export const TYPE_FROM = 676;
export const KEY_EVERY = 2;
/** The button pressed. */
export const PRESS = 704;
/** The slogan. */
export const SLOGAN = 714;
/** And the ask, under it. The film does not end on a logo. */
export const CTA_BUTTON = 732;

/**
 * Every visual event in the film, in order.
 *
 * The brief's rhythm target is one every 0.5–1.2 seconds. Writing them down
 * is what makes that testable rather than a claim — a gap longer than the
 * ceiling is a scene that has gone slack, and the test says which one.
 */
export const BEATS: number[] = [
  PHOTO_DROP, PHOTO_REST,
  HOOK_A, HOOK_A + 10, HOOK_A + 20,
  HOOK_B, HOOK_B + 8, HOOK_B + 16,
  LOUPE_IN, ...DETAIL_BEATS, LOUPE_TO,
  FRAGMENT, ...CARD_BEATS, CARD_BEATS[3] + 16,
  WHIP, MIRROR_IN, MIRROR_IN + 22, CRACK, TRUTH, TRUTH + 18,
  STAMP_LIFT, STAMP_HIT, STAMP_UP, STAMP_UP + 20,
  DIVE, INK, PROJECT, SCORE_FROM, SCORE_TO, SCORE_TO + 16,
  PULL_FROM, PULL_FROM + 26, PULL_TO, ...LABEL_BEATS,
  APP_IN, TYPE_FROM, PRESS, SLOGAN, CTA_BUTTON,
].sort((a, b) => a - b);
