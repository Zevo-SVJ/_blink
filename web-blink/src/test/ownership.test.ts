import { describe, expect, it } from "vitest";

import { validateAnalysisResult } from "@/lib/analysis";
import {
  EMPTY_EVIDENCE,
  detectOwnership,
  getVoice,
  resolveOwnership,
} from "@/lib/ownership";

describe("detectOwnership", () => {
  it("reads Edit profile + Share profile as the user's own profile", () => {
    expect(
      detectOwnership({ ...EMPTY_EVIDENCE, editProfile: true, shareProfile: true }),
    ).toBe("own");
  });

  it("reads Follow + Message as someone else's profile", () => {
    expect(
      detectOwnership({ ...EMPTY_EVIDENCE, follow: true, message: true }),
    ).toBe("other");
  });

  it("decides from a single own-profile control when the crop hides the other", () => {
    expect(detectOwnership({ ...EMPTY_EVIDENCE, editProfile: true })).toBe("own");
    expect(detectOwnership({ ...EMPTY_EVIDENCE, shareProfile: true })).toBe("own");
  });

  it("decides from a single other-profile control", () => {
    expect(detectOwnership({ ...EMPTY_EVIDENCE, follow: true })).toBe("other");
    expect(detectOwnership({ ...EMPTY_EVIDENCE, message: true })).toBe("other");
  });

  it("refuses to guess when evidence contradicts itself", () => {
    expect(
      detectOwnership({ ...EMPTY_EVIDENCE, editProfile: true, follow: true }),
    ).toBe("uncertain");
  });

  it("refuses to guess when no controls are visible", () => {
    expect(detectOwnership(EMPTY_EVIDENCE)).toBe("uncertain");
  });
});

describe("resolveOwnership", () => {
  it("lets visible controls override a wrong model claim", () => {
    const evidence = { ...EMPTY_EVIDENCE, editProfile: true, shareProfile: true };
    expect(resolveOwnership(evidence, "other")).toBe("own");
  });

  it("falls back to the model claim only when controls are inconclusive", () => {
    expect(resolveOwnership(EMPTY_EVIDENCE, "other")).toBe("other");
    expect(resolveOwnership(EMPTY_EVIDENCE, "own")).toBe("own");
  });
});

describe("getVoice", () => {
  it("speaks to the user about their own profile", () => {
    const v = getVoice("own");
    expect(v.Subject).toBe("Your profile");
    expect(v.perspectiveTitle("crush")).toBe("How your crush sees you");
    expect(v.isOwn).toBe(true);
  });

  it("uses his/her when the subject is legible on someone else's profile", () => {
    expect(getVoice("other", "male").Subject).toBe("His profile");
    expect(getVoice("other", "female").Subject).toBe("Her profile");
    expect(getVoice("other", "male").perspectiveTitle("crush")).toBe(
      "How a crush sees him",
    );
  });

  it("stays neutral when the subject's gender is not legible", () => {
    const v = getVoice("other");
    expect(v.Subject).toBe("This profile");
    expect(v.perspectiveTitle("crush")).toBe("How a crush sees this profile");
  });

  it("never applies gendered wording to an uncertain profile", () => {
    expect(getVoice("uncertain", "male").Subject).toBe("This profile");
  });

  it("only treats an own profile as own", () => {
    expect(getVoice("other").isOwn).toBe(false);
    expect(getVoice("uncertain").isOwn).toBe(false);
  });
});

describe("validateAnalysisResult — owner-directed advice", () => {
  const raw = {
    ownership: "own",
    overallScore: 8,
    recommendations: ["Swap the third post", "Tighten the bio"],
    nextMove: "Change your profile picture",
    perspectives: {
      crush: { summary: "s", recommendation: "Smile more" },
      stranger: { summary: "s", recommendation: "Add context" },
      friends: { summary: "s", recommendation: "Post candids" },
      recruiter: { summary: "s", recommendation: "Add a role" },
    },
  };

  it("keeps recommendations for the user's own profile", () => {
    const r = validateAnalysisResult({
      ...raw,
      ownershipEvidence: { editProfile: true, shareProfile: true },
    });
    expect(r.ownership).toBe("own");
    expect(r.recommendations).toHaveLength(2);
    expect(r.nextMove).toBe("Change your profile picture");
    expect(r.perspectives.crush.recommendation).toBe("Smile more");
  });

  it("strips every owner-directed field for someone else's profile", () => {
    const r = validateAnalysisResult({
      ...raw,
      ownership: "other",
      ownershipEvidence: { follow: true, message: true },
    });
    expect(r.ownership).toBe("other");
    expect(r.recommendations).toEqual([]);
    expect(r.nextMove).toBe("");
    for (const p of Object.values(r.perspectives)) {
      expect(p.recommendation).toBe("");
    }
  });

  it("strips advice even when the model wrongly claims the profile is the user's", () => {
    // Model said "own", but the screenshot plainly shows Follow/Message.
    const r = validateAnalysisResult({
      ...raw,
      ownership: "own",
      ownershipEvidence: { follow: true, message: true },
    });
    expect(r.ownership).toBe("other");
    expect(r.recommendations).toEqual([]);
    expect(r.nextMove).toBe("");
  });

  it("withholds advice when ownership cannot be established", () => {
    const r = validateAnalysisResult({ ...raw, ownership: "uncertain" });
    expect(r.ownership).toBe("uncertain");
    expect(r.recommendations).toEqual([]);
  });

  it("normalises the handle and rejects malformed ones", () => {
    expect(validateAnalysisResult({ handle: "@sam.dev" }).handle).toBe("sam.dev");
    expect(validateAnalysisResult({ handle: "not a handle!" }).handle).toBeNull();
    expect(validateAnalysisResult({}).handle).toBeNull();
  });
});
