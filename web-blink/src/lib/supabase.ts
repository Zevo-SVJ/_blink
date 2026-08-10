/**
 * Supabase client — single instance for the entire app.
 *
 * Uses native Supabase Auth (email/password + Google OAuth).
 * Session persistence is handled by supabase-js via localStorage.
 */
import { createClient } from "@supabase/supabase-js";

/**
 * Reduce whatever was configured to the project origin.
 *
 * Supabase's dashboard shows the project URL in several places, and two of
 * them include a path: the Data API panel offers
 * `https://<ref>.supabase.co/rest/v1` and the GraphQL panel offers
 * `/graphql/v1`. Pasting either is an easy mistake and the failure is silent
 * and total — `createClient` then builds `/rest/v1/rest/v1/...` for every
 * query, and the analysis endpoint resolves to
 * `/rest/v1//functions/v1/analyze`, which PostgREST answers with a 401
 * "No API key found". Nothing says the URL is wrong; the app simply cannot
 * reach anything.
 *
 * Trailing slashes have the same effect one level down. Normalising here
 * means every caller gets a usable origin regardless of which field it was
 * copied from.
 */
export function normaliseSupabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    return new URL(trimmed).origin;
  } catch {
    // Not parseable as a URL — hand it back untouched so the failure is the
    // caller's usual "misconfigured" path rather than a crash at import time.
    return trimmed.replace(/\/+$/, "");
  }
}

const supabaseUrl = normaliseSupabaseUrl(
  import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined,
);
const supabaseAnonKey = (import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** True when the app is running without real Supabase credentials. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn("Missing Supabase env vars — auth and saved data will not function.");
}

// `createClient` throws on an empty URL, which would take down every module
// that imports this one. Falling back to a syntactically valid placeholder
// keeps the app mounting so it can render proper error states instead of a
// blank page, and keeps unit tests importable.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
