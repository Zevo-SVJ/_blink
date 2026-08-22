/**
 * Every word in the film, in both languages.
 *
 * ## Written to be read in a fraction of a second
 *
 * Nearly all of it is one to three words. A vertical ad does not get a
 * sentence — by the time a clause has been parsed the moment holding it is
 * gone. So the copy is broken into the units the kinetic typography actually
 * animates: `hook.words` is three separate impacts, not a line that happens to
 * wrap.
 *
 * ## Same frames in both languages
 *
 * The timeline is built out of durations, not text, so French and English are
 * cut identically. What differs is only how a word is *set*: the components
 * size type to fit, so "MYSTÉRIEUX" gets a smaller face than "SOIGNÉ" rather
 * than running off the frame.
 *
 * ## The words are the product's
 *
 * "Ton plus gros red flag", the perception adjectives and the score's framing
 * are reads Blink actually returns. A punchier invented line here would be a
 * promise the product does not keep.
 */

export type Lang = "fr" | "en";

export interface HookVariant {
  id: string;
  /** Three impacts. Each is one word or a very short pair. */
  words: string[];
  /** The small line under them, if any. */
  kicker?: string;
}

export interface FilmCopy {
  /** Hook variants. The live one is picked by `ACTIVE_HOOK`. */
  hooks: Record<string, HookVariant>;
  /** Act 2 — what is happening, stated once, quietly. */
  reading: string;
  /** Act 2 — the parts the scan calls out. Two words maximum each. */
  signals: string[];
  /** Act 3 — the flattering reads, one word each. */
  tags: string[];
  /** Act 3 — the interrupt. */
  flagLabel: string;
  flagKicker: string;
  flagWord: string;
  /** Act 4. */
  scoreLabel: string;
  scoreOutOf: string;
  scoreLine: string[];
  /** Act 5 — the product being used. */
  appTitle: string;
  appPlaceholder: string;
  appHandle: string;
  appButton: string;
  appDone: string;
  /** Act 5 — the ask. */
  ctaWords: string[];
  cta: string;
  brand: string;
}

const FR: FilmCopy = {
  hooks: {
    /*
      The one in use. It is a claim about the viewer, not about the app, and
      the viewer cannot check it — which is exactly why they keep watching.
    */
    others: {
      id: "others",
      words: ["CE QUE", "LES AUTRES", "VOIENT"],
      kicker: "quand ils ouvrent ton profil",
    },
    /* Alternative: the POV framing, native to the format. */
    pov: {
      id: "pov",
      words: ["POV :", "ils ouvrent", "TON PROFIL"],
      kicker: "voilà ce qu’ils pensent",
    },
    /* Alternative: the accusation. Shortest, coldest. */
    threeSeconds: {
      id: "threeSeconds",
      words: ["3 SECONDES", "POUR DÉCIDER", "QUI TU ES"],
      kicker: "c’est tout ce qu’ils prennent",
    },
  },
  reading: "Blink lit ton profil.",
  signals: ["BIO", "GRILLE", "COULEURS", "COHÉRENCE"],
  tags: ["SOIGNÉ", "CRÉDIBLE", "MYSTÉRIEUX", "CRÉATIF"],
  flagLabel: "RED FLAG",
  flagKicker: "Ton plus gros red flag",
  flagWord: "DISTANT",
  scoreLabel: "BLINK SCORE",
  scoreOutOf: "/10",
  scoreLine: ["PAS", "LES ABONNÉS."],
  appTitle: "Analyser un profil",
  appPlaceholder: "@identifiant",
  appHandle: "@ton.profil",
  appButton: "Analyser",
  appDone: "Analyse terminée",
  ctaWords: ["VOIS-TOI", "COMME LES AUTRES", "TE VOIENT"],
  cta: "Voir ma première impression",
  brand: "Blink",
};

const EN: FilmCopy = {
  hooks: {
    others: {
      id: "others",
      words: ["WHAT", "OTHER PEOPLE", "SEE"],
      kicker: "when they open your profile",
    },
    pov: {
      id: "pov",
      words: ["POV:", "they open", "YOUR PROFILE"],
      kicker: "here’s what they think",
    },
    threeSeconds: {
      id: "threeSeconds",
      words: ["3 SECONDS", "TO DECIDE", "WHO YOU ARE"],
      kicker: "that’s all they give you",
    },
  },
  reading: "Blink reads your profile.",
  signals: ["BIO", "GRID", "COLOUR", "CONSISTENCY"],
  tags: ["POLISHED", "CREDIBLE", "MYSTERIOUS", "CREATIVE"],
  flagLabel: "RED FLAG",
  flagKicker: "Your biggest red flag",
  flagWord: "DISTANT",
  scoreLabel: "BLINK SCORE",
  scoreOutOf: "/10",
  scoreLine: ["NOT", "FOLLOWERS."],
  appTitle: "Analyse a profile",
  appPlaceholder: "@handle",
  appHandle: "@your.profile",
  appButton: "Analyse",
  appDone: "Analysis complete",
  ctaWords: ["SEE YOURSELF", "THE WAY OTHERS", "SEE YOU"],
  cta: "See my first impression",
  brand: "Blink",
};

export const COPY: Record<Lang, FilmCopy> = { fr: FR, en: EN };

/**
 * Which hook is live.
 *
 * The first three seconds are the only part of an ad most people watch, so
 * they are the part worth testing. Every variant is three impacts landing on
 * the same frames, and nothing downstream refers to the hook's words — so
 * changing this constant replaces the opening without touching the edit, the
 * sound, or any other moment.
 */
export const ACTIVE_HOOK = "others";

/** The score the film reveals. One place, because two would drift. */
export const SCORE = 8.6;
