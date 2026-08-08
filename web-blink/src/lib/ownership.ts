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

const PERSPECTIVE_TITLES: Record<
  Perspective["id"],
  { own: string; other: (object: string) => string }
> = {
  crush: {
    own: "How your crush sees you",
    other: (o) => `How a crush sees ${o}`,
  },
  stranger: {
    own: "How a stranger sees you",
    other: (o) => `How a stranger sees ${o}`,
  },
  friends: {
    own: "How your friends might see you",
    other: (o) => `How friends might see ${o}`,
  },
  recruiter: {
    own: "How a recruiter sees you",
    other: (o) => `How a recruiter sees ${o}`,
  },
};

export function getVoice(
  ownership: ProfileOwnership,
  gender: SubjectGender = "unknown",
): Voice {
  const isOwn = ownership === "own";

  // Gendered wording is only appropriate once we know the profile is someone
  // else's *and* the screenshot made the subject legible. Anything short of
  // that stays neutral rather than guessing at a real person's pronouns.
  const gendered = !isOwn && ownership === "other" && gender !== "unknown";

  const Subject = isOwn
    ? "Your profile"
    : gendered
      ? gender === "male"
        ? "His profile"
        : "Her profile"
      : "This profile";

  const possessive = isOwn
    ? "your"
    : gendered
      ? gender === "male"
        ? "his"
        : "her"
      : "this profile's";

  const pronoun = isOwn
    ? "you"
    : gendered
      ? gender === "male"
        ? "he"
        : "she"
      : "this profile";

  const object = isOwn
    ? "you"
    : gendered
      ? gender === "male"
        ? "him"
        : "her"
      : "this profile";

  return {
    ownership,
    gender,
    isOwn,
    Subject,
    subject: Subject.charAt(0).toLowerCase() + Subject.slice(1),
    possessive,
    Possessive: possessive.charAt(0).toUpperCase() + possessive.slice(1),
    pronoun,
    object,

    signalsHeading: "What creates this impression",
    perspectivesHeading: isOwn
      ? "How different people may see you"
      : `How different people may see ${object}`,
    perspectiveTitle: (id) => {
      const t = PERSPECTIVE_TITLES[id];
      return isOwn ? t.own : t.other(object);
    },

    // Own profile gets action framing because the user can act on it.
    // Someone else's gets observation framing — it is a read, not a to-do list.
    strengthsLabel: isOwn ? "What's working" : "What stands out",
    weaknessesLabel: isOwn ? "What you could change" : "What holds it back",
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
export function getAnalysisMessages(ownership: ProfileOwnership): string[] {
  const voice = getVoice(ownership);
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
