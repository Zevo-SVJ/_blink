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
 * Events overlap. Nothing here waits for the thing before it to finish: a
 * scene mounts `OVERLAP` frames before its own slot and slides in over the
 * one it is replacing, and inside a scene the next beat starts while the last
 * one is still settling.
 *
 * `BEATS` below is every visual event in order, and a test asserts the gaps.
 * It is not decoration: it is how "dynamic" was made checkable instead of a
 * matter of opinion. The ceiling is 0.8s and the median sits near a third of
 * a second — measured off the reference the sound was designed against, which
 * carries an audible event every quarter-second.
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

/**
 * How long two scenes are on screen together.
 *
 * A scene that begins the frame after the last one ended is a cut, and a film
 * made only of cuts stops ten times. Every seam that is not deliberately a
 * cut runs for a third of a second with both scenes live: the outgoing one is
 * still moving when the incoming one is already arriving, and the first beats
 * of the new scene fire *during* the handover rather than after it.
 */
export const OVERLAP = 10;

/**
 * How each scene arrives.
 *
 * A direction is a whip: the frame is thrown that way and the new scene comes
 * in from the far side. `in` is a push through the middle. `cut` means the
 * picture itself carries the handover and a transition would fight it — the
 * dive into the ink is a match cut, and the pull-back out of the projector's
 * slide is one continuous camera move, so both of those are left alone.
 *
 * A scene entering on a cut also does not mount early: its background is
 * opaque, and mounting it over the previous scene before its own slot would
 * simply erase the end of that scene.
 */
export type Seam = "left" | "right" | "up" | "in" | "cut";

export const SEAM: Record<SceneId, Seam> = {
  hook: "cut",
  observe: "left",
  cards: "up",
  mirror: "left",
  verdict: "right",
  score: "cut",
  desk: "cut",
  cta: "in",
};

/** When scene `id` starts being drawn — early, unless it enters on a cut. */
export const lead = (id: SceneId): number => (SEAM[id] === "cut" ? 0 : OVERLAP);
export const mounts = (id: SceneId): number => at(id) - lead(id);

/* ── 1 · hook ──────────────────────────────────────────────────────── */
/** The photo falls in. */
export const PHOTO_DROP = 0;
/** It settles and stops bouncing. */
export const PHOTO_REST = 12;
/** "CE QUE TON PROFIL DIT DE TOI." strikes it, line by line. */
export const HOOK_A = 16;
export const HOOK_EVERY = 8;
/** "SANS QUE TU LE SACHES." — the interrupt, much harder. */
export const HOOK_B = 48;
export const HOOK_B_EVERY = 7;

/* ── 2 · observation ───────────────────────────────────────────────── */
/** The loupe enters from the right — during the seam, not after it. */
export const LOUPE_IN = 84;
/** It travels across the photo between these frames. */
export const LOUPE_FROM = 92;
export const LOUPE_TO = 154;
/** Micro-details found under the glass, absolute. */
export const DETAIL_BEATS = [104, 122, 140];

/* ── 3 · the cards ─────────────────────────────────────────────────── */
/** The photo starts coming apart — before the scene's own slot begins. */
export const FRAGMENT = 174;
/** Each card is pulled free. */
export const CARD_BEATS = [180, 196, 212, 228];

/* ── 4 · the mirror ────────────────────────────────────────────────── */
/** The whip that carries us to it. It *is* the seam. */
export const WHIP = at("mirror") - OVERLAP;
/** The mirror settles, showing the polished version. */
export const MIRROR_IN = 264;
/** The impact point, and the fracture spreading. */
export const CRACK = 300;
/** What was actually behind it. */
export const TRUTH = 316;

/* ── 5 · the verdict ───────────────────────────────────────────────── */
/** The stamp starts its descent, on the way in. */
export const STAMP_LIFT = 354;
/** It hits. Everything shakes. */
export const STAMP_HIT = 372;
/** The imprint is left behind as the stamp lifts away. */
export const STAMP_UP = 386;

