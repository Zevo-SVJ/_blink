/**
 * Sound, written against the picture.
 *
 * ## Every cue is a frame something visibly happens on
 *
 * The positions are derived from `timeline.ts` rather than typed as numbers,
 * so lengthening a moment moves its sounds with it and the mix can never drift
 * out of sync with the cut. If a cue is not on a frame where something moves,
 * it is noise and it does not belong here.
 *
 * ## Levels are a mix, not a list
 *
 * `gain` is set relative to the bed, which sits at roughly a third of full
 * scale. The brief's order — voice over SFX over music — is why the bed is
 * quiet and why the loudest thing in the film is the interrupt: it should be
 * about four times the level of a tag landing, because that is what makes it
 * an interrupt rather than a louder tag.
 */

import { at, end } from "../timeline";

export type SfxName =
  | "impact"
  | "bass-hit"
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
  /** Seconds to trim off the front of the file, for tighter transients. */
  trim?: number;
}

const CUES_UNSORTED: Cue[] = [
  // ── Act 1 · hook ────────────────────────────────────────────────────
  // The profile is already arriving on frame zero, so its sound is too.
  { frame: at("slam"), sfx: "land", gain: 0.85 },
  // Three words, three impacts, rising.
  { frame: at("hookLine") + 1, sfx: "impact", gain: 0.6 },
  { frame: at("hookLine") + 9, sfx: "impact", gain: 0.75 },
  { frame: at("hookLine") + 17, sfx: "impact", gain: 0.95 },
  // The reticle flies in, then grips.
  { frame: at("lock"), sfx: "whoosh-short", gain: 0.5 },
  { frame: at("lock") + 7, sfx: "lock", gain: 0.9 },
  // The push into the avatar.
  { frame: at("pushToEye"), sfx: "riser", gain: 0.55 },

  // ── Act 2 · analysis ────────────────────────────────────────────────
  // The match cut. The heaviest sound so far, because it is the first real
  // reveal — the thing they were looking at turns out to be an eye.
  { frame: at("eyeOpen"), sfx: "whoosh", gain: 0.9 },
  { frame: at("eyeOpen") + 2, sfx: "impact", gain: 0.7 },
  { frame: at("scanPass"), sfx: "scan", gain: 0.5 },
  // A blip per tile the scan passes. Deliberately tiny.
  ...[0, 1, 2, 3, 4, 5].map((i) => ({
    frame: at("scanPass") + 4 + i * 4,
    sfx: "blip" as SfxName,
    gain: 0.3,
  })),
  // Signals flying out.
  ...[0, 1, 2, 3].map((i) => ({
    frame: at("signals") + 2 + i * 7,
    sfx: "pop" as SfxName,
    gain: 0.55,
  })),
  { frame: at("wipeToTags") + 2, sfx: "whoosh", gain: 0.75 },

  // ── Act 3 · perceptions ─────────────────────────────────────────────
  { frame: at("tag1") + 1, sfx: "impact", gain: 0.85 },
  { frame: at("tag2") + 1, sfx: "impact", gain: 0.88 },
  { frame: at("tag3") + 1, sfx: "impact", gain: 0.91 },
  { frame: at("tag4") + 1, sfx: "impact", gain: 0.94 },
  { frame: at("stack"), sfx: "confirm", gain: 0.45 },

  // The interrupt. A riser that stops dead, two frames of nothing, then the
  // heaviest sound in the film.
  { frame: at("redFlagHit") - 12, sfx: "riser", gain: 0.7 },
  { frame: at("redFlagHit") + 2, sfx: "bass-hit", gain: 1 },
  { frame: at("redFlagWord") + 2, sfx: "impact", gain: 0.8 },

  // ── Act 4 · score ───────────────────────────────────────────────────
  { frame: at("scoreRise"), sfx: "whoosh", gain: 0.6 },
  { frame: at("scoreRise") + 6, sfx: "riser", gain: 0.5 },
  { frame: at("scoreLand") + 1, sfx: "impact", gain: 1 },
  { frame: at("scoreLand") + 3, sfx: "confirm", gain: 0.7 },

  // ── Act 5 · the product ─────────────────────────────────────────────
  { frame: at("appOpen"), sfx: "whoosh-short", gain: 0.6 },
  { frame: at("appOpen") + 6, sfx: "click", gain: 0.5 },
  // Typing. One key per character, at the rate the field fills.
  ...Array.from({ length: 11 }, (_, i) => ({
    frame: at("typing") + 2 + i * 3,
    sfx: "key" as SfxName,
    gain: 0.4,
  })),
  { frame: at("submit") + 1, sfx: "click", gain: 0.8 },
  { frame: at("submit") + 3, sfx: "whoosh-short", gain: 0.6 },
  // The result assembling: four quick pops.
  ...[0, 1, 2, 3].map((i) => ({
    frame: at("resultFlash") + 2 + i * 5,
    sfx: "pop" as SfxName,
    gain: 0.5 + i * 0.08,
  })),
  { frame: at("ctaLine") + 1, sfx: "impact", gain: 0.75 },
  { frame: at("ctaLine") + 9, sfx: "impact", gain: 0.8 },
  { frame: at("ctaLine") + 17, sfx: "impact", gain: 0.9 },
  // The last thing heard.
  { frame: at("logo") + 2, sfx: "chime", gain: 0.8 },
  { frame: at("logo") + 22, sfx: "pop", gain: 0.6 },
];

export const CUES: Cue[] = [...CUES_UNSORTED].sort((a, b) => a.frame - b.frame);

/** Where the bed starts and stops, so it never outlives the picture. */
export const BED = { from: 0, to: end("logo") };
