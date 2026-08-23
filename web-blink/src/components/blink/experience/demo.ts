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
export const GAZES: Gaze[] = [
  {
    id: "crush",
    emoji: "❤️",
    short: "Your crush",
    reads: ["Confident", "Interesting", "Mysterious", "Warm"],
    summary: "Reads as someone with a life already in motion.",
  },
  {
    id: "friends",
    emoji: "👥",
    short: "A friend",
    reads: ["Warm", "Consistent", "Confident", "Funny"],
    summary: "Recognisably you — the version they already know.",
  },
  {
    id: "stranger",
    emoji: "👤",
    short: "A stranger",
    reads: ["Distinctive", "Confident", "Hard to read", "Interesting"],
    summary: "Enough to be curious about, not enough to place.",
  },
  {
    id: "recruiter",
    emoji: "💼",
    short: "Someone professional",
    reads: ["Credible", "Ambitious", "Polished", "Confident"],
    summary: "Signals competence before it signals personality.",
  },
];

/** The subject. A plausible account, not a real one. */
export const SUBJECT = {
  handle: "sam.merrick",
  name: "Sam Merrick",
  bio: ["building something small", "photos when it's worth it", "London"],
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
export const PASSES = [
  { at: "avatar", label: "Portrait", found: "Direct, unposed" },
  { at: "bio", label: "Bio", found: "Understated" },
  { at: "grid", label: "Recent posts", found: "One consistent palette" },
] as const;

/** The niche the score is measured against — a real category id. */
export const NICHE = { id: "entrepreneur", label: "Entrepreneur" };

export const SCORE = 8.7;

/**
 * How many readings each gaze carries.
 *
 * Every gaze has the same count on purpose — the claim is that the same
 * profile is re-ranked, not that some gazes see more than others — and the
 * sequence needs the number to pace their arrival.
 */
export const GAZE_READS = GAZES[0].reads.length;
