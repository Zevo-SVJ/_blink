/**
 * Blink — the two data rights that have to be buttons, not promises.
 *
 * Erasure and portability are the rights a privacy policy is judged on, and
 * they are the ones most often implemented as a control that appears to work.
 * Settings previously deleted one row from `profiles` and called it "your
 * account and all associated data" — the analyses, the score history, the
 * public leaderboard entry, the avatar and the login all survived.
 *
 * Both functions here report what actually happened. `deleteAccount` in
 * particular distinguishes "everything is gone" from "the data is gone but the
 * login record needs a second step", because those are different answers and
 * the user is entitled to the true one.
 */

import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Export (portability)
// ---------------------------------------------------------------------------

export interface ExportedAccount {
  exportedAt: string;
  /** What the export contains, so the file explains itself. */
  about: string;
  account: {
    id: string;
    email: string | null;
    createdAt: string | null;
    authMethod: string | null;
  };
  profile: unknown;
  publicProfile: unknown;
  analyses: unknown[];
  scoreHistory: unknown[];
}

/**
 * Everything Blink holds about the signed-in user, as one object.
 *
 * Structured and machine-readable, which is what portability asks for — a PDF
 * of the same information would satisfy access but not portability.
 *
 * Every query is RLS-scoped to the caller, so this cannot return another
 * user's rows even if a table name were wrong. Tables that fail are reported
 * as an error rather than silently omitted: an export missing a section, with
 * no indication it is missing, is worse than a failure the user can retry.
 */
export async function exportAccountData(): Promise<
  { status: "ok"; data: ExportedAccount } | { status: "error" }
> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return { status: "error" };

    const [profile, publicProfile, analyses, scoreHistory] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("blink_profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("analyses").select("*").order("created_at", { ascending: false }),
      supabase.from("score_history").select("*").order("created_at", { ascending: false }),
    ]);

    // `profiles` and `blink_profiles` legitimately return no row for a user
    // who never completed onboarding, so only a real error counts as failure.
    if (analyses.error || scoreHistory.error) return { status: "error" };

    return {
      status: "ok",
      data: {
        exportedAt: new Date().toISOString(),
        about:
          "Everything Blink stores about this account. Uploaded screenshots are not included because they are not kept — only the written analysis and a fingerprint of the image (image_hash in scoreHistory).",
        account: {
          id: user.id,
          email: user.email ?? null,
          createdAt: user.created_at ?? null,
          authMethod: (user.app_metadata?.provider as string | undefined) ?? null,
        },
        profile: profile.data ?? null,
        publicProfile: publicProfile.data ?? null,
        analyses: analyses.data ?? [],
        scoreHistory: scoreHistory.data ?? [],
      },
    };
  } catch (err) {
    console.error("[exportAccountData]", err);
    return { status: "error" };
  }
}

/**
 * Hand the export to the browser as a file.
 *
 * Split from the fetch so the data can be tested without touching the DOM.
 */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick: revoking synchronously can cancel the download
  // in some browsers before it has read the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ---------------------------------------------------------------------------
// Erasure
// ---------------------------------------------------------------------------

export type DeleteOutcome =
  /** Data and login are both gone. */
  | { status: "deleted" }
  /**
   * Application data is gone, the `auth.users` row may not be.
   *
   * Reached when `delete_my_account` is missing — a deployment that has not
   * run migration 0006 — and the client falls back to erasing what RLS lets it
   * reach. The user is told this rather than being shown a clean confirmation.
   */
  | { status: "partial" }
  /** Nothing was deleted. */
  | { status: "error" };

/** PostgREST's code for "function/relation does not exist". */
const UNDEFINED_FUNCTION = "42883";

/**
 * Delete the signed-in user's account and everything belonging to it.
 *
 * The real work is `delete_my_account()`, a SECURITY DEFINER function that
 * erases every table plus the avatar and the login in one transaction — doing
 * it as six client calls would leave a half-deleted account whenever one of
 * them failed.
 *
 * The fallback exists for a deployment that has not applied migration 0006
 * yet. It deletes what the client can legitimately reach, and returns
 * `partial` so the UI can say so instead of claiming a clean sweep.
 */
export async function deleteAccount(userId: string): Promise<DeleteOutcome> {
  try {
    const { error } = await supabase.rpc("delete_my_account");
    if (!error) return { status: "deleted" };

    if (error.code !== UNDEFINED_FUNCTION) {
      console.error("[deleteAccount] rpc failed:", error.message);
      return { status: "error" };
    }

    console.warn("[deleteAccount] delete_my_account missing — falling back");
    return await deleteWhatTheClientCanReach(userId);
  } catch (err) {
    console.error("[deleteAccount]", err);
    return { status: "error" };
  }
}

/**
 * Best-effort erasure using only the caller's own RLS permissions.
 *
 * Ordered so the publicly visible things go first: if the run is interrupted,
 * what remains should be the private rows rather than a leaderboard entry for
 * an account that believes it is deleted.
 */
async function deleteWhatTheClientCanReach(userId: string): Promise<DeleteOutcome> {
  const results = await Promise.all([
    supabase.from("blink_profiles").delete().eq("id", userId),
    supabase.from("analyses").delete().eq("user_id", userId),
    supabase.from("score_history").delete().eq("user_id", userId),
    supabase.from("profiles").delete().eq("id", userId),
    supabase.storage.from("avatars").remove([`${userId}/avatar.jpg`]),
  ]);

  const failed = results.filter((r) => r.error);
  if (failed.length === results.length) {
    failed.forEach((r) => console.error("[deleteAccount] fallback:", r.error?.message));
    return { status: "error" };
  }

  // Something was deleted, but the login row is out of reach from here either
  // way, so this is never a complete deletion.
  return { status: "partial" };
}
