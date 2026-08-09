/**
 * Blink — profile & progression data access.
 *
 * Every call returns a discriminated result instead of throwing, so screens
 * can render a real error state rather than an empty one when the backend is
 * unreachable or the ranking tables haven't been migrated yet.
 */

import type { AnalysisResult } from "@/lib/analysis";
import {
  computeBlinkScore,
  computeProfileStats,
  hashImage,
  verifyProgression,
  type ProfileStats,
  type ProgressionCheck,
  type ScoreEntry,
} from "@/lib/ranking";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type DataResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

const NOT_CONFIGURED =
  "Blink can't reach your account right now. Check your connection and try again.";

function fail<T>(context: string, detail: unknown): DataResult<T> {
  console.error(`[${context}]`, detail);
  return { status: "error", message: NOT_CONFIGURED };
}

/**
 * Run a query and turn a *thrown* failure into an error result.
 *
 * supabase-js rejects rather than resolving `{ error }` when the request never
 * reaches the server (DNS failure, offline, CORS). Without this, the rejection
 * escapes the caller's `await`, the screen's `setLoad` never runs, and the UI
 * sits on a loading skeleton forever instead of offering a retry.
 */
async function safe<T>(context: string, run: () => Promise<DataResult<T>>): Promise<DataResult<T>> {
  try {
    return await run();
  } catch (err) {
    return fail(context, err);
  }
}

/**
 * Postgres reports a missing table/view as 42P01. That means the ranking
 * migration hasn't been applied — an empty leaderboard is the honest reading,
 * not a hard failure.
 */
function isMissingRelation(error: { code?: string } | null): boolean {
  return error?.code === "42P01";
}

// ---------------------------------------------------------------------------
// Public profile row
// ---------------------------------------------------------------------------

export interface BlinkProfile {
  id: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  /** ISO 3166-1 alpha-2, uppercase. */
  country: string | null;
  isPublic: boolean;
  score: number;
  peakScore: number;
  category: string | null;
  streak: number;
  verifiedCount: number;
  bestRank: number | null;
  lastVerifiedAt: string | null;
}

interface BlinkProfileRow {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  is_public: boolean | null;
  score: number | null;
  peak_score: number | null;
  category: string | null;
  streak: number | null;
  verified_count: number | null;
  best_rank: number | null;
  last_verified_at: string | null;
}

function mapProfile(row: BlinkProfileRow): BlinkProfile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    country: row.country,
    isPublic: row.is_public ?? false,
    score: row.score ?? 0,
    peakScore: row.peak_score ?? 0,
    category: row.category,
    streak: row.streak ?? 0,
    verifiedCount: row.verified_count ?? 0,
    bestRank: row.best_rank,
    lastVerifiedAt: row.last_verified_at,
  };
}

/** The signed-in user's ranked profile. `null` when they have none yet. */
export async function fetchBlinkProfile(
  userId: string,
): Promise<DataResult<BlinkProfile | null>> {
  if (!isSupabaseConfigured) return fail("fetchBlinkProfile", "not configured");

  return safe("fetchBlinkProfile", async () => {
    const { data, error } = await supabase
      .from("blink_profiles")
      .select(
        "id, handle, display_name, avatar_url, country, is_public, score, peak_score, category, streak, verified_count, best_rank, last_verified_at",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      if (isMissingRelation(error)) return { status: "ok", data: null };
      return fail("fetchBlinkProfile", error.message);
    }
    return { status: "ok", data: data ? mapProfile(data as BlinkProfileRow) : null };
  });
}

export async function updateBlinkProfile(
  userId: string,
  patch: Partial<Pick<BlinkProfile, "handle" | "displayName" | "country" | "avatarUrl" | "isPublic">>,
): Promise<DataResult<null>> {
  if (!isSupabaseConfigured) return fail("updateBlinkProfile", "not configured");

  return safe("updateBlinkProfile", async () => {
    const { error } = await supabase.from("blink_profiles").upsert(
      {
        id: userId,
        ...(patch.handle !== undefined ? { handle: patch.handle } : {}),
        ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
        ...(patch.country !== undefined ? { country: patch.country } : {}),
        ...(patch.avatarUrl !== undefined ? { avatar_url: patch.avatarUrl } : {}),
        ...(patch.isPublic !== undefined ? { is_public: patch.isPublic } : {}),
      },
      { onConflict: "id" },
    );

    if (error) return fail("updateBlinkProfile", error.message);
    return { status: "ok", data: null };
  });
}

