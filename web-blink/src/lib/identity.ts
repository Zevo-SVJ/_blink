/**
 * Blink — public identity validation.
 *
 * Kept apart from the form component so the rules can be unit-tested and
 * reused without importing React.
 */

export interface IdentityDraft {
  displayName: string;
  handle: string;
  instagramUrl: string;
  country: string;
  avatarUrl: string | null;
  isPublic: boolean;
}

export const HANDLE_PATTERN = /^[A-Za-z0-9._]{1,30}$/;
const INSTAGRAM_URL_PATTERN = /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?$/i;

export interface ValidationResult {
  ok: boolean;
  message?: string;
  /** Normalised values, safe to persist. */
  clean: {
    displayName: string | null;
    handle: string | null;
    instagramUrl: string | null;
    country: string | null;
  };
}

/**
 * Validate and normalise a draft.
 *
 * The Instagram URL is NEVER derived from the handle. A handle is just a
 * display name with an @ prefix — it does not prove the user owns that
 * Instagram account, and constructing a URL from it would link to a real
 * profile they may have no connection to. The URL is only stored when the
 * user explicitly provides one during onboarding or edit.
 */
export function validateIdentity(draft: IdentityDraft): ValidationResult {
  const displayName = draft.displayName.trim();
  const handle = draft.handle.trim().replace(/^@+/, "");
  const url = draft.instagramUrl.trim();

  const clean = {
    displayName: displayName || null,
    handle: handle || null,
    instagramUrl: null as string | null,
    country: draft.country || null,
  };

  if (!displayName) {
    return { ok: false, message: "Add a display name so people know who they're seeing.", clean };
  }
  if (!handle) {
    return { ok: false, message: "Add your Instagram username.", clean };
  }
  if (!HANDLE_PATTERN.test(handle)) {
    return {
      ok: false,
      message: "Usernames can only use letters, numbers, dots and underscores.",
      clean,
    };
  }
  if (url && !INSTAGRAM_URL_PATTERN.test(url)) {
    return { ok: false, message: "That doesn't look like an Instagram profile link.", clean };
  }

  // Only store a URL the user explicitly provided. Never derive one from
  // the handle — that would invent a link to a real Instagram profile the
  // user may not own.
  clean.instagramUrl = url ? url.replace(/\/$/, "") : null;

  return { ok: true, clean };
}
