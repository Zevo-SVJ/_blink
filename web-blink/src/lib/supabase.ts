/**
 * Supabase client — single instance for the entire app.
 *
 * Uses native Supabase Auth (email/password + Google OAuth).
 * Session persistence is handled by supabase-js via localStorage.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

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
