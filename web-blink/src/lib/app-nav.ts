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

export interface NavDestination {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Rendered as the accented centre action rather than a plain tab. */
  primary?: boolean;
}

export const APP_NAV: NavDestination[] = [
  { path: "/app", label: "Home", icon: Home },
  { path: "/library", label: "Library", icon: LayoutGrid },
  { path: "/analyze", label: "Analyze", icon: ScanLine, primary: true },
  { path: "/ranks", label: "Ranks", icon: Trophy },
  { path: "/profile", label: "Profile", icon: User },
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