/**
 * The camera starts closing on the mark, before the scene it belongs to ends.
 *
 * The dive into the ink used to begin from rest at the top of the next scene,
 * which left the verdict holding a still frame for a second and a half — the
 * longest dead spot in the film. Started here it is one continuous push that
 * crosses the seam, and the match cut lands mid-move instead of announcing
 * itself.
 */
export const VERDICT_PUSH = 416;
/** The sheet tips up toward the lens as the push tightens. */
export const SHEET_LIFT = 434;

/* ── 6 · the score ─────────────────────────────────────────────────── */
/** The camera starts diving into the red ink. */
export const DIVE = 452;
/** The ink fills the frame — the match cut. */
export const INK = 464;
/** The projector's lamp strikes. */
export const PROJECT = 470;
/** The score counts up mechanically and lands. */
export const SCORE_FROM = 484;
export const SCORE_TO = 510;
/** And settles, with a ring around it — so the last second is not a hold. */
export const SCORE_LOCK = 524;

/* ── 7 · the desk ──────────────────────────────────────────────────── */
/** The pull-back that reveals everything. */
export const PULL_FROM = 542;
export const PULL_TO = 584;
/** Each object is named as the camera settles, absolute. */
export const LABEL_BEATS = [596, 610, 624, 638];

/* ── 8 · the app ───────────────────────────────────────────────────── */
/**
 * The dive into the interface.
 *
 * On the first frame of the seam, not four frames into it: the panel has to
 * be arriving *while* the desk is being pushed through, or the push is a
 * transition to nothing.
 */
export const APP_IN = mounts("cta");
/** Typing, one character every two frames. */
export const TYPE_FROM = 666;
export const KEY_EVERY = 2;
/** The button pressed. */
export const PRESS = 694;
/** The slogan. */
export const SLOGAN = 704;
/** And the ask, under it. The film does not end on a logo. */
export const CTA_BUTTON = 720;

/**
 * Every visual event in the film, in order.
 *
 * The brief's rhythm target is one every 0.5–1.2 seconds. Writing them down
 * is what makes that testable rather than a claim — a gap longer than the
 * ceiling is a scene that has gone slack, and the test says which one.
 */
export const BEATS: number[] = [
  // Every seam is an event in its own right: the frame is thrown sideways and
  // a new scene is already arriving. Derived, so a seam cannot be forgotten.
  ...SCENES.filter((s) => SEAM[s.id] !== "cut").map((s) => mounts(s.id)),
  PHOTO_DROP, PHOTO_REST,
  HOOK_A, HOOK_A + HOOK_EVERY, HOOK_A + HOOK_EVERY * 2,
  HOOK_B, HOOK_B + HOOK_B_EVERY, HOOK_B + HOOK_B_EVERY * 2,
  LOUPE_IN, LOUPE_FROM, ...DETAIL_BEATS, LOUPE_TO,
  FRAGMENT, ...CARD_BEATS, CARD_BEATS[3] + 14,
  MIRROR_IN, MIRROR_IN + 18, CRACK, CRACK + 10, TRUTH, TRUTH + 16,
  STAMP_LIFT, STAMP_LIFT + 12, STAMP_HIT, STAMP_UP, STAMP_UP + 18,
  VERDICT_PUSH, SHEET_LIFT,
  DIVE, INK, PROJECT, SCORE_FROM, (SCORE_FROM + SCORE_TO) >> 1, SCORE_TO, SCORE_LOCK,
  PULL_FROM, PULL_FROM + 14, PULL_FROM + 28, PULL_TO, ...LABEL_BEATS,
  APP_IN, TYPE_FROM, TYPE_FROM + 12, PRESS, SLOGAN, SLOGAN + 8, CTA_BUTTON,
]
  .filter((f, i, all) => all.indexOf(f) === i)
  .sort((a, b) => a - b);
