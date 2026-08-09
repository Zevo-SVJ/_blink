/**
 * Development-only analysis stub.
 *
 * Lets the analysing animation and both result variants be exercised without
 * live credentials — visit `/analyze?mock=own` or `/analyze?mock=other`.
 *
 * Guarded by `import.meta.env.DEV` at every call site, so this is dropped from
 * production bundles.
 */

import { validateAnalysisResult, type AnalysisResult } from "@/lib/analysis";

/** Reads the mock flag off the URL. Returns null when not in dev or not set. */
export function getMockMode(search: string): "own" | "other" | null {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(search).get("mock");
  return value === "own" || value === "other" ? value : null;
}

export async function mockAnalyze(mode: "own" | "other"): Promise<AnalysisResult> {
  await new Promise((resolve) => setTimeout(resolve, 4200));
  return buildSample(mode);
}

/**
 * A fully-populated result, also used by the dev component gallery so the
 * result surfaces can be rendered without credentials.
 */
export const SAMPLE_ANALYSIS: AnalysisResult = buildSample("own");

function buildSample(mode: "own" | "other"): AnalysisResult {
  const own = mode === "own";

  return validateAnalysisResult({
    ownership: own ? "own" : "other",
    ownershipEvidence: own
      ? { editProfile: true, shareProfile: true }
      : { follow: true, message: true },
    handle: own ? "sam.dev" : "alexmorgan",
    subjectGender: own ? "unknown" : "female",
    overallScore: 8.4,
    firstImpression: "Deliberate and low-key",
    traits: ["Considered", "Understated", "Consistent"],
    why: "The grid holds one palette and the bio says exactly one thing, which reads as someone who decided what they wanted this to look like rather than posting whatever was on hand.",
    signals: [
      { score: 8.6, description: "One palette across every tile, held consistently." },
      { score: 8.1, description: "Muted, film-leaning treatment that never fights itself." },
      { score: 7.9, description: "Nothing is over-explained, which reads as settled." },
      { score: 7.2, description: "Quiet signals rather than overt markers." },
      { score: 6.4, description: "Approachable, though the restraint keeps some distance." },
      { score: 7.6, description: "Enough is withheld to leave a question open." },
    ],
    strengths: [
      "The palette discipline is doing most of the work — it makes the whole grid read as one body of work.",
      "The bio resists over-explaining, which reads as confidence rather than absence.",
    ],
    weaknesses: [
      "The restraint that creates the mystery also makes it harder to tell what this account is for.",
    ],
    strongestSignals: ["Visual Identity", "Aesthetic"],
    recommendations: [
      "Swap the third tile for something with a face in it — the grid currently has no human anchor.",
      "Add four words to the bio that name what you actually do, without breaking the understatement.",
      "Give the highlights covers in the same palette so the header stops reading as an afterthought.",
    ],
    nextMove: "Replace the profile picture with a closer crop — at grid scale the current one loses the face.",
    category: { category: "minimalist", categoryConfidence: 0.82, categorySignals: ["palette", "restraint"] },
    perspectives: {
      crush: {
        traits: ["Composed", "Selective"],
        summary: "Reads as someone who isn't performing for attention, which lands as attractive.",
        why: "Restraint is doing the work that effort usually does.",
        recommendation: "One candid would make this feel reachable rather than admired from a distance.",
      },
      stranger: {
        traits: ["Coherent", "Intentional"],
        summary: "Three seconds is enough to tell this account was thought about.",
        why: "Consistency registers before any single image does.",
        recommendation: "Name the subject matter in the bio so the first read has somewhere to land.",
      },
      friends: {
        traits: ["Understated", "Private"],
        summary: "Recognisable, but more curated than the person likely is in life.",
        why: "The edit is tighter than most people's day-to-day.",
        recommendation: "A story highlight of unpolished shots would close the gap.",
      },
      recruiter: {
        traits: ["Disciplined", "Detail-oriented"],
        summary: "The consistency reads as someone who finishes what they start.",
        why: "Sustained visual discipline is legible as work ethic.",
        recommendation: "State the discipline explicitly — the craft is visible but unnamed.",
      },
    },
  });
}
