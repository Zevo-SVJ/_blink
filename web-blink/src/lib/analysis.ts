/**
 * Blink Analysis — structured schema, service abstraction, and validation.
 *
 * Architecture:
 *   Upload → Resize → POST Supabase Edge Function → AI vision model → Validate → UI
 *
 * Auth: uses Supabase sessions. Save/fetch use Supabase client directly with RLS.
 */

import {
  EMPTY_EVIDENCE,
  resolveOwnership,
  type OwnershipEvidence,
  type ProfileOwnership,
  type SubjectGender,
} from "@/lib/ownership";
import type { Messages } from "@/lib/messages";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";
import { normaliseSupabaseUrl, supabase } from "@/lib/supabase";

// Ownership lives in its own module, but it is part of an analysis result's
// public shape — re-exported so callers have a single import site.
export type { OwnershipEvidence, ProfileOwnership, SubjectGender };
export { getAnalysisMessages, getVoice } from "@/lib/ownership";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface SignalScore {
  label: string;
  score: number;
  description: string;
}

export interface Perspective {
  id: "crush" | "stranger" | "friends" | "recruiter";
  emoji: string;
  title: string;
  traits: string[];
  summary: string;
  why: string;
  recommendation: string;
}

export interface CategoryInfo {
  category: string | null;
  categoryConfidence: number;
  categorySignals: string[];
}

