/**
 * Blink — leaderboards.
 *
 * Standings are ordered by Blink Score alone. Follower count, reach and
 * verification status are not columns in this system, so they cannot influence
 * a position: a 200-follower account with a coherent profile sits above a
 * celebrity with a muddled one whenever its score says so.
 */

import { type DataResult } from "@/lib/blink-profile";
import { withReadCeiling } from "@/lib/read-ceiling";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface LeaderboardEntry {
  id: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  /** ISO 3166-1 alpha-2, uppercase. */
  country: string | null;
  /** Optional. Absent means no "View Instagram" button. */
  instagramUrl: string | null;
  score: number;
  peakScore: number;
  category: string | null;
  streak: number;
  verifiedCount: number;
  rank: number;
  categoryRank: number;
  /** Places gained (+) or lost (−) since the previous snapshot, when known. */
  movement: number | null;
}

interface LeaderboardRow {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country?: string | null;
  /** Added in migration 0004 — absent on older schemas. */
  instagram_url?: string | null;
  score: number | null;
  peak_score: number | null;
  category: string | null;
  streak: number | null;
  verified_count: number | null;
  rank: number | null;
  category_rank: number | null;
  /** Added in migration 0003 — absent on older schemas. */
  movement?: number | null;
}

/**
 * `*` rather than an explicit column list.
 *
 * The view gains columns across migrations (country, instagram_url, movement),
 * and naming one the deployed view doesn't have yet fails the entire query —
 * which would blank the leaderboard instead of just omitting a flag.
 */
const SELECT = "*";

const UNREACHABLE =
  "Blink can't load the leaderboard right now. Check your connection and try again.";

function isMissingRelation(error: { code?: string } | null): boolean {
  return error?.code === "42P01";
}

/**
 * A malformed id — the `:id` segment of a hand-edited or truncated profile
 * URL — is not a failure to reach the database. Postgres rejects it at parse
 * time (`22P02`, invalid_text_representation) before any row is considered.
 *
 * Reporting that as an error left the page on "check your connection" with a
 * Retry button that could never succeed, because retrying sends the same
 * invalid id. It is a lookup that found nothing, and it reads as one.
 */
function isMalformedId(error: { code?: string } | null): boolean {
  return error?.code === "22P02";
}

/**
 * Convert a *thrown* query failure into an error result.
 *
 * supabase-js rejects when the request never reaches the server, and an
 * unhandled rejection here would leave the board on its loading skeleton
 * permanently rather than offering a retry.
 */
async function safe<T>(
  context: string,
  run: () => Promise<DataResult<T>>,
): Promise<DataResult<T>> {
  try {
    // Same ceiling as every other read — see `withReadCeiling`. Without it
    // this wrapper was where the twenty-second wait actually lived.
    return await withReadCeiling(context, run());
  } catch (err) {
    console.error(`[${context}]`, err);
    return { status: "error", message: UNREACHABLE };
  }
}

function mapEntry(row: LeaderboardRow): LeaderboardEntry {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    country: row.country ?? null,
    instagramUrl: row.instagram_url ?? null,
    score: row.score ?? 0,
    peakScore: row.peak_score ?? 0,
    category: row.category,
    streak: row.streak ?? 0,
    verifiedCount: row.verified_count ?? 0,
    rank: row.rank ?? 0,
    categoryRank: row.category_rank ?? 0,
    // Null until the first rank snapshot exists — never defaulted to 0, which
    // would read as "held position" when we simply don't know yet.
    movement: row.movement ?? null,
  };
}

/**
 * Global standings, or one category's standings when `category` is given.
 *
 * A missing view means the ranking migration hasn't run yet — that reads as an
 * empty board rather than an error, so the UI shows its empty state.
 */
export async function fetchLeaderboard(
  category: string | null = null,
  limit = 50,
): Promise<DataResult<LeaderboardEntry[]>> {
  if (!isSupabaseConfigured) {
    return { status: "error", message: UNREACHABLE };
  }

  return safe("fetchLeaderboard", async () => {
    let query = supabase.from("leaderboard").select(SELECT);
    if (category) query = query.eq("category", category);

    const { data, error } = await query
      .order(category ? "category_rank" : "rank", { ascending: true })
      .limit(limit);

    if (error) {
      if (isMissingRelation(error)) return { status: "ok", data: [] };
      console.error("[fetchLeaderboard]", error.message);
      return { status: "error", message: UNREACHABLE };
    }

    return {
      status: "ok",
      data: (data ?? []).map((row) => mapEntry(row as LeaderboardRow)),
    };
  });
}

/** The signed-in user's own standing, even when outside the visible page. */
export async function fetchMyStanding(
  userId: string,
): Promise<DataResult<LeaderboardEntry | null>> {
  if (!isSupabaseConfigured) {
    return { status: "error", message: UNREACHABLE };
  }

  return safe("fetchMyStanding", async () => {
    const { data, error } = await supabase
      .from("leaderboard")
      .select(SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      if (isMissingRelation(error)) return { status: "ok", data: null };
      console.error("[fetchMyStanding]", error.message);
      return { status: "error", message: UNREACHABLE };
    }

    return { status: "ok", data: data ? mapEntry(data as LeaderboardRow) : null };
  });
}

/**
 * Anyone's public standing by id.
 *
 * Reads the `leaderboard` view, which already excludes private profiles and
 * those without a verified analysis — so visibility is enforced by the query
 * rather than by a check the caller could forget. A hidden profile simply
 * returns null.
 */
