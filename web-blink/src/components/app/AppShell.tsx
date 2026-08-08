/**
 * Blink — authenticated app shell.
 *
 * Two navigation surfaces over one route set: a floating tab bar on phones and
 * a centred pill nav on desktop. Both share a single `layoutId`-driven
 * indicator so the active pill glides between destinations instead of
 * cutting, which is what makes the movement read as continuous.
 *
 * The visual language is rounded, translucent and quiet — near-black glass,
 * one accent, no badges or gradients competing with the content.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Compass } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { PageBackground } from "@/components/blink/PageBackground";
import { useAuth } from "@/hooks/useAuth";
import { APP_NAV, isNavActive } from "@/lib/app-nav";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function AppShell({
  title,
  subtitle,
  action,
  children,
  /** Widen for dense screens like the leaderboard. */
  wide = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Every screen inside the shell is private.
  useEffect(() => {
    if (!isLoading && !user) navigate("/", { replace: true });
  }, [user, isLoading, navigate]);

  if (isLoading) return <AppShellLoading />;
  if (!user) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <PageBackground />

      <TopNav />

      <main
        className={cn(
          "mx-auto w-full px-4 pt-24 sm:px-6 sm:pt-28",
          // Room for the floating tab bar plus the home indicator on phones.
          "pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-24",
          wide ? "max-w-5xl" : "max-w-2xl",
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{subtitle}</p>
                )}
              </div>
              {action && <div className="shrink-0 pt-1">{action}</div>}
            </header>

            <div className="mt-8">{children}</div>
          </motion.div>
        </AnimatePresence>
      </main>

      <TabBar />
    </div>
  );
}

export function AppShellLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <PageBackground />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="h-8 w-8 rounded-full border-2 border-blink-sky/30 border-t-blink-sky"
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop nav
// ---------------------------------------------------------------------------

function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-blink-navy/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("/app")}
          className="text-lg font-bold tracking-tight text-white transition-opacity hover:opacity-80"
        >
          {BRAND.name}
        </button>

        <nav className="hidden md:block">
          <ul className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-1">
            {APP_NAV.map((item) => {
              const active = isNavActive(location.pathname, item.path);
              return (
                <li key={item.path}>
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      active ? "text-blink-navy" : "text-white/60 hover:text-white",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="app-nav-pill"
                        className="absolute inset-0 rounded-full bg-blink-sky"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}
                    <span className="relative">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => navigate("/analyze")}
          className="flex items-center gap-2 rounded-full bg-blink-sky px-4 py-2 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <Compass className="h-4 w-4" />
          Analyze
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Mobile tab bar
// ---------------------------------------------------------------------------

function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-3 md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-md items-center justify-between gap-0.5 rounded-[1.75rem] border border-white/[0.08] bg-blink-navy-2/80 p-1.5 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        {APP_NAV.map((item) => {
          const active = isNavActive(location.pathname, item.path);
          const Icon = item.icon;
          return (
            <li key={item.path} className="flex-1">
              <motion.button
                type="button"
                onClick={() => navigate(item.path)}
                aria-current={active ? "page" : undefined}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="relative flex w-full flex-col items-center gap-1 rounded-[1.35rem] px-1 py-2"
              >
                {active && (
                  <motion.span
                    layoutId="app-tab-pill"
                    className="absolute inset-0 rounded-[1.35rem] bg-white/[0.09]"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <Icon
                  className={cn(
                    "relative h-[1.15rem] w-[1.15rem] transition-colors",
                    active ? "text-blink-sky" : "text-white/45",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span
                  className={cn(
                    "relative text-[0.625rem] font-semibold leading-none transition-colors",
                    active ? "text-white" : "text-white/45",
                  )}
                >
                  {item.label}
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