export interface AnalysisResult {
  overallScore: number;
  firstImpression: string;
  traits: string[];
  why: string;
  signals: SignalScore[];
  strengths: string[];
  weaknesses: string[];
  strongestSignals: string[];
  recommendations: string[];
  nextMove: string;
  perspectives: {
    crush: Perspective;
    stranger: Perspective;
    friends: Perspective;
    recruiter: Perspective;
  };
  /** Who the profile belongs to — reconciled from visible UI elements */
  ownership: ProfileOwnership;
  /** The raw UI controls the model saw, used to decide `ownership` */
  ownershipEvidence: OwnershipEvidence;
  /** Gender of the subject, when legible — drives his/her wording */
  subjectGender: SubjectGender;
  /** Instagram handle read off the screenshot, without the leading @ */
  handle: string | null;
  /** Future category system — not forced, but structured for later use */
  category: CategoryInfo;
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export type AnalysisErrorCode =
  | "INVALID_IMAGE"
  | "ANALYSIS_FAILED"
  | "UNSUPPORTED_SCREENSHOT"
  | "NETWORK_ERROR"
  | "IMAGE_TOO_LARGE"
  | "TIMEOUT"
  /** The image isn't an Instagram profile page. */
  | "NOT_INSTAGRAM"
  /** The image contains content Blink won't analyze. */
  | "UNSAFE_CONTENT";

const ERROR_TEXT: Record<Lang, Record<AnalysisErrorCode, string>> = {
  en: {
    INVALID_IMAGE: "Upload a screenshot of your Instagram profile.",
    ANALYSIS_FAILED: "Something went wrong while reading your profile. Try again.",
    UNSUPPORTED_SCREENSHOT: "Make sure your profile is clearly visible in the screenshot.",
    NETWORK_ERROR: "Blink lost connection. Try again.",
    IMAGE_TOO_LARGE: "That image is too large. Try a smaller screenshot.",
    TIMEOUT: "Analysis is taking longer than expected. Try again.",
    NOT_INSTAGRAM:
      "That doesn't look like an Instagram profile. Upload a screenshot of a profile page — the one showing the username, profile picture and post grid.",
    UNSAFE_CONTENT: "Blink can't analyze that image. Try a different screenshot.",
  },
  fr: {
    INVALID_IMAGE: "Envoie une capture d'écran de ton profil Instagram.",
    ANALYSIS_FAILED: "Un problème est survenu pendant la lecture du profil. Réessaie.",
    UNSUPPORTED_SCREENSHOT: "Vérifie que le profil est bien visible sur la capture.",
    NETWORK_ERROR: "Blink a perdu la connexion. Réessaie.",
    IMAGE_TOO_LARGE: "Cette image est trop lourde. Essaie une capture plus petite.",
    TIMEOUT: "L'analyse prend plus de temps que prévu. Réessaie.",
    NOT_INSTAGRAM:
      "Ça ne ressemble pas à un profil Instagram. Envoie la capture d'une page de profil — celle qui montre le pseudo, la photo de profil et la grille de publications.",
    UNSAFE_CONTENT: "Blink ne peut pas analyser cette image. Essaie une autre capture.",
  },
};

/** Messages for a language. Callers inside React use `useT()`-adjacent hooks. */
export function errorMessages(lang: Lang = DEFAULT_LANG): Record<AnalysisErrorCode, string> {
  return ERROR_TEXT[lang];
}

/**
 * English messages, kept as a named export because `AnalysisError` is thrown
 * from non-React code that has no language context. Anything rendered to a
 * user goes through `errorMessages(lang)` at the call site instead.
 */
export const ERROR_MESSAGES: Record<AnalysisErrorCode, string> = ERROR_TEXT.en;

/** Refusals are the user's to fix, so they read as guidance rather than failure. */
export function isRefusal(code: AnalysisErrorCode): boolean {
  return code === "NOT_INSTAGRAM" || code === "UNSAFE_CONTENT";
}

/**
 * Detect an analysis that carries no actual reading of a profile.
 *
 * When the model is handed something that isn't an Instagram profile it does
 * not always take the rejection path — sometimes it complies with the schema
 * and returns zeros. The validator then fills the gaps and the UI presents a
 * confident "0" as though it were a real score.
 *
 * This is the backstop: a result with no signal, no narrative and no traits
 * isn't an analysis, whatever the model called it. Treated as a rejection so
 * the user is told to pick another image rather than shown a fake score.
 *
 * The thresholds are deliberately low — a genuinely poor profile still scores
 * a few points on several axes and always produces prose.
 */
export function isDegenerateAnalysis(result: AnalysisResult): boolean {
  const signalTotal = result.signals.reduce((sum, s) => sum + s.score, 0);
  const hasNarrative = result.why.trim().length > 0;
  const hasTraits = result.traits.length > 0;
  const hasImpression = result.firstImpression.trim().length > 0
    && result.firstImpression !== "First impression";

  // Everything flat at zero AND nothing written: not a profile read.
  if (signalTotal <= 0 && result.overallScore <= 0) return true;

  // Scored but completely mute — the model filled numbers without seeing
  // anything it could describe.
  if (!hasNarrative && !hasTraits && !hasImpression) return true;

  return false;
}

export class AnalysisError extends Error {
  code: AnalysisErrorCode;
  /** Real error detail for development — never shown to users */
  debugDetail?: string;
  constructor(code: AnalysisErrorCode, message?: string, debugDetail?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.code = code;
    this.debugDetail = debugDetail;
    this.name = "AnalysisError";
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && !isNaN(v) ? v : fallback;
}

function asStringArray(v: unknown, fallback: string[]): string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string") ? v : fallback;
}

function validateSignal(v: unknown, label: string): SignalScore {
  if (!isObject(v)) return { label, score: 5, description: "" };
  return {
    label,
    score: Math.max(0, Math.min(10, asNumber(v.score, 5))),
    description: asString(v.description, ""),
  };
}

const PERSPECTIVE_META = {
  crush: { emoji: "❤️", title: "How your crush sees you" },
  stranger: { emoji: "👀", title: "How a stranger sees you" },
  friends: { emoji: "👥", title: "How your friends might see you" },
  recruiter: { emoji: "💼", title: "How a recruiter sees you" },
} as const;

function validatePerspective(v: unknown, id: Perspective["id"]): Perspective {
  const meta = PERSPECTIVE_META[id];
  if (!isObject(v)) {
    return {
      id,
      emoji: meta.emoji,
      title: meta.title,
      traits: [],
      summary: "",
      why: "",
      recommendation: "",
    };
  }
  return {
    id,
    emoji: meta.emoji,
    title: meta.title,
    traits: asStringArray(v.traits, []),
    summary: asString(v.summary, ""),
    why: asString(v.why, ""),
    recommendation: asString(v.recommendation, ""),
  };
}

function validateOwnership(v: unknown): ProfileOwnership {
  if (v === "own" || v === "other" || v === "uncertain") return v;
  return "uncertain";
}

function validateEvidence(v: unknown): OwnershipEvidence {
  if (!isObject(v)) return EMPTY_EVIDENCE;
  return {
    editProfile: v.editProfile === true,
    shareProfile: v.shareProfile === true,
    follow: v.follow === true,
    message: v.message === true,
  };
}

function validateGender(v: unknown): SubjectGender {
  if (v === "male" || v === "female") return v;
  return "unknown";
}

function validateHandle(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const cleaned = v.trim().replace(/^@+/, "");
  // Instagram handles: letters, digits, dots, underscores, up to 30 chars.
  return /^[A-Za-z0-9._]{1,30}$/.test(cleaned) ? cleaned : null;
}

/**
 * Strip everything written *for the account's owner* out of a result.
 *
 * Someone analysing another person's profile gets the read — score, signals,
 * category, perception lenses — but never the improvement plan, which is only
 * meaningful (and only appropriate) for the person who controls the account.
 *
 * This runs on every result rather than trusting the model to withhold advice,
 * so a prompt regression can't leak it.
 */
function stripOwnerAdvice(result: AnalysisResult): AnalysisResult {
  if (result.ownership === "own") return result;

  const perspectives = { ...result.perspectives };
  for (const id of Object.keys(perspectives) as Perspective["id"][]) {
    perspectives[id] = { ...perspectives[id], recommendation: "" };
  }

  return {
    ...result,
    recommendations: [],
    nextMove: "",
    perspectives,
  };
}

function validateCategory(v: unknown): CategoryInfo {
  if (!isObject(v)) return { category: null, categoryConfidence: 0, categorySignals: [] };
  return {
    category: typeof v.category === "string" ? v.category : null,
    categoryConfidence: Math.max(0, Math.min(1, asNumber(v.categoryConfidence, 0))),
    categorySignals: asStringArray(v.categorySignals, []),
  };
}

export function validateAnalysisResult(raw: unknown): AnalysisResult {
  const obj = isObject(raw) ? raw : {};

  const perspectivesRaw = isObject(obj.perspectives) ? obj.perspectives : {};
  const signalsRaw = Array.isArray(obj.signals) ? obj.signals : [];
  const signalLabels = [
    "Visual Identity",
    "Aesthetic",
    "Confidence",
    "Status",
    "Approachability",
    "Mystery",
  ];

  const evidence = validateEvidence(obj.ownershipEvidence);

  const result: AnalysisResult = {
    overallScore: Math.max(0, Math.min(10, asNumber(obj.overallScore, 5))),
    firstImpression: asString(obj.firstImpression, "First impression"),
    traits: asStringArray(obj.traits, []),
    why: asString(obj.why, ""),
    signals: signalLabels.map((label, i) => validateSignal(signalsRaw[i], label)),
    strengths: asStringArray(obj.strengths, []),
    weaknesses: asStringArray(obj.weaknesses, []),
    strongestSignals: asStringArray(obj.strongestSignals, []),
    recommendations: asStringArray(obj.recommendations, []),
    nextMove: asString(obj.nextMove, ""),
    perspectives: {
      crush: validatePerspective(perspectivesRaw.crush, "crush"),
      stranger: validatePerspective(perspectivesRaw.stranger, "stranger"),
      friends: validatePerspective(perspectivesRaw.friends, "friends"),
      recruiter: validatePerspective(perspectivesRaw.recruiter, "recruiter"),
    },
    // Visible UI controls decide this, not the model's self-report.
    ownership: resolveOwnership(evidence, validateOwnership(obj.ownership)),
    ownershipEvidence: evidence,
    subjectGender: validateGender(obj.subjectGender),
    handle: validateHandle(obj.handle),
    category: validateCategory(obj.category),
  };

  return stripOwnerAdvice(result);
}

// ---------------------------------------------------------------------------
// Service — calls the Supabase Edge Function for AI analysis
// ---------------------------------------------------------------------------

// Normalised, so a project URL pasted from the Data API panel (which carries
// a `/rest/v1` path) still resolves to the Edge Function rather than to
// PostgREST. See `normaliseSupabaseUrl`.
const SUPABASE_URL = normaliseSupabaseUrl(
  import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined,
);
const SUPABASE_ANON_KEY = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

/** Supabase Edge Function endpoint for AI analysis */
const ANALYZE_ENDPOINT = `${SUPABASE_URL}/functions/v1/analyze`;

/** Timeout for the AI analysis request — vision models can take 15-30s */
const ANALYSIS_TIMEOUT_MS = 90_000;

/**
 * Analyze a profile screenshot via the Supabase Edge Function.
 * The Edge Function forwards the image to the AI vision model.
 *
 * No authentication required for this step — the intended flow is:
 * upload → analyze → results locked → authenticate → unlock
 */
export async function analyzeProfile(
  imageBase64: string,
  mimeType: string,
): Promise<AnalysisResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new AnalysisError(
      "ANALYSIS_FAILED",
      undefined,
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  console.log(`[analyzeProfile] sending to ${ANALYZE_ENDPOINT}, image~${Math.floor((imageBase64.length * 3) / 4)} bytes`);

  // Use AbortController for timeout — AI vision calls can take 15-30+ seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(ANALYZE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Supabase Edge Functions accept the anon key as either apikey or Authorization header.
        // We use Authorization because the Edge Function's CORS policy allows it
        // (apikey is not in Access-Control-Allow-Headers, causing a browser CORS block).
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ image: imageBase64, mimeType }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    const detail = isTimeout
      ? `Request aborted after ${ANALYSIS_TIMEOUT_MS}ms`
      : err instanceof Error ? err.message : String(err);
    console.error(`[analyzeProfile] fetch failed: ${detail}`);
    throw new AnalysisError(
      isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
      undefined,
      detail,
    );
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    let code: AnalysisErrorCode = "ANALYSIS_FAILED";
    let detail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.code && body.code in ERROR_MESSAGES) {
        code = body.code as AnalysisErrorCode;
      }
      detail = `HTTP ${response.status}: ${JSON.stringify(body).slice(0, 200)}`;
    } catch {
      // Response wasn't JSON — use status text
      try {
        const text = await response.text();
        detail = `HTTP ${response.status}: ${text.slice(0, 200)}`;
      } catch {
        // use default
      }
    }
    console.error(`[analyzeProfile] non-OK response: ${detail}`);
    throw new AnalysisError(code, undefined, detail);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    const detail = `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[analyzeProfile] ${detail}`);
    throw new AnalysisError("ANALYSIS_FAILED", undefined, detail);
  }

  const result = isObject(body) ? body.result : undefined;
  if (!result) {
    console.error("[analyzeProfile] no result field in response");
    throw new AnalysisError("ANALYSIS_FAILED", undefined, "No 'result' field in response body");
  }

  console.log("[analyzeProfile] success — validating result");
  const validated = validateAnalysisResult(result);

  // Last line of defence: the model sometimes answers a non-profile image with
  // a schema-shaped but empty analysis instead of refusing. Showing that as a
  // score would be fabricating a reading, so it becomes a rejection here.
  if (isDegenerateAnalysis(validated)) {
    console.warn("[analyzeProfile] degenerate result — treating as not-an-Instagram-profile");
    throw new AnalysisError(
      "NOT_INSTAGRAM",
      undefined,
      "Model returned an empty analysis; likely not a profile screenshot",
    );
  }

  return validated;
}