export async function fetchPublicStanding(
  userId: string,
): Promise<DataResult<LeaderboardEntry | null>> {
  if (!isSupabaseConfigured) return { status: "error", message: UNREACHABLE };

  return safe("fetchPublicStanding", async () => {
    const { data, error } = await supabase
      .from("leaderboard")
      .select(SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      if (isMissingRelation(error) || isMalformedId(error)) {
        return { status: "ok", data: null };
      }
      console.error("[fetchPublicStanding]", error.message);
      return { status: "error", message: UNREACHABLE };
    }

    return { status: "ok", data: data ? mapEntry(data as LeaderboardRow) : null };
  });
}

/**
 * Where a given Blink Score would sit on the public board.
 *
 * Used for third-party analyses: the subject isn't a Blink user and has no row
 * of their own, but the score still has a meaningful position, which is the
 * "leaderboard position" a public read shows.
 *
 * Counts rather than fetches rows, so it stays cheap as the board grows.
 */
export async function fetchScoreStanding(
  score: number,
): Promise<DataResult<{ rank: number; total: number } | null>> {
  if (!isSupabaseConfigured) return { status: "error", message: UNREACHABLE };

  return safe("fetchScoreStanding", async () => {
    const [ahead, all] = await Promise.all([
      supabase
        .from("leaderboard")
        .select("id", { count: "exact", head: true })
        .gt("score", score),
      supabase.from("leaderboard").select("id", { count: "exact", head: true }),
    ]);

    if (ahead.error || all.error) {
      const error = ahead.error ?? all.error;
      if (isMissingRelation(error)) return { status: "ok", data: null };
      console.error("[fetchScoreStanding]", error?.message);
      return { status: "error", message: UNREACHABLE };
    }

    const total = all.count ?? 0;
    if (total === 0) return { status: "ok", data: null };

    return { status: "ok", data: { rank: (ahead.count ?? 0) + 1, total } };
  });
}

/** Distinct categories that currently have ranked profiles. */
export async function fetchCategories(): Promise<DataResult<string[]>> {
  if (!isSupabaseConfigured) return { status: "error", message: UNREACHABLE };

  return safe("fetchCategories", async () => {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("category")
      .not("category", "is", null)
      .limit(500);

    if (error) {
      if (isMissingRelation(error)) return { status: "ok", data: [] };
      console.error("[fetchCategories]", error.message);
      return { status: "error", message: UNREACHABLE };
    }

    const unique = Array.from(
      new Set((data ?? []).map((r) => (r as { category: string | null }).category).filter(Boolean)),
    ) as string[];

    return { status: "ok", data: unique.sort() };
  });
}

// ---------------------------------------------------------------------------
// Weekly winners
// ---------------------------------------------------------------------------

export interface WeeklyWinner {
  id: string;
  weekStart: string;
  /** null for the overall winner of the week. */
  category: string | null;
  userId: string;
  handle: string | null;
  displayName: string | null;
  score: number;
  /** Points gained that week — winning means improving most, not scoring most. */
  improvement: number;
}

interface WinnerRow {
  id: string;
  week_start: string;
  category: string | null;
  user_id: string;
  score: number | null;
  improvement: number | null;
}

/**
 * The weekly winners, with the names attached.
 *
 * **Why this is two queries.** It used to ask PostgREST to embed
 * `blink_profiles(handle, display_name)` in one go, which needs a foreign key
 * between the two tables for PostgREST to resolve the relationship. There
 * isn't one: `weekly_winners.user_id` references `auth.users`, not
 * `blink_profiles`. The request came back
 * `400 Could not find a relationship … in the schema cache`, so the Winners
 * tab was empty on a correctly-migrated database.
 *
 * Fetching the rows and their names separately works whatever the foreign
 * keys happen to be, and adding one would not have been enough on its own —
 * PostgREST caches its schema, so the fix would have depended on a cache
 * reload nobody would remember to trigger. Two round trips for at most 24 rows
 * is not a cost worth optimising against that.
 *
 * Names are best-effort: a winner whose profile row is missing or private
 * still appears, as "Anonymous", rather than disappearing from the board.
 */
export async function fetchWeeklyWinners(): Promise<DataResult<WeeklyWinner[]>> {
  if (!isSupabaseConfigured) return { status: "error", message: UNREACHABLE };

  return safe("fetchWeeklyWinners", async () => {
    const { data, error } = await supabase
      .from("weekly_winners")
      .select("id, week_start, category, user_id, score, improvement")
      .order("week_start", { ascending: false })
      .limit(24);

    if (error) {
      if (isMissingRelation(error)) return { status: "ok", data: [] };
      console.error("[fetchWeeklyWinners]", error.message);
      return { status: "error", message: UNREACHABLE };
    }

    const rows = (data ?? []) as WinnerRow[];
    if (rows.length === 0) return { status: "ok", data: [] };

    // Names, in one lookup. A failure here costs the names, not the board.
    const names = new Map<string, { handle: string | null; displayName: string | null }>();
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profiles, error: profileError } = await supabase
      .from("blink_profiles")
      .select("id, handle, display_name")
      .in("id", ids);

    if (profileError) {
      console.error("[fetchWeeklyWinners] names unavailable:", profileError.message);
    } else {
      for (const row of (profiles ?? []) as Array<{
        id: string;
        handle: string | null;
        display_name: string | null;
      }>) {
        names.set(row.id, { handle: row.handle, displayName: row.display_name });
      }
    }

    return {
      status: "ok",
      data: rows.map((r) => ({
        id: r.id,
        weekStart: r.week_start,
        category: r.category,
        userId: r.user_id,
        handle: names.get(r.user_id)?.handle ?? null,
        displayName: names.get(r.user_id)?.displayName ?? null,
        score: r.score ?? 0,
        improvement: r.improvement ?? 0,
      })),
    };
  });
}
