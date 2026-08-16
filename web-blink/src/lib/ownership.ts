/**
 * Blink — profile ownership & voice.
 *
 * Two jobs:
 *
 *  1. Decide *whose* profile a screenshot shows. Instagram renders a different
 *     action row depending on who is looking:
 *       - "Edit profile" / "Share profile"      → you are looking at yourself
 *       - "Follow" / "Following" / "Message"    → you are looking at someone else
 *     The vision model reports which controls it saw; this module turns that
 *     evidence into a decision deterministically, so the copy never depends on
 *     the model remembering to set a field correctly.
 *
 *  2. Produce the right *voice* for every string the results UI renders.
 *     Own profile speaks to you ("Your profile", "How your crush sees you").
 *     Someone else's profile speaks about them ("His profile", "How a crush
 *     sees him") and never hands out advice meant for that account's owner.
 */

import type { Perspective } from "@/lib/analysis";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";

export type ProfileOwnership = "own" | "other" | "uncertain";

/** Gender of the person the profile belongs to, when the screenshot makes it legible. */
export type SubjectGender = "male" | "female" | "unknown";

/**
 * Which Instagram profile-header controls were visible in the screenshot.
 * Reported by the vision model; the decision below is made here, not there.
 */
export interface OwnershipEvidence {
  editProfile: boolean;
  shareProfile: boolean;
  follow: boolean;
  message: boolean;
}

export const EMPTY_EVIDENCE: OwnershipEvidence = {
  editProfile: false,
  shareProfile: false,
  follow: false,
  message: false,
};

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Resolve ownership from the visible UI controls.
 *
 * "Edit profile" and "Share profile" are only ever rendered on your own
 * profile, and "Follow"/"Message" only ever on someone else's, so either
 * family appearing alone is already decisive. Requiring both would throw away
 * correct answers whenever a screenshot is cropped just below one button.
 *
 * Contradictory evidence (both families present) means the crop is ambiguous —
 * we say so rather than guessing, and the UI falls back to neutral wording.
 */
export function detectOwnership(evidence: OwnershipEvidence): ProfileOwnership {
  const ownSignals = evidence.editProfile || evidence.shareProfile;
  const otherSignals = evidence.follow || evidence.message;

  if (ownSignals && !otherSignals) return "own";
  if (otherSignals && !ownSignals) return "other";
  return "uncertain";
}

/**
 * Combine UI evidence with the model's own claim.
 *
 * Visible controls win: they are a fact about the screenshot, while the
 * model's `ownership` field is an inference it sometimes gets wrong. The claim
 * is only consulted when the controls were inconclusive.
 */
