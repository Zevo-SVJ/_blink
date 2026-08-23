/**
 * Every word in the film, in both languages.
 *
 * There is no voice-over, so the copy is doing less work than usual and has
 * to be sharper for it: the objects carry the explanation and the type only
 * names things. Nearly all of it is one to three words, because each block
 * gets about a third of a second.
 *
 * The timeline is built from durations, so French and English are cut
 * identically — only the *setting* differs, and the components size type to
 * fit rather than clipping the longer language.
 */

export type Lang = "fr" | "en";

export interface FilmCopy {
  /** Scene 1 — the claim, then the interrupt. */
  hookA: string[];
  hookB: string[];
  /** The profile on the photo print. */
  handle: string;
  /** Scene 2 — what the loupe finds, in the order it finds it. */
  details: string[];
  /** Scene 3 — what is pulled out of the photo. */
  cards: string[];
  /** Scene 4 — the two sides of the mirror. */
  mirrorYou: string;
  mirrorThem: string;
  /** Scene 5 — the verdict. */
  verdictLabel: string;
  verdict: string;
  /** Scene 6. */
  scoreLabel: string;
  score: string;
  scoreOutOf: string;
  /** Scene 7 — the process, named as the camera pulls back. */
  steps: string[];
  /** Scene 8. */
  appTitle: string;
  typed: string;
  button: string;
  slogan: string[];
  /** The ask on the last frame. The action the product actually offers. */
  cta: string;
  brand: string;
}

const FR: FilmCopy = {
  /*
    A claim about the viewer that they cannot check, and then the twist that
    makes it uncomfortable. "Sans que tu le saches" is the whole hook: the
    first line is a question anyone could shrug off, the second says it has
    already happened.
  */
  hookA: ["CE QUE TON", "PROFIL DIT", "DE TOI."],
  hookB: ["SANS QUE", "TU LE", "SACHES."],
  handle: "@ton.profil",
  details: ["LA BIO", "LES 3 PREMIERS", "LES COULEURS"],
  cards: ["CRÉATIF", "CRÉDIBLE", "SOIGNÉ", "MYSTÉRIEUX"],
  mirrorYou: "CE QUE TU VOIS",
  mirrorThem: "CE QU’ILS VOIENT",
  verdictLabel: "VERDICT",
  verdict: "DISTANT",
  scoreLabel: "BLINK SCORE",
  score: "8.6",
  scoreOutOf: "/10",
  steps: ["OBSERVE", "ANALYSE", "DÉDUIT", "TE LE DIT"],
  appTitle: "Analyser un profil",
  typed: "@ton.pseudo",
  button: "Analyser",
  slogan: ["VOIS-TOI", "COMME LES AUTRES", "TE VOIENT"],
  cta: "ANALYSE TON PROFIL",
  brand: "Blink",
};

const EN: FilmCopy = {
  hookA: ["WHAT YOUR", "PROFILE SAYS", "ABOUT YOU."],
  hookB: ["AND YOU", "NEVER", "NOTICED."],
  handle: "@your.profile",
  details: ["THE BIO", "THE FIRST 3", "THE COLOURS"],
  cards: ["CREATIVE", "CREDIBLE", "POLISHED", "MYSTERIOUS"],
  mirrorYou: "WHAT YOU SEE",
  mirrorThem: "WHAT THEY SEE",
  verdictLabel: "VERDICT",
  verdict: "DISTANT",
  scoreLabel: "BLINK SCORE",
  score: "8.6",
  scoreOutOf: "/10",
  steps: ["LOOKS", "READS", "DEDUCES", "TELLS YOU"],
  appTitle: "Analyse a profile",
  typed: "@your.handle",
  button: "Analyse",
  slogan: ["SEE YOURSELF", "THE WAY OTHERS", "SEE YOU"],
  cta: "ANALYSE YOUR PROFILE",
  brand: "Blink",
};

export const COPY: Record<Lang, FilmCopy> = { fr: FR, en: EN };
