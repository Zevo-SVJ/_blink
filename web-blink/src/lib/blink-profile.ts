/**
 * Blink — profile & progression data access.
 *
 * Every call returns a discriminated result instead of throwing, so screens
 * can render a real error state rather than an empty one when the backend is
 * unreachable or the ranking tables haven't been migrated yet.
 */

import type { AnalysisResult } from "@/lib/analysis";
import { normaliseCategory } from "@/lib/categories";
import {
  computeBlinkScore,
  computeProfileStats,
  hashImage,
  verifyProgression,
  type ProfileStats,
  type ProgressionCheck,
  type ScoreEntry,
} from "@/lib/ranking";
import { withReadCeiling } from "@/lib/read-ceiling";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type DataResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

/**
 * Turn a PostgREST/Postgres error into a message the user can act on.
 *
 * The previous version returned a generic "can't reach your account" for every
 * failure, which hid the real cause — a taken handle read as a network
 * outage, a check-constraint violation read as a server outage, and an RLS
 * rejection read as a connection problem. Each of those has a different fix,
 * so each needs its own message.
 */
export function describeError(error: {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}): string {
  const code = error.code ?? "";
  const msg = error.message ?? "";

  // 23505 — unique_violation. The most common: handle already taken.
  if (code === "23505" && /handle/i.test(msg)) {
    return "That Instagram username is already taken. Try a different one.";
  }
  if (code === "23505") {
    return "That username is already taken. Try a different one.";
  }

  // 23514 — check_violation. Country format, handle format, instagram_url format.
  if (code === "23514") {
    if (/country/i.test(msg)) return "Pick a country from the list.";
    if (/instagram_url/i.test(msg)) return "That doesn't look like an Instagram profile link.";
    if (/handle/i.test(msg)) return "Usernames can only use letters, numbers, dots and underscores.";
    return "One of the fields has an invalid value. Check and try again.";
  }

  // 42501 — RLS rejection. Means the session doesn't match the row's owner.
  if (code === "42501" || /row-level security/i.test(msg)) {
    return "Your session has expired. Sign out and back in, then try again.";
  }

  // PGRST204 — column not in PostgREST schema cache (stale cache after migration).
  if (code === "PGRST204" || /could not find the .* column/i.test(msg)) {
    return "Blink is updating. Please refresh the page and try again.";
  }

  // 42P01 — table doesn't exist (migration not applied).
  if (code === "42P01") {
    return "Blink is setting up. Please try again in a moment.";
  }

  // Network / CORS / fetch failures.
  if (/failed to fetch|network|cors/i.test(msg)) {
    return "Blink can't reach the server. Check your connection and try again.";
  }

  // Fallback — still more useful than the old generic message because it
  // includes the Postgres code for debugging via console.error.
  return `Blink couldn't save your profile${code ? ` (error ${code})` : ""}. Please try again.`;
}

function fail<T>(context: string, detail: unknown): DataResult<T> {
  console.error(`[${context}]`, detail);
  const message =
    detail && typeof detail === "object" && "code" in detail
      ? describeError(detail as Parameters<typeof describeError>[0])
      : "Blink couldn't save your profile. Please try again.";
  return { status: "error", message };
}

/**
 * Run a read, and never let it hang.
 *
 * The ceiling is not defensive dressing. With the backend unreachable, Home
 * and Profile sat on a pulsing skeleton for the better part of twenty seconds
 * — supabase-js retries a token refresh with backoff before the query is even
 * issued, and every read queued behind it waits with it. Twenty seconds of
 * skeleton has stopped reading as "nearly there" and started reading as
 * "broken", and there is no way for the reader to tell which.
 *
 * It also catches the case this wrapper originally existed for: supabase-js
 * rejects rather than resolving `{ error }` when a request never reaches the
 * server at all — DNS failure, offline, CORS — and without this that rejection
 * escapes the caller's `await` and the screen's `setLoad` never runs.
 *
 * Either way the caller gets the one shape it already handles, and every screen
 * reaches a state it can render.
 */