// ---------------------------------------------------------------------------
// Save analysis to user account — uses Supabase directly with RLS
// ---------------------------------------------------------------------------

export interface SavedAnalysis {
  id: string;
  createdAt: string;
  ownership: ProfileOwnership;
  result: AnalysisResult;
}

/**
 * Save an analysis result to the user's account via Supabase.
 * RLS ensures only the authenticated user can insert their own records.
 */
export async function saveAnalysis(
  userId: string,
  result: AnalysisResult,
): Promise<SavedAnalysis | null> {
  try {
    const { data, error } = await supabase
      .from("analyses")
      .insert({
        // Required and has no database default — omitting it made every
        // insert fail the NOT NULL check, which is why nothing ever reached
        // the Library. RLS also matches this against auth.uid().
        user_id: userId,
        ownership: result.ownership,
        overall_score: result.overallScore,
        first_impression: result.firstImpression,
        traits: result.traits,
        signals: result.signals,
        result: result,
        category: result.category,
      })
      .select("id, created_at, ownership, result")
      .single();

    if (error) {
      console.error("[saveAnalysis] Supabase error:", error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      createdAt: data.created_at,
      ownership: data.ownership as ProfileOwnership,
      result: validateAnalysisResult(data.result),
    };
  } catch (err) {
    console.error("[saveAnalysis] exception:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fetch saved analyses (Library) — uses Supabase directly with RLS
// ---------------------------------------------------------------------------

/**
 * Every analysis this account has saved.
 *
 * **Throws when it cannot reach the database, and that is the point.** It used
 * to swallow the failure and return an empty array, which Library could not
 * tell apart from a genuinely empty library — so a reader on a train was shown
 * "No analyses yet. Analyze a profile to start building your library." while
 * every one of their analyses sat safely on the server. Telling somebody their
 * work is gone when the network is down is worse than any error message.
 *
 * Library already has an error state with a retry; it simply never fired,
 * because nothing ever rejected.
 */
export async function fetchSavedAnalyses(): Promise<SavedAnalysis[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select("id, created_at, ownership, result")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchSavedAnalyses] Supabase error:", error.message);
    throw new Error(error.message);
  }

  if (!data || !Array.isArray(data)) return [];

  return data.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    ownership: validateOwnership(row.ownership),
    result: validateAnalysisResult(row.result),
  }));
}

