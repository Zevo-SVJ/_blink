/**
 * Blink Analysis — structured schema, service abstraction, and validation.
 *
 * Architecture:
 *   Upload → Resize → POST Supabase Edge Function → AI vision model → Validate → UI
 *
 * Auth: uses Supabase sessions. Save/fetch use Supabase client directly with RLS.
 */

import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Profile ownership detection
// ---------------------------------------------------------------------------

export type ProfileOwnership = "own" | "other" | "uncertain";

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
  /** Who the profile belongs to — detected from visible UI elements */
  ownership: ProfileOwnership;
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
  | "TIMEOUT";

export const ERROR_MESSAGES: Record<AnalysisErrorCode, string> = {
  INVALID_IMAGE: "Upload a screenshot of your Instagram profile.",
  ANALYSIS_FAILED: "Something went wrong while reading your profile. Try again.",
  UNSUPPORTED_SCREENSHOT: "Make sure your profile is clearly visible in the screenshot.",
  NETWORK_ERROR: "Blink lost connection. Try again.",
  IMAGE_TOO_LARGE: "That image is too large. Try a smaller screenshot.",
  TIMEOUT: "Analysis is taking longer than expected. Try again.",
};

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
// Contextual messages based on ownership
// ---------------------------------------------------------------------------

export function getAnalysisMessages(ownership: ProfileOwnership): string[] {
  const isOwn = ownership === "own";
  const isOther = ownership === "other";
  const subject = isOwn ? "your profile" : isOther ? "the profile" : "this profile";
  const possessive = isOwn ? "your" : isOther ? "the" : "this";

  return [
    `Analyzing ${subject}…`,
    `Reading the visual identity`,
    `Understanding the aesthetic`,
    `Looking at the signals people notice first`,
    `Mapping the personality cues`,
    `Building ${possessive} first impression`,
    `Seeing how different people may perceive ${subject}`,
    `Your analysis is ready.`,
  ];
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

  return {
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
    ownership: validateOwnership(obj.ownership),
    category: validateCategory(obj.category),
  };
}

// ---------------------------------------------------------------------------
// Service — calls the Supabase Edge Function for AI analysis
// ---------------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string;
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
  return validateAnalysisResult(result);
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
  result: AnalysisResult,
  _imageBase64: string,
  _mimeType: string,
): Promise<SavedAnalysis | null> {
  try {
    const { data, error } = await supabase
      .from("analyses")
      .insert({
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

export async function fetchSavedAnalyses(): Promise<SavedAnalysis[]> {
  try {
    const { data, error } = await supabase
      .from("analyses")
      .select("id, created_at, ownership, result")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[fetchSavedAnalyses] Supabase error:", error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      ownership: validateOwnership(row.ownership),
      result: validateAnalysisResult(row.result),
    }));
  } catch (err) {
    console.error("[fetchSavedAnalyses] exception:", err);
    return [];
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
