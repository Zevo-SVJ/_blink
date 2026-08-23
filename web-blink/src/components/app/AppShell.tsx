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
import { PillNav, TopBar } from "@/components/nav/chrome";
import { useAuth } from "@/hooks/useAuth";
import { APP_NAV_LINKS, isNavActive } from "@/lib/app-nav";
import { BRAND } from "@/lib/brand";
import { useT } from "@/lib/i18n";
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

  /*
    `clip`, not `hidden`. `overflow-x: hidden` coerces the other axis to
    `auto`, which makes this element a scroll container — and a scroll
    container swallows `position: sticky` for everything inside it. That is why
    the analysis section bar had to be fixed to the viewport, where it sat on
    top of the text it was meant to help you navigate.
  */
  return (
    <div className="has-app-tabbar relative min-h-screen overflow-x-clip">
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
              /*
                Wraps rather than squeezes.

                The action used to be `shrink-0` next to a `min-w-0` title, so
                on a phone the button took its full natural width and the title
                took whatever was left — which in French was not enough:
                "Classement" rendered as "Classeme…", and the subtitle wrapped
                inside a column barely wider than the button. A title that
                cannot be read is worse than a button on its own line.

                `basis-64` is the width below which the title stops being
                comfortable, so the action drops beneath it instead. Every
                viewport that already fit both is unchanged.
              */
              <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1 basis-64">
                  <h1 className="t-title truncate text-white">{title}</h1>
                  {subtitle && (
                    <p className="t-body mt-2 text-white/50">{subtitle}</p>
                  )}
                </div>
                {action && <div className="shrink-0 sm:pt-1">{action}</div>}
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
  const t = useT();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <PageBackground />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="h-8 w-8 rounded-full border-2 border-blink-sky/30 border-t-blink-sky"
      />
      <span className="sr-only">{t.app.loading}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desktop nav
// ---------------------------------------------------------------------------

function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();

  return (
    <TopBar>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("/app")}
          className="focus-ring inline-flex min-h-[44px] items-center rounded-[var(--r-sm)] pr-2 text-lg font-bold tracking-tight text-white transition-opacity hover:opacity-80"
        >
          {BRAND.name}
        </button>

        <div className="hidden md:block">
          <PillNav
            group="app-top"
            label={t.app.primaryNav}
            items={APP_NAV_LINKS.map((item) => ({
              path: item.path,
              label: t.app[item.labelKey],
            }))}
            isActive={(path) => isNavActive(location.pathname, path)}
            onGo={navigate}
          />
        </div>

        {/*
          Desktop only.

          On a phone the tab bar already carries Analyze as its centre action,
          so this made three ways to start an analysis on one screen — the top
          bar, the tab bar and the card in the page — which is the opposite of
          Home answering "what can I do now" with one obvious answer. Above
          `md` there is no tab bar, so here it is the only persistent one.
        */}
        <button
          type="button"
          onClick={() => navigate("/analyze")}
          className="focus-ring hidden min-h-[44px] items-center gap-2 rounded-[var(--r-pill)] bg-blink-sky px-4 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.03] active:scale-[0.98] md:flex"
        >
          <ScanLine className="h-4 w-4" />
          {t.app.tabAnalyze}
        </button>
      </div>
    </TopBar>
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
