/**
 * Blink — badge emblems.
 *
 * An emblem is drawn, not boxed: one SVG silhouette carrying an icon and a
 * value, with the label sitting outside it on the page. That is the whole
 * difference between a badge and a stat tile, and it's why there is no card,
 * border or background behind these.
 *
 * See `@/lib/badges` for what the shapes and grades mean. This file only knows
 * how to draw them.
 *
 * The gold used by `elite` appears nowhere else in Blink. That is deliberate:
 * a rare grade has to be visually unavailable by any other route, or it stops
 * reading as rare.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import type { BadgeGrade, BadgeIcon, BadgeSpec, EmblemShape } from "@/lib/badges";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Silhouettes — all drawn in a 64 × 72 box so they optically match at a glance
// ---------------------------------------------------------------------------

const SHAPES: Record<EmblemShape, string> = {
  // Standing: a crest.
  shield: "M32 3 L59 13 V38 C59 54 46 65 32 69 C18 65 5 54 5 38 V13 Z",
  // Record: a struck plate.
  hex: "M32 3 L58 18 V54 L32 69 L6 54 V18 Z",
  // Activity: a token.
  disc: "M32 4 A28 28 0 1 1 31.99 4 Z",
  // Change over time: a tag that points up. Reads as movement, and its apex
  // sits opposite the shield's so the two never blur together in a row.
  chevron: "M32 3 L59 23 V62 A4 4 0 0 1 55 66 H9 A4 4 0 0 1 5 62 V23 Z",
};

/**
 * Icon glyphs, drawn rather than imported.
 *
 * Lucide strokes are tuned for 24px UI chrome and go spindly at emblem scale
 * against a filled crest. These are solid marks at the size they're used.
 */
const ICONS: Record<BadgeIcon, string> = {
  // Laurel-less crown.
  rank: "M3 10 L6.5 6 L10 9.5 L13.5 4 L17 9.5 L20.5 6 L24 10 L21.5 17 H5.5 Z",
  // Upward chevron stack.
  peak: "M13.5 3 L23 12.5 H18 L13.5 8 L9 12.5 H4 Z M13.5 11 L23 20.5 H18 L13.5 16 L9 20.5 H4 Z",
  // Single rising arrow.
  movement: "M13.5 3 L22 13 H17 V21 H10 V13 H5 Z",
  // Four-point spark.
  momentum:
    "M13.5 2 L16 10.5 L24.5 13 L16 15.5 L13.5 24 L11 15.5 L2.5 13 L11 10.5 Z",
  // Flame.
  streak:
    "M13.5 2 C15 7 19.5 8.5 19.5 14 A6 6 0 0 1 7.5 14 C7.5 11.5 9 10 10 8.5 C10.6 10.4 11.6 11 12.4 11.2 C11.4 8 12 4.5 13.5 2 Z",
  // Check inside nothing — the plate is the container.
  verified: "M4 13 L10.5 19.5 L23 6 L20.5 3.5 L10.5 14.5 L6.5 10.5 Z",
  // A star — category champion. Read at 20px, a laurel is two parentheses.
  champion:
    "M13.5 1.5 L17.2 9.4 L25.7 10.5 L19.5 16.5 L21.1 25 L13.5 20.9 L5.9 25 L7.5 16.5 L1.3 10.5 L9.8 9.4 Z",
  // Faceted gem — top three.
  elite: "M13.5 2 L23 9.5 L13.5 25 L4 9.5 Z M8.6 9.5 H18.4 L13.5 20 Z",
  // A podium — a position, not a number.
  topten: "M3 14 H9.5 V24 H3 Z M10.5 8 H16.5 V24 H10.5 Z M17.5 17 H24 V24 H17.5 Z",
};

const ICON_VIEWBOX = 27;

interface GradePaint {
  fill: string;
  stroke: string;
  icon: string;
  value: string;
  glow: string | null;
}

const PAINT: Record<BadgeGrade, GradePaint> = {
  locked: {
    fill: "rgba(255,255,255,0.025)",
    stroke: "rgba(255,255,255,0.10)",
    icon: "rgba(255,255,255,0.18)",
    value: "rgba(255,255,255,0.25)",
    glow: null,
  },
  earned: {
    fill: "hsl(var(--blink-sky) / 0.13)",
    stroke: "hsl(var(--blink-sky) / 0.5)",
    icon: "hsl(var(--blink-sky))",
    value: "#ffffff",
    glow: "hsl(var(--blink-sky) / 0.28)",
  },
  elite: {
    fill: "rgba(245, 200, 120, 0.16)",
    stroke: "rgba(245, 200, 120, 0.68)",
    icon: "rgb(250, 214, 148)",
    value: "#ffffff",
    glow: "rgba(245, 200, 120, 0.34)",
  },
};

export function BadgeEmblem({
  badge,
  size = 60,
}: {
  badge: BadgeSpec;
  size?: number;
}) {
  const paint = PAINT[badge.grade];
  const height = Math.round((size / 64) * 72);
  const iconSize = size * 0.34;

  return (
    <span className="relative block" style={{ width: size, height }}>
      {paint.glow && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full blur-lg"
          style={{ background: paint.glow, opacity: 0.5 }}
        />
      )}

      <svg
        viewBox="0 0 64 72"
        width={size}
        height={height}
        className="relative block"
        aria-hidden
      >
        <path
          d={SHAPES[badge.shape]}
          fill={paint.fill}
          stroke={paint.stroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </svg>

      {/* Icon and value sit on top, so the silhouette stays one clean path. */}
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-[3px] pt-[3px]">
        <svg
          viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
          width={iconSize}
          height={iconSize}
          aria-hidden
        >
          <path d={ICONS[badge.icon]} fill={paint.icon} />
        </svg>
        <span
          className="text-[0.72rem] font-extrabold leading-none tabular-nums"
          style={{ color: paint.value, fontSize: size * 0.19 }}
        >
          {badge.value}
        </span>
      </span>
    </span>
  );
}

/**
 * The badge shelf.
 *
 * A row of emblems on the page — no grid of cards. Tapping one opens its
 * explanation below the row, which keeps the shelf compact while leaving every
 * definition one tap away.
 */
export function BadgeShelf({
  badges,
  title,
}: {
  badges: BadgeSpec[];
  title: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const active = badges.find((b) => b.id === open) ?? null;

  return (
    <section>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-white/40">
        {title}
      </h2>

      <div className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-6">
        {badges.map((badge) => {
          const isOpen = open === badge.id;
          return (
            <motion.button
              key={badge.id}
              type="button"
              onClick={() => setOpen(isOpen ? null : badge.id)}
              whileTap={{ scale: 0.93 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              aria-expanded={isOpen}
              aria-label={`${badge.label}: ${badge.value}`}
              className="flex min-h-[44px] flex-col items-center gap-2 rounded-2xl py-1 outline-none focus-visible:ring-2 focus-visible:ring-blink-sky/60"
            >
              <motion.span
                animate={{ scale: isOpen ? 1.08 : 1, y: isOpen ? -2 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 26 }}
              >
                <BadgeEmblem badge={badge} />
              </motion.span>
              <span
                className={cn(
                  "text-center text-[0.62rem] font-semibold leading-tight transition-colors",
                  isOpen ? "text-white" : "text-white/40",
                )}
              >
                {badge.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {active && (
          <motion.p
            key={active.id}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden text-xs leading-relaxed text-white/50"
          >
            <span className="font-bold text-white/80">{active.label}. </span>
            {active.detail}
            {active.grade === "elite" && (
              <span className="ml-1 font-bold text-[rgb(250,214,148)]">Rare.</span>
            )}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
