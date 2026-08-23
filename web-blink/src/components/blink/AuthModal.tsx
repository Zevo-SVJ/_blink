import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Lock, Mail, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BlinkLogo } from "@/components/blink/BlinkLogo";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { MINIMUM_AGE } from "@/lib/legal-entity";

type AuthMode = "signin" | "signup" | "forgot" | "verify";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
  /** Tab to open on. Defaults to signup — the acquisition path. */
  initialMode?: AuthMode;
}

export function AuthModal({
  open,
  onClose,
  onSuccess,
  title,
  subtitle,
  /** Which tab to land on. "Already have an account?" must not open signup. */
  initialMode = "signup",
}: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle, resetPassword, resendVerification, isSigningIn, error, clearError } = useAuth();
  const t = useT();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  /*
    Escape closes, like every other sheet in the app — `AddSomeoneSheet`,
    `ShareSheet` and the profile editor all do, and this one did not. It is
    the dialog a first-time visitor is most likely to meet, and it was the
    only one a keyboard could not dismiss.
  */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setEmail("");
      setPassword("");
      setInfoMessage(null);
      clearError();
    }
  }, [open, clearError, initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMessage(null);
    clearError();

    try {
      if (mode === "signup") {
        const { needsVerification } = await signUp(email, password);
        if (needsVerification) {
          setMode("verify");
          setInfoMessage(t.auth.verificationSent.replace("{email}", email));
        } else {
          onSuccess?.();
        }
      } else if (mode === "signin") {
        await signIn(email, password);
        onSuccess?.();
      } else if (mode === "forgot") {
        await resetPassword(email);
        setInfoMessage(t.auth.resetSent.replace("{email}", email));
      }
    } catch {
      // Error is set in the auth hook
    }
  };

  const handleGoogle = async () => {
    setInfoMessage(null);
    clearError();
    await signInWithGoogle();
    // For redirect flow, the page will redirect away
    // For popup, the auth state change listener will fire
  };

  const handleResend = async () => {
    setInfoMessage(null);
    clearError();
    try {
      await resendVerification(email);
      setInfoMessage(t.auth.resent);
    } catch {
      // Error is set in the auth hook
    }
  };

  const headlines: Record<AuthMode, { title: string; subtitle: string }> = {
    signup: {
      title: title ?? t.auth.signupTitle,
      subtitle: subtitle ?? t.auth.signupSubtitle,
    },
    signin: {
      title: t.auth.signinTitle,
      subtitle: t.auth.signinSubtitle,
    },
    forgot: {
      title: t.auth.forgotTitle,
      subtitle: t.auth.forgotSubtitle,
    },
    verify: {
      title: t.auth.verifyTitle,
      subtitle: `${t.auth.verifySubtitle} ${email}.`,
    },
  };

  const current = headlines[mode];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Modal panel */}
          <div className="fixed inset-0 z-[81] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-blink-navy-2 p-6 shadow-2xl sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-title"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                aria-label={t.common.close}
              >
                <X className="h-5 w-5" />
              </button>

              {/* Logo */}
              <div className="flex justify-center">
                <BlinkLogo width={48} />
              </div>

              {/* Headline */}
              <div className="mt-6 text-center">
                <h2 id="auth-title" className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                  {current.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  {current.subtitle}
                </p>
              </div>

              {/* Verify mode — no form, just info + resend */}
              {mode === "verify" ? (
                <div className="mt-8 space-y-4">
                  {infoMessage && (
                    <div className="rounded-xl bg-blink-sky/10 px-4 py-3 text-sm font-medium text-blink-sky">
                      {infoMessage}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isSigningIn}
                    className="w-full rounded-2xl bg-blink-sky py-3.5 text-sm font-bold text-blink-navy transition-all hover:scale-[1.01] disabled:opacity-60"
                  >
                    {t.auth.resendVerification}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    {t.auth.backToSignIn}
                  </button>
                </div>
              ) : (
                <>
                  {/* Email/Password form */}
                  <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    {mode !== "forgot" && (
                      <div>
                        <label htmlFor="auth-email" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-white/40">
                          {t.common.email}
                        </label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                          <input
                            id="auth-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm font-medium text-white placeholder:text-white/30 focus:border-blink-sky/50 focus:outline-none focus:ring-1 focus:ring-blink-sky/30"
                            autoComplete="email"
                          />
                        </div>
                      </div>
                    )}

                    {mode !== "forgot" && (
                      <div>
                        <label htmlFor="auth-password" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-white/40">
                          {t.auth.password}
                        </label>
                        <input
                          id="auth-password"
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t.auth.passwordPlaceholder}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 px-4 text-sm font-medium text-white placeholder:text-white/30 focus:border-blink-sky/50 focus:outline-none focus:ring-1 focus:ring-blink-sky/30"
                          autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        />
                      </div>
                    )}

                    {mode === "forgot" && (
                      <div>
                        <label htmlFor="auth-email" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-white/40">
                          {t.common.email}
                        </label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                          <input
                            id="auth-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm font-medium text-white placeholder:text-white/30 focus:border-blink-sky/50 focus:outline-none focus:ring-1 focus:ring-blink-sky/30"
                            autoComplete="email"
                          />
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {error && (
                      <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
                        {error}
                      </div>
                    )}

                    {/* Info message */}
                    {infoMessage && (
                      <div className="rounded-xl bg-blink-sky/10 px-4 py-3 text-sm font-medium text-blink-sky">
                        {infoMessage}
                      </div>
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={isSigningIn}
                      className="w-full rounded-2xl bg-blink-sky py-3.5 text-sm font-bold text-blink-navy transition-all hover:scale-[1.01] hover:bg-[hsl(var(--blink-sky-2))] disabled:opacity-60"
                    >
                      {isSigningIn ? (
                        <span className="flex items-center justify-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="h-4 w-4 rounded-full border-2 border-blink-navy/30 border-t-blink-navy"
                          />
                          {mode === "signup" ? t.auth.creatingAccount : mode === "signin" ? t.auth.signingIn : t.auth.sending}
                        </span>
                      ) : (
                        <>
                          {mode === "signup" ? t.auth.createAccount : mode === "signin" ? t.auth.signIn : t.auth.sendResetLink}
                        </>
                      )}
                    </button>
                  </form>

                  {/* Mode switches */}
                  <div className="mt-5 space-y-2 text-center">
                    {mode === "signup" && (
                      <button
                        type="button"
                        onClick={() => { setMode("signin"); clearError(); setInfoMessage(null); }}
                        className="text-sm font-medium text-white/50 transition-colors hover:text-white"
                      >
                        {t.auth.haveAccount} <span className="font-bold text-blink-sky">{t.auth.signIn}</span>
                      </button>
                    )}
                    {mode === "signin" && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setMode("forgot"); clearError(); setInfoMessage(null); }}
                          className="block w-full text-sm font-medium text-white/50 transition-colors hover:text-white"
                        >
                          {t.auth.forgotPassword}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMode("signup"); clearError(); setInfoMessage(null); }}
                          className="text-sm font-medium text-white/50 transition-colors hover:text-white"
                        >
                          {t.auth.noAccount} <span className="font-bold text-blink-sky">{t.auth.createOne}</span>
                        </button>
                      </>
                    )}
                    {mode === "forgot" && (
                      <button
                        type="button"
                        onClick={() => { setMode("signin"); clearError(); setInfoMessage(null); }}
                        className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to sign in
                      </button>
                    )}
                  </div>

                  {/* Divider — only for sign in / sign up */}
                  {(mode === "signin" || mode === "signup") && (
                    <div className="mt-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="text-xs font-bold uppercase tracking-widest text-white/30">or</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                  )}

                  {/* Google button — only for sign in / sign up */}
                  {(mode === "signin" || mode === "signup") && (
                    <button
                      type="button"
                      onClick={handleGoogle}
                      disabled={isSigningIn}
                      className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.01] hover:bg-white/8 disabled:opacity-60"
                    >
                      <GoogleIcon />
                      {t.auth.continueWithGoogle}
                    </button>
                  )}
                </>
              )}

              {/* Replaces "Your data is private and secure." — a claim with
                  no defined meaning, sitting exactly where the two things a
                  person actually needs before creating an account belong: the
                  age rule, and what they are agreeing to. Both are one tap
                  away rather than asserted. */}
              <p className="mt-6 text-center text-xs leading-relaxed text-white/35">
                <Lock className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden />
                {t.auth.ageAndTerms.replace("16", String(MINIMUM_AGE))}{" "}
                <Link to="/terms" className="text-white/55 underline underline-offset-2 hover:text-white">
                  {t.footer.terms}
                </Link>
                {" · "}
                <Link to="/privacy" className="text-white/55 underline underline-offset-2 hover:text-white">
                  {t.footer.privacy}
                </Link>
              </p>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
