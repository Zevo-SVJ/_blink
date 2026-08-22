/**
 * Blink — the edit.
 *
 * One file decides what happens when. Scenes read their own local frame and
 * know nothing about where they sit, so a beat can be lengthened, a hook
 * swapped, or a scene dropped by editing this list and nothing else.
 *
 * ## Where the copy is
 *
 * In `copy.ts`, because it exists twice — the landing switches to French and a
 * film that did not would be the one part of the page ignoring the reader.
 * This file holds the *shape* of the edit: how many reads there are, which
 * frame each hook line lands on, where the cuts fall. Those are identical in
 * both languages by construction, so the timing is read off one of them and
 * switching language cannot move a single frame.
 *
 * ## Why the sound cues live here too
 *
 * A cue is a frame number and a kind. Picture and sound therefore address the
 * same timeline rather than two clocks that agree at the start and drift, and
 * moving a beat moves its sound with it because the beat *is* the frame.
 */

import { ACTIVE_HOOK_ID, FILM_COPY } from "@/video/copy";
import { sec } from "@/video/frame";

export type SfxKind =
  | "whip"
  | "impact"
  | "tick"
  | "pop"
  | "scan"
  | "confirm"
  | "sub"
  | "shimmer";

export interface Cue {
  frame: number;
  kind: SfxKind;
  /** 0–1, relative to the mix. */
  gain?: number;
}

export type SceneId = "hook" | "profile" | "analysis" | "perceptions" | "turn" | "score" | "outro";

export interface Shot {
  id: SceneId;
  /** Absolute frame this scene begins on. */
  from: number;
  /** How long it holds. */
  duration: number;
}

/**
 * The hook, isolated.
 *
 * Three seconds decide whether the rest is watched, so they are the part most
 * worth trying alternatives on. Each variant is self-contained and cut to the
 * same length, so changing `ACTIVE_HOOK_ID` in `copy.ts` replaces the opening
 * without moving anything downstream — including the sound, which addresses
 * the same frames.
 */
export type { Hook, Read } from "@/video/copy";

/**
 * Timing is read off English.
 *
 * Not because English is primary — because a hook's `beats` and the number of
 * reads and signals are deliberately identical in both languages, and the edit
 * needs one of them to build the cue list from. Picking either gives the same
 * answer; picking one and saying so stops a future edit from making them
 * disagree quietly.
 */
const TIMING = FILM_COPY.en;

export const ACTIVE_HOOK = TIMING.hooks[ACTIVE_HOOK_ID];

const HOOK_LEN = sec(3);
const PROFILE_LEN = sec(2.6);
const ANALYSIS_LEN = sec(3.4);
const PERCEPTIONS_LEN = sec(5.2);
const TURN_LEN = sec(2.6);
const SCORE_LEN = sec(2.6);
const OUTRO_LEN = sec(3.2);

/** Scenes, in order. Each starts where the previous one ends. */
export const SHOTS: Shot[] = (() => {
  const lengths: Array<[SceneId, number]> = [
    ["hook", HOOK_LEN],
    ["profile", PROFILE_LEN],
    ["analysis", ANALYSIS_LEN],
    ["perceptions", PERCEPTIONS_LEN],
    ["turn", TURN_LEN],
    ["score", SCORE_LEN],
    ["outro", OUTRO_LEN],
  ];
  let at = 0;
  return lengths.map(([id, duration]) => {
    const shot = { id, from: at, duration };
    at += duration;
    return shot;
  });
})();

export const DURATION = SHOTS.reduce((n, s) => n + s.duration, 0);

/** Where a scene starts, for writing cues in absolute frames. */
export const at = (id: SceneId): number => SHOTS.find((s) => s.id === id)?.from ?? 0;

/**
 * How many reads and signals there are.
 *
 * The words themselves come from `copy.ts` at render time; the edit only needs
 * the counts, because that is what decides how many impacts fire and how long
 * the perceptions run.
 */
export const READ_COUNT = TIMING.perceptions.length;
export const SIGNAL_COUNT = TIMING.signals.length;

/**
 * Sound.
 *
 * Written against the picture rather than laid over it: a whip on every hard
 * cut, an impact on every word that lands, a tick per signal as the scan
 * passes it. Nothing is here for texture — if a cue is not on a frame where
 * something visibly happens, it is noise.
 */
const CUE_LIST: Cue[] = [
  // Hook: three lines, then the blink.
  ...ACTIVE_HOOK.beats.map((b, i) => ({
    frame: at("hook") + b,
    kind: (i === 2 ? "impact" : "sub") as SfxKind,
    gain: i === 2 ? 0.9 : 0.5,
  })),
  { frame: at("hook") + ACTIVE_HOOK.blink, kind: "whip", gain: 0.7 },

  // Profile slams in, tiles stagger.
  { frame: at("profile"), kind: "impact", gain: 0.8 },
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
    frame: at("profile") + 14 + i * 2,
    kind: "tick" as SfxKind,
    gain: 0.18,
  })),

  // Analysis: the eye opens, the reticle sweeps, signals tick past.
  { frame: at("analysis"), kind: "whip", gain: 0.6 },
  { frame: at("analysis") + 6, kind: "scan", gain: 0.55 },
  ...Array.from({ length: SIGNAL_COUNT }, (_, i) => ({
    frame: at("analysis") + 26 + i * 12,
    kind: "tick" as SfxKind,
    gain: 0.32,
  })),
  { frame: at("analysis") + ANALYSIS_LEN - 10, kind: "confirm", gain: 0.6 },

  // Perceptions: one impact per word, one whip per exit.
  ...Array.from({ length: READ_COUNT }, (_, i) => i).flatMap((i): Cue[] => {
    const base = at("perceptions") + i * 39;
    return [
      { frame: base, kind: "impact", gain: 0.95 },
      { frame: base + 30, kind: "whip", gain: 0.5 },
    ];
  }),

  // The turn: silence, then one low hit.
  { frame: at("turn") + 24, kind: "sub", gain: 0.85 },
  { frame: at("turn") + 44, kind: "impact", gain: 0.7 },

  // Score: the ring draws, the number lands.
  { frame: at("score") + 2, kind: "shimmer", gain: 0.5 },
  { frame: at("score") + 44, kind: "confirm", gain: 0.8 },

  // Outro: the eye opens onto the line, then the button.
  { frame: at("outro") + 4, kind: "whip", gain: 0.6 },
  { frame: at("outro") + 30, kind: "sub", gain: 0.6 },
  { frame: at("outro") + 58, kind: "pop", gain: 0.7 },
];

export const CUES: Cue[] = [...CUE_LIST].sort((a, b) => a.frame - b.frame);
