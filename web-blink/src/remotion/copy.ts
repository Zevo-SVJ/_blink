/**
 * Every word in the film, in both languages.
 *
 * ## One or two words at a time
 *
 * Nothing here is a sentence. The hook is four separate impacts, not a line
 * that happens to wrap, because the typography animates each block
 * independently and a viewer has about a third of a second per block to read
 * it. Copy written as prose and then broken up reads as prose broken up; copy
 * written as impacts reads as impacts.
 *
 * ## Same frames in both languages
 *
 * The timeline is built from durations, so French and English are cut
 * identically. Only the *setting* differs — components size type to fit, so a
 * longer word gets a smaller face rather than running off the frame.
 */

export type Lang = "fr" | "en";

export interface FilmCopy {
  /** Scene 1 — four impacts. */
  hook: string[];
  /** Scene 2 — what the profile is to its owner. */
  illusionLabel: string;
  handle: string;
  /** Scene 3 — what Blink read off it. */
  scanLabel: string;
  tags: string[];
  /** Scene 4 — the interrupt. */
  flagLabel: string;
  flagWord: string;
  /** Scene 5. */
  scoreLabel: string;
  score: string;
  scoreOutOf: string;
  /** Scene 6 — the product, then the ask. */
  typed: string;
  button: string;
  /**
   * The closing line, already broken into the blocks it animates as.
   *
   * Set as one sentence it fitted to about a fifth of the frame height and
   * read as a caption — the quietest thing in the film in the position that
   * should be the loudest. Three impacts at display size is the same words
   * doing the job they were written for.
   */
  slogan: string[];
  brand: string;
}

const FR: FilmCopy = {
  /*
    The claim is about the viewer, not the product, and they cannot check it —
    which is the entire reason they keep watching. "Vraiment" is the load-
    bearing word: it concedes that they already have a theory and says it is
    wrong.
  */
  hook: ["POV :", "CE QUE LES GENS", "PENSENT VRAIMENT", "DE TON PROFIL"],
  illusionLabel: "Ce que tu crois montrer",
  handle: "@ton.profil",
  scanLabel: "Ce que Blink lit",
  tags: ["ARROGANT", "CRÉATIF", "MYSTÉRIEUX"],
  flagLabel: "TON PLUS GROS RED FLAG :",
  flagWord: "DISTANT",
  scoreLabel: "BLINK SCORE",
  score: "8.6",
  scoreOutOf: "/10",
  typed: "@ton.pseudo",
  button: "Analyser",
  slogan: ["VOIS-TOI", "COMME LES AUTRES", "TE VOIENT"],
  brand: "Blink",
};

const EN: FilmCopy = {
  hook: ["POV:", "WHAT PEOPLE", "ACTUALLY THINK", "OF YOUR PROFILE"],
  illusionLabel: "What you think you're showing",
  handle: "@your.profile",
  scanLabel: "What Blink reads",
  tags: ["ARROGANT", "CREATIVE", "MYSTERIOUS"],
  flagLabel: "YOUR BIGGEST RED FLAG:",
  flagWord: "DISTANT",
  scoreLabel: "BLINK SCORE",
  score: "8.6",
  scoreOutOf: "/10",
  typed: "@your.handle",
  button: "Analyse",
  slogan: ["SEE YOURSELF", "THE WAY OTHERS", "SEE YOU"],
  brand: "Blink",
};

export const COPY: Record<Lang, FilmCopy> = { fr: FR, en: EN };
