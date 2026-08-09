/**
 * Blink — leaderboards.
 *
 * Standings are ordered by Blink Score alone. Follower count, reach and
 * verification status are not columns in this system, so they cannot influence
 * a position: a 200-follower account with a coherent profile sits above a
 * celebrity with a muddled one whenever its score says so.
 */

import { type DataResult } from "@/lib/blink-profile";
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
    return await run();
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
      if (isMissingRelation(error)) return { status: "ok", data: null };
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
  blink_profiles: { handle: string | null; display_name: string | null } | null;
}

export async function fetchWeeklyWinners(): Promise<DataResult<WeeklyWinner[]>> {
  if (!isSupabaseConfigured) return { status: "error", message: UNREACHABLE };

  return safe("fetchWeeklyWinners", async () => {
    const { data, error } = await supabase
      .from("weekly_winners")
      .select(
        "id, week_start, category, user_id, score, improvement, blink_profiles(handle, display_name)",
      )
      .order("week_start", { ascending: false })
      .limit(24);

    if (error) {
      if (isMissingRelation(error)) return { status: "ok", data: [] };
      console.error("[fetchWeeklyWinners]", error.message);
      return { status: "error", message: UNREACHABLE };
    }

    return {
      status: "ok",
      data: (data ?? []).map((row) => {
      const r = row as unknown as WinnerRow;
      return {
        id: r.id,
        weekStart: r.week_start,
        category: r.category,
        userId: r.user_id,
        handle: r.blink_profiles?.handle ?? null,
        displayName: r.blink_profiles?.display_name ?? null,
        score: r.score ?? 0,
        improvement: r.improvement ?? 0,
      };
      }),
    };
  });
}
