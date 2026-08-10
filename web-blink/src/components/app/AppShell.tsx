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
import { ScanLine } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { PageBackground } from "@/components/blink/PageBackground";
import { useAuth } from "@/hooks/useAuth";
import { APP_NAV_LINKS, isNavActive } from "@/lib/app-nav";
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
  /** Drop the title block but keep navigation — used by onboarding. */
  bare = false,
  /**
   * Centre the content in the remaining viewport instead of stacking it under
   * the header. For screens whose content comfortably fits, so they don't sit
   * high with dead space below or scroll for no reason.
   */
  center = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  bare?: boolean;
  center?: boolean;
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
    <div className="has-app-tabbar relative min-h-screen overflow-x-hidden">
      <PageBackground />

      <TopNav />

      <main
        className={cn(
          "mx-auto w-full px-4 pt-24 sm:px-6 sm:pt-28",
          // Room for the floating tab bar plus the home indicator on phones.
          "pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-24",
          wide ? "max-w-5xl" : "max-w-2xl",
          center && "flex flex-col justify-center",
        )}
        // Fill the space between the fixed nav and the tab bar so `center` has
        // something to centre within.
        style={center ? { minHeight: "100dvh" } : undefined}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            {!bare && (
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
            )}

            <div className={bare ? undefined : "mt-8"}>{children}</div>
          </motion.div>
        </AnimatePresence>
      </main>

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
            {APP_NAV_LINKS.map((item) => {
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
          <ScanLine className="h-4 w-4" />
          Analyze
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Mobile tab bar
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// The tab bar is no longer rendered here. It is mounted once by `AppChrome`,
// above the router, so it survives navigation instead of being rebuilt per
// screen. This shell only reserves the space it occupies.
// ---------------------------------------------------------------------------
