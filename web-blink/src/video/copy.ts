/**
 * Blink — the film's words, in both languages.
 *
 * The landing detects French and switches the whole page; a film embedded in
 * it that only speaks English would be the one part of the page that ignores
 * the reader. So every string in the picture lives here, and the scene that
 * shows it asks for it rather than holding a literal.
 *
 * Two rules the copy has to keep:
 *
 *  - **It is the product's own.** "Your biggest red flag", "How a stranger
 *    sees you" and the score's framing are reads Blink actually returns. A
 *    punchier invented line here would be a promise the product does not keep.
 *  - **French is written, not translated.** "Ton plus gros red flag" is what
 *    the app says in French; rendering it as "drapeau rouge" would be
 *    faithful to the English and wrong about the language.
 *
 * The words are also what the timing is built around — a longer word gets a
 * smaller size, not a longer beat — so switching language changes the picture
 * and never the edit. The film is the same length in both.
 */

import type { Lang } from "@/lib/i18n";

export interface Read {
  lens: string;
  word: string;
}

export interface Hook {
  id: string;
  /** Up to three beats. Each is one idea, large. */
  lines: string[];
  /** Local frames at which each line lands. */
  beats: number[];
  /** Frame the eye blinks on — the brand's own gesture, as punctuation. */
  blink: number;
}

export interface FilmCopy {
  hooks: Record<string, Hook>;
  /** Scene 2 — what the profile is to its owner. */
  yours: string;
  /** Scene 3 — what the same profile is to the model. */
  reads: string;
  /** Scene 3 — the parts the scan calls out. Short, secondary. */
  signals: string[];
  /** Scene 4 — the four flattering reads. */
  perceptions: Read[];
  /** Scene 5 — the setup, then the read nobody asks for. */
  turnSetup: string;
  turn: Read;
  /** Scene 6. */
  scoreLabel: string;
  scoreOutOf: string;
  scoreKicker: string;
  /** Scene 7. */
  tagline: string;
  cta: string;
}

const EN: FilmCopy = {
  hooks: {
    /*
      The one in use. It works because it is not a claim about the product —
      it is a claim about the viewer, and it is true: you have looked at your
      own profile hundreds of times, and every stranger who ever judged it
      looked once. The gap between those two facts is the entire product.
    */
    once: {
      id: "once",
      lines: ["You've looked at your profile", "a thousand times.", "They looked once."],
      beats: [4, 22, 50],
      blink: 58,
    },
    /* Alternative: shorter, colder, leads with the stranger. */
    seconds: {
      id: "seconds",
      lines: ["Someone decides who you are", "in three seconds.", "This is what they see."],
      beats: [4, 24, 52],
      blink: 60,
    },
    /* Alternative: the direct question. */
    know: {
      id: "know",
      lines: ["You think you know", "what your profile says.", "You don't."],
      beats: [4, 22, 50],
      blink: 56,
    },
  },
  yours: "This is what you see.",
  reads: "This is what Blink reads.",
  signals: ["Bio", "Grid", "Colour", "Consistency", "First 3 posts"],
  perceptions: [
    { lens: "How a stranger sees you", word: "Polished" },
    { lens: "How your crush sees you", word: "Mysterious" },
    { lens: "How a recruiter sees you", word: "Credible" },
    { lens: "Your biggest green flag", word: "Secure" },
  ],
  turnSetup: "And the one you didn’t ask for.",
  turn: { lens: "Your biggest red flag", word: "Distant" },
  scoreLabel: "Blink Score",
  scoreOutOf: "/ 10",
  scoreKicker: "Not followers. How your profile reads.",
  tagline: "See yourself the way others see you.",
  cta: "See my first impression",
};

const FR: FilmCopy = {
  hooks: {
    once: {
      id: "once",
      lines: ["Tu as regardé ton profil", "mille fois.", "Eux, une seule."],
      beats: [4, 22, 50],
      blink: 58,
    },
    seconds: {
      id: "seconds",
      lines: ["On décide qui tu es", "en trois secondes.", "Voilà ce qu’ils voient."],
      beats: [4, 24, 52],
      blink: 60,
    },
    know: {
      id: "know",
      lines: ["Tu crois savoir", "ce que dit ton profil.", "Pas du tout."],
      beats: [4, 22, 50],
      blink: 56,
    },
  },
  yours: "Voilà ce que tu vois.",
  reads: "Voilà ce que Blink lit.",
  signals: ["Bio", "Grille", "Couleurs", "Cohérence", "3 premiers posts"],
  perceptions: [
    { lens: "Comment un inconnu te voit", word: "Soigné" },
    { lens: "Comment ton crush te voit", word: "Mystérieux" },
    { lens: "Comment un recruteur te voit", word: "Crédible" },
    { lens: "Ton plus gros green flag", word: "Sûr" },
  ],
  turnSetup: "Et celui que tu n’as pas demandé.",
  turn: { lens: "Ton plus gros red flag", word: "Distant" },
  scoreLabel: "Blink Score",
  scoreOutOf: "/ 10",
  scoreKicker: "Pas les abonnés. La lecture de ton profil.",
  tagline: "Vois-toi comme les autres te voient.",
  cta: "Voir ma première impression",
};

export const FILM_COPY: Record<Lang, FilmCopy> = { en: EN, fr: FR };

/**
 * Which hook is live.
 *
 * The first two seconds are the only part of an ad most people watch, so they
 * are the part worth testing. Every hook is the same length and blinks on its
 * own frame, and nothing downstream refers to a hook's lines — so swapping
 * this constant replaces the opening without touching the edit, the sound or
 * any other scene.
 */
export const ACTIVE_HOOK_ID = "once";
