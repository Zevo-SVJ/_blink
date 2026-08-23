/**
 * Blink — the navigation chrome, in one place.
 *
 * Before this file there were three navigations: the landing header, the app's
 * desktop top nav, and the phone tab bar. Each had its own glass recipe, its
 * own radius, its own indicator spring and its own idea of how big a tap
 * target is. They were recognisably the same product only by accident.
 *
 * The pieces here are what they now share. Nothing in this file knows about a
 * particular screen — it takes destinations and renders them — so a change to
 * how Blink's navigation feels is one edit rather than three.
 *
 * ## Glass is for chrome
 *
 * Navigation floats over content, so it is the one place in the product that
 * is made of glass. Content underneath stays solid. `glass-chrome` carries the
 * blur, the saturation that stops the blur going grey, the hairline that lights
 * it from above and the shadow it sits on — and it degrades to a solid surface
 * where `backdrop-filter` is unavailable.
 *
 * ## The indicator travels
 *
 * One `layoutId` per nav means the selection *moves* between destinations
 * rather than one highlight disappearing and another appearing. That movement
 * is the only thing telling the reader the two places are part of one set.
 * Scoped by `group` so the desktop nav's indicator can never try to fly into
 * the tab bar's.
 *
 * ## Web-native, not an iOS impression of one
 *
 * Every destination is a real anchor or button that changes the URL through
 * the router. Back works, forward works, a link can be copied, `aria-current`
 * announces where you are, and `focus-ring` means a keyboard can see what a
 * mouse can.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ComponentType, ReactNode } from "react";

import { SPRING, still } from "@/design/motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────
   The bar itself
   ───────────────────────────────────────────────────────────────────── */

/**
 * A fixed bar across the top of the page.
 *
 * `solid` is what the landing page toggles on scroll: over the hero the bar is
 * invisible and the page runs behind it; once the reader has moved, it becomes
 * a real material so text passing underneath stays legible. Inside the app it
 * is always solid, because there is no hero to sit over.
 */
export function TopBar({
  solid = true,
  children,
  className,
}: {
  solid?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        solid ? "glass-chrome border-x-0 border-t-0" : "border-transparent bg-transparent",
        className,
      )}
    >
      {children}
    </header>
  );
}

/**
 * A floating bar at the bottom, clear of the home indicator.
 *
 * Phones only. On desktop the same destinations live in the top bar, because a
 * bottom bar on a wide screen is a phone layout that has been stretched.
 */
export function BottomBar({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-3 md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      aria-label={label}
    >
      <ul className="glass-chrome mx-auto flex max-w-md items-center justify-between gap-0.5 rounded-[var(--r-xl)] p-1.5">
        {children}
      </ul>
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Destinations
   ───────────────────────────────────────────────────────────────────── */

export interface Destination {
  /** Router path. */
  path: string;
  label: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
}

/**
 * A row of destinations with one travelling indicator.
 *
 * The horizontal, text-only form: the app's desktop nav. `group` scopes the
 * `layoutId`, so two of these on one page keep their indicators to themselves.
 */
export function PillNav({
  group,
  items,
  isActive,
  onGo,
  label,
}: {
  group: string;
  items: Destination[];
  isActive: (path: string) => boolean;
  onGo: (path: string) => void;
  label: string;
}) {
  const reduced = useReducedMotion();

  return (
    <nav aria-label={label}>
      <ul className="glass-inset flex items-center gap-1 rounded-[var(--r-pill)] p-1">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <li key={item.path}>
              <button
                type="button"
                onClick={() => onGo(item.path)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring relative min-h-[44px] rounded-[var(--r-pill)] px-4 text-sm font-semibold transition-colors",
                  active ? "text-blink-navy" : "text-white/60 hover:text-white",
                )}
              >
                {active && (
                  <motion.span
                    aria-hidden
                    layoutId={`${group}-indicator`}
                    className="absolute inset-0 rounded-[var(--r-pill)] bg-blink-sky"
                    transition={reduced ? still : SPRING.snap}
                  />
                )}
                <span className="relative">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * One destination in the bottom bar.
 *
 * 48px minimum, not 44: these sit directly above the home indicator, where the
 * thumb is least accurate, and 44 is the floor rather than a comfortable size.
 */
export function BarTab({
  group,
  item,
  active,
  onGo,
}: {
  group: string;
  item: Destination;
  active: boolean;
  onGo: () => void;
}) {
  const Icon = item.icon;
  const reduced = useReducedMotion();

  return (
    <li className="flex-1">
      <motion.button
        type="button"
        onClick={onGo}
        aria-current={active ? "page" : undefined}
        whileTap={reduced ? undefined : { scale: 0.92 }}
        transition={reduced ? still : SPRING.snap}
        className="focus-ring relative flex min-h-[48px] w-full flex-col items-center justify-center gap-1 rounded-[var(--r-lg)] px-1 py-1.5"
      >
        {active && (
          <motion.span
            aria-hidden
            layoutId={`${group}-indicator`}
            className="absolute inset-0 rounded-[var(--r-lg)] bg-white/[0.09]"
            transition={reduced ? still : SPRING.snap}
          />
        )}
        {Icon && (
          <Icon
            className={cn(
              "relative h-[1.15rem] w-[1.15rem] transition-colors",
              active ? "text-blink-sky" : "text-white/45",
            )}
            strokeWidth={active ? 2.4 : 2}
          />
        )}
        <span
          className={cn(
            "t-micro relative font-semibold leading-none transition-colors",
            active ? "text-white" : "text-white/45",
          )}
        >
          {item.label}
        </span>
      </motion.button>
    </li>
  );
}

/**
 * The centre action of the bottom bar.
 *
 * Filled rather than outlined, and it never takes an active state: you do not
 * "are" in Analyze the way you are in Library — you go and do it and come
 * back. A tab that lights up would imply a place you can sit.
 */
export function BarAction({ item, onGo }: { item: Destination; onGo: () => void }) {
  const Icon = item.icon;
  const reduced = useReducedMotion();

  return (
    <li className="flex-1">
      <motion.button
        type="button"
        onClick={onGo}
        whileTap={reduced ? undefined : { scale: 0.9 }}
        transition={reduced ? still : SPRING.snap}
        className="focus-ring flex min-h-[48px] w-full flex-col items-center justify-center gap-1 rounded-[var(--r-lg)] px-1 py-1.5"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blink-sky shadow-[0_6px_18px_-6px_hsl(var(--blink-sky)/0.9)]">
          {Icon && <Icon className="h-[1.1rem] w-[1.1rem] text-blink-navy" strokeWidth={2.6} />}
        </span>
        <span className="t-micro font-bold leading-none text-white">{item.label}</span>
      </motion.button>
    </li>
  );
}