export function resolveOwnership(
  evidence: OwnershipEvidence,
  claimed: ProfileOwnership,
): ProfileOwnership {
  const detected = detectOwnership(evidence);
  return detected !== "uncertain" ? detected : claimed;
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

export interface Voice {
  ownership: ProfileOwnership;
  gender: SubjectGender;
  /** True only for the signed-in user's own profile. Gates all advice. */
  isOwn: boolean;

  /** "Your profile" · "His profile" · "Her profile" · "This profile" */
  Subject: string;
  /** Lowercase form for mid-sentence use. */
  subject: string;
  /** "your" · "his" · "her" · "this profile's" */
  possessive: string;
  /** Capitalised possessive. */
  Possessive: string;
  /** "you" · "he" · "she" · "this profile" */
  pronoun: string;
  /** "you" · "him" · "her" · "this profile" */
  object: string;

  /** Heading above the perception-lens tabs. */
  perspectivesHeading: string;
  /** Heading above the signal bars. */
  signalsHeading: string;
  /** Title for a single perception lens. */
  perspectiveTitle: (id: Perspective["id"]) => string;
  /** Label above the positive observations. */
  strengthsLabel: string;
  /** Label above the limiting observations. */
  weaknessesLabel: string;
}

/**
 * The four grammatical situations every line here has to handle.
 *
 * English mostly gets away with substituting an object word into a sentence —
 * "How a crush sees him". French does not: the object pronoun moves in front
 * of the verb and changes shape, so "voit lui" is wrong where "le voit" is
 * right, and a template with a hole in it produces broken French every time.
 *
 * Naming the four cases and writing each sentence out per case is what makes
 * both languages correct. It also documents the rule the product actually
 * follows: a real person's pronouns are only used when the profile said them
 * in words, and `neutral` is what everything else gets.
 */
type VoiceCase = "own" | "male" | "female" | "neutral";

interface VoiceStrings {
  Subject: string;
  possessive: string;
  pronoun: string;
  object: string;
  signalsHeading: string;
  perspectivesHeading: string;
  strengthsLabel: string;
  weaknessesLabel: string;
  perspectives: Record<Perspective["id"], string>;
}

const VOICE: Record<Lang, Record<VoiceCase, VoiceStrings>> = {
  en: {
    own: {
      Subject: "Your profile",
      possessive: "your",
      pronoun: "you",
      object: "you",
      signalsHeading: "What creates this impression",
      perspectivesHeading: "How different people may see you",
      strengthsLabel: "What's working",
      weaknessesLabel: "What you could change",
      perspectives: {
        crush: "How your crush sees you",
        stranger: "How a stranger sees you",
        friends: "How your friends might see you",
        recruiter: "How a recruiter sees you",
      },
    },
    male: {
      Subject: "His profile",
      possessive: "his",
      pronoun: "he",
      object: "him",
      signalsHeading: "What creates this impression",
      perspectivesHeading: "How different people may see him",
      strengthsLabel: "What stands out",
      weaknessesLabel: "What holds it back",
      perspectives: {
        crush: "How a crush sees him",
        stranger: "How a stranger sees him",
        friends: "How friends might see him",
        recruiter: "How a recruiter sees him",
      },
    },
    female: {
      Subject: "Her profile",
      possessive: "her",
      pronoun: "she",
      object: "her",
      signalsHeading: "What creates this impression",
      perspectivesHeading: "How different people may see her",
      strengthsLabel: "What stands out",
      weaknessesLabel: "What holds it back",
      perspectives: {
        crush: "How a crush sees her",
        stranger: "How a stranger sees her",
        friends: "How friends might see her",
        recruiter: "How a recruiter sees her",
      },
    },
    neutral: {
      Subject: "This profile",
      possessive: "this profile's",
      pronoun: "this profile",
      object: "this profile",
      signalsHeading: "What creates this impression",
      perspectivesHeading: "How different people may see this profile",
      strengthsLabel: "What stands out",
      weaknessesLabel: "What holds it back",
      perspectives: {
        crush: "How a crush sees this profile",
        stranger: "How a stranger sees this profile",
        friends: "How friends might see this profile",
        recruiter: "How a recruiter sees this profile",
      },
    },
  },
  fr: {
    own: {
      Subject: "Ton profil",
      possessive: "ton",
      pronoun: "tu",
      object: "toi",
      signalsHeading: "Ce qui crée cette impression",
      perspectivesHeading: "Comment différentes personnes peuvent te voir",
      strengthsLabel: "Ce qui fonctionne",
      weaknessesLabel: "Ce que tu peux changer",
      perspectives: {
        crush: "Comment ton crush te voit",
        stranger: "Comment un inconnu te voit",
        friends: "Comment tes amis peuvent te voir",
        recruiter: "Comment un recruteur te voit",
      },
    },
    male: {
      Subject: "Son profil",
      possessive: "son",
      pronoun: "il",
      object: "lui",
      signalsHeading: "Ce qui crée cette impression",
      perspectivesHeading: "Comment différentes personnes peuvent le voir",
      strengthsLabel: "Ce qui ressort",
      weaknessesLabel: "Ce qui le retient",
      perspectives: {
        crush: "Comment un crush le voit",
        stranger: "Comment un inconnu le voit",
        friends: "Comment des amis peuvent le voir",
        recruiter: "Comment un recruteur le voit",
      },
    },
    female: {
      Subject: "Son profil",
      possessive: "son",
      pronoun: "elle",
      object: "elle",
      signalsHeading: "Ce qui crée cette impression",
      perspectivesHeading: "Comment différentes personnes peuvent la voir",
      strengthsLabel: "Ce qui ressort",
      weaknessesLabel: "Ce qui la retient",
      perspectives: {
        crush: "Comment un crush la voit",
        stranger: "Comment un inconnu la voit",
        friends: "Comment des amis peuvent la voir",
        recruiter: "Comment un recruteur la voit",
      },
    },
    neutral: {
      Subject: "Ce profil",
      possessive: "de ce profil",
      pronoun: "ce profil",
      object: "ce profil",
      signalsHeading: "Ce qui crée cette impression",
      perspectivesHeading: "Comment différentes personnes peuvent voir ce profil",
      strengthsLabel: "Ce qui ressort",
      weaknessesLabel: "Ce qui le retient",
      perspectives: {
        crush: "Comment un crush voit ce profil",
        stranger: "Comment un inconnu voit ce profil",
        friends: "Comment des amis peuvent voir ce profil",
        recruiter: "Comment un recruteur voit ce profil",
      },
    },
  },
};

export function getVoice(
  ownership: ProfileOwnership,
  gender: SubjectGender = "unknown",
  lang: Lang = DEFAULT_LANG,
): Voice {
  const isOwn = ownership === "own";

  // Gendered wording is only appropriate once we know the profile is someone
  // else's *and* the profile stated the subject in words. Anything short of
  // that stays neutral rather than guessing at a real person's pronouns — and
  // the model is instructed never to read gender off a face, so "unknown" is
  // the common and perfectly good answer.
  const voiceCase: VoiceCase = isOwn
    ? "own"
    : ownership === "other" && gender !== "unknown"
      ? gender
      : "neutral";

  const s = VOICE[lang][voiceCase];

  return {
    ownership,
    gender,
    isOwn,
    Subject: s.Subject,
    subject: s.Subject.charAt(0).toLowerCase() + s.Subject.slice(1),
    possessive: s.possessive,
    Possessive: s.possessive.charAt(0).toUpperCase() + s.possessive.slice(1),
    pronoun: s.pronoun,
    object: s.object,

    signalsHeading: s.signalsHeading,
    perspectivesHeading: s.perspectivesHeading,
    perspectiveTitle: (id) => s.perspectives[id],

    // Own profile gets action framing because the user can act on it.
    // Someone else's gets observation framing — it is a read, not a to-do list.
    strengthsLabel: s.strengthsLabel,
    weaknessesLabel: s.weaknessesLabel,
  };
}

// ---------------------------------------------------------------------------
// Analysis-in-progress messages
// ---------------------------------------------------------------------------

/**
 * The lines that cycle under the progress bar while the model works.
 *
 * Ownership is unknown until the response lands, so the early lines are
 * deliberately neutral and only the later ones lean on the resolved voice.
 */
export function getAnalysisMessages(
  ownership: ProfileOwnership,
  lang: Lang = DEFAULT_LANG,
): string[] {
  const voice = getVoice(ownership, "unknown", lang);

  if (lang === "fr") {
    return [
      "Lecture de la capture…",
      "Lecture de l'identité visuelle",
      "Compréhension de l'esthétique",
      "Repérage des signaux qu'on remarque en premier",
      "Cartographie des indices de personnalité",
      voice.isOwn ? "Construction de ta première impression" : "Construction de la première impression",
      voice.isOwn
        ? "Comment différentes personnes peuvent te percevoir"
        : "Comment différentes personnes peuvent percevoir ce profil",
      "L'analyse est prête.",
    ];
  }

  const subject = voice.isOwn ? "your profile" : voice.subject;

  return [
    "Reading the screenshot…",
    "Reading the visual identity",
    "Understanding the aesthetic",
    "Looking at the signals people notice first",
    "Mapping the personality cues",
    `Building ${voice.isOwn ? "your" : "the"} first impression`,
    `Seeing how different people may perceive ${subject}`,
    "The analysis is ready.",
  ];
}
