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

/**
 * True when Postgres/PostgREST rejected a column this build knows about but the
 * database doesn't yet.
 *
 * The app and its migrations deploy separately, so a build can legitimately be
 * ahead of the schema for a while. Treating that as "can't reach your account"
 * is both wrong and unrecoverable for the user — the fix below is to retry with
 * the columns that definitely exist rather than fail the whole screen.
 *
 * 42703 = undefined_column (reads). PGRST204 = column not in schema cache
 * (writes).
 */
export function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    /column .* does not exist|could not find the '.*' column/i.test(error?.message ?? "")
  );
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
  /** Optional. Drives whether a "View Instagram" button is shown at all. */
  instagramUrl: string | null;
  /** Null until the user finishes onboarding. */
  onboardedAt: string | null;
  isPublic: boolean;
  score: number;
  peakScore: number;
  category: string | null;
  streak: number;
  verifiedCount: number;
  bestRank: number | null;
  lastVerifiedAt: string | null;
}

/** Stand-in timestamp when the schema can't tell us the real one. */
const EPOCH = "1970-01-01T00:00:00.000Z";

interface BlinkProfileRow {
  id: string;
  created_at?: string | null;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  /** Added in migration 0004 — absent on older schemas. */
  instagram_url?: string | null;
  /** Added in migration 0004 — absent on older schemas. */
  onboarded_at?: string | null;
  is_public: boolean | null;
  score: number | null;
  peak_score: number | null;
  category: string | null;
  streak: number | null;
  verified_count: number | null;
  best_rank: number | null;
  last_verified_at: string | null;
}

/**
 * When onboarding was completed.
 *
 * The column arrives in migration 0004. Without it we infer completion from a
 * handle and display name both being set, since those are only ever written by
 * finishing onboarding — otherwise a build ahead of the schema would trap the
 * user in the flow forever, re-asking questions they already answered.
 */
export function resolveOnboardedAt(row: {
  onboarded_at?: string | null;
  handle: string | null;
  display_name: string | null;
  created_at?: string | null;
}): string | null {
  if (row.onboarded_at) return row.onboarded_at;
  if (row.handle && row.display_name) return row.created_at ?? EPOCH;
  return null;
}

function mapProfile(row: BlinkProfileRow): BlinkProfile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    country: row.country,
    instagramUrl: row.instagram_url ?? null,
    onboardedAt: resolveOnboardedAt(row),
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
    // `*` rather than an explicit list: the identity columns arrive in a later
    // migration, and naming one that doesn't exist yet fails the whole read.
    const { data, error } = await supabase
      .from("blink_profiles")
      .select("*")
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
  patch: Partial<
    Pick<
      BlinkProfile,
      "handle" | "displayName" | "country" | "avatarUrl" | "instagramUrl" | "isPublic"
    >
  > & { markOnboarded?: boolean },
): Promise<DataResult<null>> {
  if (!isSupabaseConfigured) return fail("updateBlinkProfile", "not configured");

  return safe("updateBlinkProfile", async () => {
    /** Columns present since migration 0003 — always safe to write. */
    const base: Record<string, unknown> = {
      id: userId,
      ...(patch.handle !== undefined ? { handle: patch.handle } : {}),
      ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.avatarUrl !== undefined ? { avatar_url: patch.avatarUrl } : {}),
      ...(patch.isPublic !== undefined ? { is_public: patch.isPublic } : {}),
    };

    /** Columns that only exist once migration 0004 has run. */
    const extended: Record<string, unknown> = {
      ...(patch.instagramUrl !== undefined ? { instagram_url: patch.instagramUrl } : {}),
      ...(patch.markOnboarded ? { onboarded_at: new Date().toISOString() } : {}),
    };

    const write = (payload: Record<string, unknown>) =>
      supabase.from("blink_profiles").upsert(payload, { onConflict: "id" });

    const { error } = await write({ ...base, ...extended });
    if (!error) return { status: "ok", data: null };

    // The build can be ahead of the schema. Saving the identity the user just
    // typed matters far more than the two optional columns, so drop them and
    // retry rather than losing their input to a migration they can't run.
    if (isMissingColumn(error) && Object.keys(extended).length > 0) {
      console.warn(
        "[updateBlinkProfile] schema is missing migration 0004 columns — saving without them",
      );
      const retry = await write(base);
      if (!retry.error) return { status: "ok", data: null };
      return fail("updateBlinkProfile", retry.error.message);
    }

    return fail("updateBlinkProfile", error.message);
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
