/**
 * Blink — suggesting someone for the leaderboard.
 *
 * A suggestion is **not an analysis**. Nothing here calls the `analyze` edge
 * function, spends a credit, or produces a score. It records that a user
 * thinks a given handle belongs on the board; curation happens separately.
 *
 * ## Schema tolerance
 *
 * The `leaderboard_suggestions` table ships in migration 0005, which has to be
 * applied by hand in the Supabase SQL editor. Until it is, PostgREST answers
 * `42P01` (undefined relation) and this module reports `needs-setup` rather
 * than a generic failure — so the UI can say something true instead of
 * "something went wrong", and the flow can be exercised end to end before the
 * table exists.
 *
 * That mirrors how `blink-profile.ts` already tolerates the unapplied
 * migration 0004, and it is the reason the feature is shippable ahead of the
 * schema rather than blocked behind it.
 */

import { normaliseCategory } from "@/lib/categories";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type SuggestionResult =
  | { status: "ok" }
  /** The table isn't there yet. Not the user's problem — don't blame them. */
  | { status: "needs-setup" }
  | { status: "duplicate" }
  | { status: "error"; message: string };

const UNREACHABLE = "Blink couldn't reach the leaderboard. Check your connection and try again.";

/** Undefined relation — migration 0005 hasn't been applied. */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  return (
    error?.code === "42P01" ||
    /relation .*leaderboard_suggestions.* does not exist/i.test(error?.message ?? "")
  );
}

/** Unique violation — the same person has already suggested this handle. */
function isDuplicate(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export interface Suggestion {
  /** Lowercase, no leading @. */
  handle: string;
  /**
   * Which board this person belongs on.
   *
   * Always a canonical id — the picker only offers real categories and this is
   * canonicalised again on the way in, so a value that is not a board cannot
   * be stored. Null only when the suggester genuinely did not say.
   */
  category?: string | null;
  /** Why this profile belongs on the board. Optional, free text. */
  note?: string;
  /** Storage path of the uploaded screenshot, when one was kept. */
  evidencePath?: string | null;
  /** How the handle was obtained, so curation can weight it. */
  source: "detected" | "typed";
}

/** Undefined column — migration 0007 hasn't been applied. */
function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  return (
    error?.code === "42703" ||
    /column .*category.* does not exist/i.test(error?.message ?? "")
  );
}

/**
 * Normalise whatever the user gave us into a storable handle.
 *
 * Accepts a bare handle, an `@handle`, or a full profile URL, because people
 * paste all three. Returns null when it isn't a plausible Instagram handle.
 */
export function normaliseHandle(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // instagram.com/name, with or without scheme, query or trailing slash.
  const fromUrl = trimmed.match(/(?:instagram\.com|instagr\.am)\/+([^/?#]+)/);
  const candidate = (fromUrl ? fromUrl[1] : trimmed).replace(/^@/, "").replace(/\/+$/, "");

  if (!/^[a-z0-9](?:[a-z0-9._]{0,28}[a-z0-9])?$/.test(candidate)) return null;
  return candidate;
}

export async function suggestProfile(
  suggestion: Suggestion,
  userId: string | null,
): Promise<SuggestionResult> {
  if (!isSupabaseConfigured) return { status: "needs-setup" };

  try {
    const base = {
      handle: suggestion.handle,
      note: suggestion.note?.trim() || null,
      evidence_path: suggestion.evidencePath ?? null,
      source: suggestion.source,
      suggested_by: userId,
    };

    // Only ever a real board, never whatever text arrived.
    const category = normaliseCategory(suggestion.category);

    let { error } = await supabase
      .from("leaderboard_suggestions")
      .insert({ ...base, category });

    // Migration 0007 adds the column. Before it runs, PostgREST rejects the
    // whole insert for one unknown field — so retry without it rather than
    // failing an action the user completed correctly. The category is lost,
    // the suggestion is not.
    if (error && isMissingColumn(error)) {
      console.warn("[suggestProfile] category column missing — apply migration 0007");
      ({ error } = await supabase.from("leaderboard_suggestions").insert(base));
    }

    if (error) {
      if (isMissingTable(error)) return { status: "needs-setup" };
      if (isDuplicate(error)) return { status: "duplicate" };
      console.error("[suggestProfile]", error.message);
      return { status: "error", message: UNREACHABLE };
    }

    return { status: "ok" };
  } catch (err) {
    console.error("[suggestProfile]", err);
    return { status: "error", message: UNREACHABLE };
  }
}

/** A suggestion this user made, waiting to be analysed. */
export interface PendingSuggestion {
  handle: string;
  createdAt: string;
  /** Canonical board, or null. Never a raw value. */
  category: string | null;
}

/**
 * Suggestions this user has made.
 *
 * RLS on `leaderboard_suggestions` is "authors can see their own", so this
 * returns only the caller's rows. It exists so that suggesting somebody is not
 * a dead end: the sheet used to confirm and then the person vanished, with
 * nowhere to see that anything had happened.
 *
 * A suggestion is not a ranking. There is no score until the profile has
 * actually been analysed, so these are listed separately as pending rather
 * than mixed into the board with an invented number.
 */
export async function fetchMySuggestions(
  userId: string,
): Promise<{ status: "ok"; data: PendingSuggestion[] } | { status: "error" }> {
  if (!isSupabaseConfigured) return { status: "ok", data: [] };
  try {
    // `select` has to come first in the builder chain, so the column list is
    // the parameter rather than the tail.
    const query = (columns: string) =>
      supabase
        .from("leaderboard_suggestions")
        .select(columns)
        .eq("suggested_by", userId)
        .order("created_at", { ascending: false })
        .limit(50);

    let { data, error } = await query("handle, created_at, category");

    // Same tolerance as the insert path: before migration 0007 the column is
    // not there, and asking for it fails the whole select.
    if (error && isMissingColumn(error)) {
      ({ data, error } = await query("handle, created_at"));
    }

    // A missing table means the migration hasn't been applied; that is a
    // dormant feature, not an error worth showing anyone.
    if (error) return error.code === "42P01" ? { status: "ok", data: [] } : { status: "error" };

    return {
      status: "ok",
      // A dynamic column list means the client cannot infer the row shape, so
      // it is narrowed here — the three fields are all this function returns.
      data: ((data ?? []) as unknown as Array<{
        handle: string;
        created_at: string;
        category?: string | null;
      }>).map((r) => ({
        handle: String(r.handle),
        createdAt: String(r.created_at),
        category: normaliseCategory(r.category ?? null),
      })),
    };
  } catch {
    return { status: "error" };
  }
}
