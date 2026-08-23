/**
 * The profile the landing page analyses.
 *
 * A demonstration needs a subject, and the subject has to be credible or the
 * whole thing reads as a mock-up of a product rather than the product. So this
 * is shaped by the real types — `Perspective["id"]`, the real category ids from
 * `categories.ts` — and it is the only invented data on the page. Everything
 * downstream renders it through the same components a real analysis would use.
 *
 * It is explicitly a sample, and the section says so on screen. Nothing here is
 * presented as a real person, a real account, or a real result.
 */

import type { Perspective } from "@/lib/analysis";
import type { Messages } from "@/lib/messages";

export interface Gaze {
  id: Perspective["id"];
  emoji: string;
  /** The label on the selector. */
  short: string;
  /** What this gaze walks away with, strongest first. */
  reads: string[];
  /** One line, in the product's voice. */
  summary: string;
}

/**
 * The four gazes, in the order the selector shows them.
 *
 * They deliberately share readings. "Confident" appearing under three gazes at
 * three different ranks is the entire point of the feature — the profile has
 * not changed, so what it says has not changed; what changes is which parts of
 * it matter to who is looking. If every gaze had four unique words the
 * transition would be a replacement, and a replacement says nothing.
 */
export const GAZE_IDS = ["crush", "friends", "stranger", "recruiter"] as const;

const GAZE_EMOJI: Record<(typeof GAZE_IDS)[number], string> = {
  crush: "❤️",
  friends: "👥",
  stranger: "👤",
  recruiter: "💼",
};

/**
 * The four gazes, in the reader's language.
 *
 * The ids and the emoji are structure and live here — the ids are checked
 * against `Perspective["id"]`, so the demonstration cannot name a gaze the
 * product does not have. The words come from the dictionary: as literals in
 * this file the French landing page ran its whole signature feature in
 * English, offering "Your crush" and reading back "Confident".
 */
export function gazes(t: Messages): Gaze[] {
  return GAZE_IDS.map((id) => {
    const copy = t.experience.demo.gazes[id];
    return {
      id,
      emoji: GAZE_EMOJI[id],
      short: copy.short,
      reads: [...copy.reads],
      summary: copy.summary,
    };
  });
}

/**
 * The subject. A plausible account, not a real one.
 *
 * The handle, the name and the numbers are the same in every language — they
 * are a username and three counts. The bio is prose, so it is translated.
 */
export const SUBJECT = {
  handle: "sam.merrick",
  name: "Sam Merrick",
  posts: 148,
  followers: "4,102",
  following: 386,
};

/**
 * What the analysis pass finds, in the order it finds it.
 *
 * Three stops, each one a real region of the profile. The point of naming the
 * region is that the reader can see Blink is reading *something specific*
 * rather than running a spinner over the whole card.
 */
export const PASS_AT = ["avatar", "bio", "grid"] as const;

export interface Pass {
  at: (typeof PASS_AT)[number];
  label: string;
  found: string;
}

export function passes(t: Messages): Pass[] {
  return PASS_AT.map((at) => ({ at, ...t.experience.demo.passes[at] }));
}

/** The niche the score is measured against — a real category id. */
export const NICHE_ID = "entrepreneur";

export const SCORE = 8.7;

/**
 * How many readings each gaze carries.
 *
 * Every gaze has the same count on purpose — the claim is that the same
 * profile is re-ranked, not that some gazes see more than others — and the
 * sequence needs the number to pace their arrival. Four in both languages.
 */
export const GAZE_READS = 4;