// ---------------------------------------------------------------------------
// Score history
// ---------------------------------------------------------------------------

interface ScoreRow {
  id: string;
  created_at: string;
  score: number;
  category: string | null;
  image_hash: string | null;
  verified: boolean;
}

/** Newest-first verified + unverified history for the signed-in user. */
export async function fetchScoreHistory(
  userId: string,
): Promise<DataResult<ScoreEntry[]>> {
  if (!isSupabaseConfigured) return fail("fetchScoreHistory", "not configured");

  return safe("fetchScoreHistory", async () => {
    const { data, error } = await supabase
      .from("score_history")
      .select("id, created_at, score, category, image_hash, verified")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      if (isMissingRelation(error)) return { status: "ok", data: [] };
      return fail("fetchScoreHistory", error.message);
    }

    const entries: ScoreEntry[] = (data ?? []).map((row) => {
      const r = row as ScoreRow;
      return {
        id: r.id,
        createdAt: r.created_at,
        score: r.score,
        category: r.category,
        imageHash: r.image_hash,
        verified: r.verified,
      };
    });

    return { status: "ok", data: entries };
  });
}

export interface RecordedAnalysis {
  /** Whether this upload moved the user's score and rank. */
  check: ProgressionCheck;
  /** The score this analysis produced, counted or not. */
  score: number;
  /** Points gained against the previous verified analysis. */
  delta: number;
}

/**
 * Record an analysis against the user's progression.
 *
 * The verification gate runs before anything is written, and an upload that
 * doesn't qualify is stored with `verified = false` — visible in history, but
 * inert for score, rank and streak.
 */
export async function recordAnalysis(
  userId: string,
  result: AnalysisResult,
  imageBase64: string,
  analysisId?: string,
): Promise<DataResult<RecordedAnalysis>> {
  if (!isSupabaseConfigured) return fail("recordAnalysis", "not configured");

  return safe("recordAnalysis", async () => {
    const history = await fetchScoreHistory(userId);
    if (history.status === "error") return history;

    const imageHash = await hashImage(imageBase64);
    const check = verifyProgression(result, imageHash, history.data);
    const score = computeBlinkScore(result).total;
    const previous = history.data.find((e) => e.verified)?.score ?? null;

    const { error } = await supabase.from("score_history").insert({
      user_id: userId,
      analysis_id: analysisId ?? null,
      score,
      category: result.category?.category ?? null,
      image_hash: imageHash,
      verified: check.counts,
    });

    if (error && !isMissingRelation(error)) return fail("recordAnalysis", error.message);

    return {
      status: "ok",
      data: {
        check,
        score,
        delta: check.counts && previous !== null ? score - previous : 0,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Aggregated stats for the Profile screen
// ---------------------------------------------------------------------------

export interface FullProfile {
  profile: BlinkProfile | null;
  stats: ProfileStats;
  history: ScoreEntry[];
}

export async function fetchFullProfile(
  userId: string,
  rank: number | null = null,
): Promise<DataResult<FullProfile>> {
  const [profileRes, historyRes] = await Promise.all([
    fetchBlinkProfile(userId),
    fetchScoreHistory(userId),
  ]);

  if (profileRes.status === "error") return profileRes;
  if (historyRes.status === "error") return historyRes;

  const profile = profileRes.data;
  const stats = computeProfileStats(
    historyRes.data,
    rank,
    profile?.bestRank ?? rank,
  );

  return {
    status: "ok",
    data: {
      profile,
      // The projection table is authoritative for peak score once it exists,
      // since history is capped at the most recent 200 entries.
      stats: profile ? { ...stats, peakScore: Math.max(stats.peakScore, profile.peakScore) } : stats,
      history: historyRes.data,
    },
  };
}
