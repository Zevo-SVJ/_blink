/**
 * The authenticated app's destinations.
 *
 * Lives apart from `AppShell` so both navigation surfaces — and anything else
 * that needs to know the route set — can import it without dragging in
 * components.
 *
 * **Analyze is a tab.** It was previously reachable on a phone only from a
 * button inside individual screens, which meant the app's single most
 * important action was the one thing the navigation didn't offer. It now sits
 * in the middle of the bar with a primary treatment, the standard place a
 * consumer app puts its verb.
 *
 * **Settings is not a tab.** It is a rarely-used destination that was taking a
 * fifth of the bar from the four things people actually move between; it lives
 * on the Profile screen instead.
 */

import {
  Home,
  LayoutGrid,
  ScanLine,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export interface NavDestination {
  path: string;
  labelKey: "tabHome" | "tabLibrary" | "tabAnalyze" | "tabRanks" | "tabProfile";
  icon: LucideIcon;
  /** Rendered as the accented centre action rather than a plain tab. */
  primary?: boolean;
}

export const APP_NAV: NavDestination[] = [
  // `labelKey` indexes `messages.app`; the label itself is resolved at render
  // so the tab bar speaks the reader's language without this module — which is
  // plain data, imported by non-React code — needing a language context.
  { path: "/app", labelKey: "tabHome", icon: Home },
  { path: "/library", labelKey: "tabLibrary", icon: LayoutGrid },
  { path: "/analyze", labelKey: "tabAnalyze", icon: ScanLine, primary: true },
  { path: "/ranks", labelKey: "tabRanks", icon: Trophy },
  { path: "/profile", labelKey: "tabProfile", icon: User },
];

/** The destinations shown in the desktop pill nav — no primary action. */
export const APP_NAV_LINKS = APP_NAV.filter((item) => !item.primary);

/** Nested routes still light up their section's tab. */
export function isNavActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** "—" for a rank that doesn't exist yet, "#12" otherwise. */
export function formatRank(rank: number | null): string {
  return rank === null || rank <= 0 ? "—" : `#${rank}`;
}

/**
 * Back, the way a native app does it.
 *
 * Every secondary screen used to send Back to one fixed destination —
 * `/library` from an analysis, `/ranks` from a public profile, `/app` from the
 * analyse flow. That is right exactly when the user arrived from that place
 * and wrong every other time: open an analysis from the Ranks board and "Back
 * to Library" drops you somewhere you have never been.
 *
 * So Back pops history when there is history to pop, and uses the screen's
 * sensible default when there is not. React Router gives us the distinction
 * for free: `location.key` is the string `"default"` only for the first entry
 * of a session, which is precisely the deep-link, refresh and shared-link
 * case — where going "back" would leave Blink entirely.
 *
 * This also means the button and the browser's own back gesture do the same
 * thing, which is the actual definition of feeling native.
 */
export function useBackTo(fallback: string): () => void {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (location.key !== "default") {
      navigate(-1);
      return;
    }
    navigate(fallback);
  }, [navigate, location.key, fallback]);
}
