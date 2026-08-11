/**
 * Blink — the profiles you have analysed.
 *
 * ## Registered, not published
 *
 * Every analysis of somebody else's profile is already a record of that
 * person: `analyses` stores the analysing user, the score, the category and
 * the full result — which carries the handle the model read off the
 * screenshot. So a person who has been analysed is *already* in the system;
 * what was missing was anywhere to see them.
 *
 * That is what this reads. It is deliberately **not** the public leaderboard:
 *
 *  - `analyses` is self-read only under RLS, so these rows are visible to the
 *    person who ran the analysis and to nobody else;
 *  - nothing here writes `is_public`, creates a `blink_profiles` row, or
 *    otherwise puts a stranger on a board they never opted into.
 *
 * Publishing stays exactly where it was: a profile becomes public when its
 * owner signs in and opts in. Being analysed registers someone in Ranks; it
 * does not publish them.
 *
 * ## Why no new table
 *
 * A `ranked_profiles` table was the obvious design, and it would have
 * duplicated three columns that `analyses` already holds, with a second write
 * on every analysis to keep them in step. The handle, the category and the
 * score are all in the row that already exists. Deriving is cheaper and cannot
 * drift.
 */

import { normaliseCategory } from "@/lib/categories";
import type { DataResult } from "@/lib/blink-profile";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface AnalyzedProfile {
  /** Instagram handle, as read off the screenshot by the analysis. */
  handle: string;
  /** Always a canonical Ranks category, or null. Never a model invention. */
  category: string | null;
  /** 0-1000 Blink Score, from the most recent analysis of this handle. */
  score: number;
  /** How many times this profile has been analysed by this user. */
  runs: number;
  /** ISO timestamp of the most recent analysis. */
  lastAnalyzedAt: string;
  /** The analysis to open when the row is tapped. */
  analysisId: string;
}

const UNREACHABLE =
  "Blink can't load the profiles you've analyzed right now. Check your connection and try again.";

/** The 0-10 model score scaled to the 0-1000 board scale. */
function toBoardScore(raw: unknown): number {
  const n = typeof raw === "number" ? raw : 0;
  // `overall_score` is 0-10; the leaderboard speaks in hundreds.
  return Math.max(0, Math.min(1000, Math.round(n * 100)));
}

/**
 * Profiles this user has analysed, most recently analysed first.
 *
 * Deduplicated by handle: re-analysing the same person updates their row
 * rather than adding a second one, which is what stops the list filling with
 * the same face. `runs` records how many times it has been read.
 */
export async function fetchAnalyzedProfiles(
  userId: string,
  limit = 100,
): Promise<DataResult<AnalyzedProfile[]>> {
  if (!isSupabaseConfigured) return { status: "error", message: UNREACHABLE };

  try {
    const { data, error } = await supabase
      .from("analyses")
      .select("id, created_at, ownership, overall_score, category, result")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[fetchAnalyzedProfiles]", error.message);
      return { status: "error", message: UNREACHABLE };
    }

    const byHandle = new Map<string, AnalyzedProfile>();

    for (const row of data ?? []) {
      const result = (row.result ?? {}) as Record<string, unknown>;

      // Only profiles that belong to somebody else. The user's own analyses
      // are their score, not a person they looked up, and they already have a
      // place on the board and in Profile.
      if (row.ownership === "own") continue;

      const rawHandle = typeof result.handle === "string" ? result.handle.trim() : "";
      // No handle means the model could not read one off the screenshot.
      // There is nothing to register a person under, so the row is skipped
      // rather than shown as "unknown".
      if (!rawHandle) continue;
      const handle = rawHandle.replace(/^@/, "").toLowerCase();
      if (!handle) continue;

      const categoryInfo = (row.category ?? (result.category as unknown)) as
        | { category?: string | null }
        | null;

      const existing = byHandle.get(handle);
      if (existing) {
        // Rows arrive newest-first, so the first one seen is the current
        // reading; later ones only add to the count.
        existing.runs += 1;
        continue;
      }

      byHandle.set(handle, {
        handle,
        category: normaliseCategory(categoryInfo?.category),
        score: toBoardScore(row.overall_score),
        runs: 1,
        lastAnalyzedAt: row.created_at as string,
        analysisId: row.id as string,
      });
    }

    return { status: "ok", data: [...byHandle.values()] };
  } catch (err) {
    console.error("[fetchAnalyzedProfiles]", err);
    return { status: "error", message: UNREACHABLE };
  }
}

/** Canonical categories actually represented, for the picker. */
export function analyzedCategories(profiles: AnalyzedProfile[]): string[] {
  return [...new Set(profiles.map((p) => p.category).filter((c): c is string => !!c))];
}

/** Highest score first, then most recently analysed — the board's own order. */
export function rankAnalyzed(
  profiles: AnalyzedProfile[],
  category: string | null,
): AnalyzedProfile[] {
  return profiles
    .filter((p) => !category || p.category === category)
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.lastAnalyzedAt).getTime() - new Date(a.lastAnalyzedAt).getTime(),
    );
}