// ---------------------------------------------------------------------------
// Fetch one saved analysis — for reopening from the Library
// ---------------------------------------------------------------------------

export type FetchOne =
  | { status: "ok"; analysis: SavedAnalysis }
  | { status: "not-found" }
  | { status: "error"; message: string };

/**
 * Load a single saved analysis by id.
 *
 * RLS scopes this to the signed-in user, so a valid id belonging to someone
 * else comes back as not-found rather than leaking their analysis.
 */
export async function fetchAnalysisById(id: string): Promise<FetchOne> {
  try {
    const { data, error } = await supabase
      .from("analyses")
      .select("id, created_at, ownership, result")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[fetchAnalysisById] Supabase error:", error.message);
      return {
        status: "error",
        message: "Blink couldn't load that analysis. Check your connection and try again.",
      };
    }

    if (!data) return { status: "not-found" };

    return {
      status: "ok",
      analysis: {
        id: data.id,
        createdAt: data.created_at,
        ownership: validateOwnership(data.ownership),
        result: validateAnalysisResult(data.result),
      },
    };
  } catch (err) {
    console.error("[fetchAnalysisById] exception:", err);
    return {
      status: "error",
      message: "Blink couldn't load that analysis. Check your connection and try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// Delete a saved analysis — uses Supabase directly with RLS
// ---------------------------------------------------------------------------

export async function deleteAnalysis(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("analyses").delete().eq("id", id);
    if (error) {
      console.error("[deleteAnalysis] Supabase error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[deleteAnalysis] exception:", err);
    return false;
  }
}

/**
 * A signal's name in the reader's language.
 *
 * The canonical English string is an identifier: `computeBlinkScore` finds the
 * craft signals by looking those exact words up, and the model returns them in
 * a fixed order. Translating at the point of display keeps that contract while
 * letting the French app say "Identité visuelle" — the same arrangement
 * `tierLabel` and `categoryLabel` already use. An unrecognised label falls back
 * to itself, so a new signal appears in English rather than not at all.
 */
export function signalName(label: string, t?: Messages): string {
  const names = t?.analysis.signalNames as Record<string, string> | undefined;
  return names?.[label] ?? label;
}
