/**
 * The authenticated app's destinations.
 *
 * Lives apart from `AppShell` so both navigation surfaces — and anything else
 * that needs to know the route set — can import it without dragging in
 * components.
 */

import {
  Home,
  LayoutGrid,
  Settings as SettingsIcon,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavDestination {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const APP_NAV: NavDestination[] = [
  { path: "/app", label: "Home", icon: Home },
  { path: "/library", label: "Library", icon: LayoutGrid },
  { path: "/ranks", label: "Ranks", icon: Trophy },
  { path: "/profile", label: "Profile", icon: User },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

/** Nested routes still light up their section's tab. */
export function isNavActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** "—" for a rank that doesn't exist yet, "#12" otherwise. */
export function formatRank(rank: number | null): string {
  return rank === null || rank <= 0 ? "—" : `#${rank}`;
}