async function safe<T>(context: string, run: () => Promise<DataResult<T>>): Promise<DataResult<T>> {
  try {
    return await withReadCeiling(context, run());
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
      return fail("fetchBlinkProfile", error);
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
    const payload: Record<string, unknown> = {
      id: userId,
      ...(patch.handle !== undefined ? { handle: patch.handle } : {}),
      ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.avatarUrl !== undefined ? { avatar_url: patch.avatarUrl } : {}),
      ...(patch.isPublic !== undefined ? { is_public: patch.isPublic } : {}),
      ...(patch.instagramUrl !== undefined ? { instagram_url: patch.instagramUrl } : {}),
      ...(patch.markOnboarded ? { onboarded_at: new Date().toISOString() } : {}),
    };

    // UPDATE-then-INSERT instead of UPSERT.
    //
    // UPSERT (INSERT ... ON CONFLICT (id) DO UPDATE) always tries INSERT
    // first. The `handle` column has a UNIQUE constraint (migration 0002), so
    // if another user already has the same handle, the INSERT fails with
    // 23505 unique_violation BEFORE the ON CONFLICT (id) clause can redirect
    // to an UPDATE — and the error is on `handle`, not `id`, so the conflict
    // target doesn't match anyway.
    //
    // UPDATE-first never touches the unique constraint: it matches on `id`
    // only. INSERT only runs when no row exists, which is the only time a
    // handle conflict can genuinely occur — and that gets a clear message.

    const { data: updated, error: updateError } = await supabase
      .from("blink_profiles")
      .update(payload)
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      // If the error is a missing column (stale schema cache), retry without
      // the extended columns — but still surface the real error if the retry
      // also fails, instead of hiding it behind a generic message.
      if (isMissingColumn(updateError)) {
        console.warn("[updateBlinkProfile] schema missing extended columns — retrying with base");
        const { id: _id, onboarded_at: _oa, instagram_url: _iu, ...basePayload } = payload;
        void _id; void _oa; void _iu;
        const { data: retryUpdated, error: retryError } = await supabase
          .from("blink_profiles")
          .update(basePayload)
          .eq("id", userId)
          .select("id")
          .maybeSingle();
        if (retryError) return fail("updateBlinkProfile", retryError);
        if (retryUpdated) return { status: "ok", data: null };
        // No row existed — fall through to INSERT with base payload.
        const { error: insertError } = await supabase
          .from("blink_profiles")
          .insert(basePayload);
        if (insertError) return fail("updateBlinkProfile", insertError);
        return { status: "ok", data: null };
      }
      return fail("updateBlinkProfile", updateError);
    }

    if (updated) {
      return { status: "ok", data: null };
    }

    // No row was updated — this is a new user. INSERT now.
    const { error: insertError } = await supabase
      .from("blink_profiles")
      .insert(payload);

    if (insertError) {
      // Stale schema cache — retry without extended columns.
      if (isMissingColumn(insertError)) {
        console.warn("[updateBlinkProfile] INSERT failed on extended columns — retrying with base");
        const { onboarded_at: _oa, instagram_url: _iu, ...basePayload } = payload;
        void _oa; void _iu;
        const { error: baseInsertError } = await supabase
          .from("blink_profiles")
          .insert(basePayload);
        if (baseInsertError) return fail("updateBlinkProfile", baseInsertError);
        return { status: "ok", data: null };
      }
      return fail("updateBlinkProfile", insertError);
    }

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
      return fail("fetchScoreHistory", error);
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
      // Folded to a canonical Ranks category on the way in, so a profile can
      // never be stored under a board that does not exist.
      category: normaliseCategory(result.category?.category),
      image_hash: imageHash,
      verified: check.counts,
    });

    if (error && !isMissingRelation(error)) return fail("recordAnalysis", error);

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

/**
 * Fill in a rank that arrived separately.
 *
 * Home and Profile need two independent reads: the standing, and the profile
 * with its history. They used to run in sequence purely because
 * `fetchFullProfile` takes the rank as an argument — so every visit waited for
 * one round trip before starting the other, and with the backend unreachable
 * the two eight-second ceilings stacked into sixteen seconds of skeleton.
 *
 * They now run together and the rank is folded in here. It only ever set these
 * two fields, and the `bestRank ?? rank` precedence is preserved exactly.
 */
export function withRank(full: FullProfile, rank: number | null): FullProfile {
  return {
    ...full,
    stats: {
      ...full.stats,
      rank,
      bestRank: full.profile?.bestRank ?? rank,
    },
  };
}
