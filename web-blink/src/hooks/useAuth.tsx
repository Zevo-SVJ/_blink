/**
 * Blink Authentication — powered by native Supabase Auth.
 *
 * Supports:
 * - Email/password signup + login
 * - Google OAuth
 * - Password reset (forgot password)
 * - Email verification resend
 * - Persistent sessions (localStorage via supabase-js)
 * - Session refresh on page load
 *
 * One identity model: native Supabase Auth (auth.uid()).
 * Never mixed with Rork Auth.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

/**
 * Supabase is loaded on demand, not imported.
 *
 * The client is ~330 kB (92 kB gzip) and `AuthProvider` wraps the whole app,
 * so a static import put it in the critical path: nothing could paint until
 * it had downloaded, parsed and run. On a fast-3G phone that was most of the
 * wait users saw as a blank screen — the landing page does not need Supabase
 * to render, only to answer "is anyone signed in", which it can do a moment
 * later without holding up the first paint.
 *
 * Everything below awaits `client()`. The provider already starts in
 * `isLoading: true`, so nothing about the observable behaviour changes; the
 * chunk simply downloads alongside the UI instead of in front of it.
 */
let clientPromise: Promise<typeof import("@/lib/supabase")> | null = null;

function client() {
  clientPromise ??= import("@/lib/supabase");
  return clientPromise;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  authMethod: "email" | "google" | "unknown";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<{ needsVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapUser(supabaseUser: SupabaseUser): User {
  const isGoogle = supabaseUser.app_metadata?.provider === "google";
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    name: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name,
    picture: supabaseUser.user_metadata?.avatar_url ?? supabaseUser.user_metadata?.picture,
    authMethod: isGoogle ? "google" : "email",
  };
}

/** Human-readable error messages — never expose raw backend errors. */
function humanizeError(error: { message?: string } | null): string {
  if (!error?.message) return "Something went wrong. Please try again.";
  const msg = error.message.toLowerCase();

  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials"))
    return "Wrong email or password. Try again.";
  if (msg.includes("user already registered"))
    return "An account with this email already exists. Try signing in.";
  if (msg.includes("email not confirmed"))
    return "Please verify your email before signing in.";
  if (msg.includes("password should be at least"))
    return "Password must be at least 6 characters.";
  if (msg.includes("unable to send email") || msg.includes("email rate limit"))
    return "Too many emails sent. Please wait a minute and try again.";
  if (msg.includes("rate limit"))
    return "Too many attempts. Please wait a moment and try again.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Network error. Check your connection and try again.";
  if (msg.includes("expired"))
    return "This link has expired. Please request a new one.";
  if (msg.includes("popup"))
    return "Popup was blocked. Please allow popups and try again.";

  return "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    mounted.current = true;

    let unsubscribe: (() => void) | undefined;

    void client().then(async ({ supabase }) => {
      if (!mounted.current) return;

      // Initial session.
      const { data } = await supabase.auth.getSession();
      if (!mounted.current) return;
      setSession(data.session);
      setUser(data.session?.user ? mapUser(data.session.user) : null);
      setIsLoading(false);

      // Login, logout, token refresh.
      const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!mounted.current) return;
        setSession(newSession);
        setUser(newSession?.user ? mapUser(newSession.user) : null);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    });

    return () => {
      mounted.current = false;
      unsubscribe?.();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsSigningIn(true);
    try {
      const { supabase } = await client();
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      if (err) throw err;

      // If session is returned, email confirmation is disabled
      if (data.session) {
        setSession(data.session);
        setUser(mapUser(data.user!));
        return { needsVerification: false };
      }

      return { needsVerification: true };
    } catch (err) {
      setError(humanizeError(err as { message?: string } | null));
      throw err;
    } finally {
      if (mounted.current) setIsSigningIn(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsSigningIn(true);
    try {
      const { supabase } = await client();
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;

      setSession(data.session);
      setUser(mapUser(data.user));
    } catch (err) {
      setError(humanizeError(err as { message?: string } | null));
      throw err;
    } finally {
      if (mounted.current) setIsSigningIn(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      const isPreview = window.parent !== window;
      const redirectTo = isPreview
        ? window.location.origin
        : `${window.location.origin}/auth/callback`;

      const { supabase } = await client();
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (err) throw err;

      // For redirect flow, the page will redirect away.
      // For popup (preview), we won't reach here.
    } catch (err) {
      setError(humanizeError(err as { message?: string } | null));
      if (mounted.current) setIsSigningIn(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    setIsSigningIn(true);
    try {
      const { supabase } = await client();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (err) throw err;
    } catch (err) {
      setError(humanizeError(err as { message?: string } | null));
      throw err;
    } finally {
      if (mounted.current) setIsSigningIn(false);
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    setError(null);
    try {
      const { supabase } = await client();
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (err) throw err;
    } catch (err) {
      setError(humanizeError(err as { message?: string } | null));
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    void client().then(({ supabase }) => supabase.auth.signOut());
    setSession(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isSigningIn,
        error,
        signUp,
        signIn,
        signInWithGoogle,
        resetPassword,
        resendVerification,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

/** Get the current session's access token for API calls. */
export function getAccessToken(): string | null {
  const store = localStorage.getItem(`sb-${import.meta.env.EXPO_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`);
  if (!store) return null;
  try {
    const parsed = JSON.parse(store);
    return parsed?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Fetch helper that attaches the Supabase session token to API calls. */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { supabase } = await client();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
