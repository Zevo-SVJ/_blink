/**
 * Score, rank and momentum display primitives.
 *
 * Kept deliberately plain — one accent colour, no gradients or badges — so a
 * screen full of numbers still reads as calm. Surfaces use `ring-1` to match
 * the rest of the app; see `states.tsx` for why.
 */

import { motion } from "framer-motion";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { useT } from "@/lib/i18n";
import { momentumLabel, type Momentum } from "@/lib/ranking";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Stat tiles
// ---------------------------------------------------------------------------

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>;
}

export function StatTile({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="surface p-4">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/40">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-extrabold tabular-nums tracking-tight",
          accent ? "text-blink-sky" : "text-white",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[0.7rem] leading-snug text-white/35">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Momentum
// ---------------------------------------------------------------------------

export function MomentumPill({ momentum }: { momentum: Momentum }) {
  const t = useT();
  const config = {
    up: { Icon: TrendingUp, className: "bg-emerald-400/10 text-emerald-300" },
    down: { Icon: TrendingDown, className: "bg-amber-400/10 text-amber-300" },
    flat: { Icon: Minus, className: "bg-white/[0.06] text-white/50" },
  }[momentum.direction];

  const { Icon } = config;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
        config.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {momentumLabel(momentum, t)}
    </span>
  );
}

/** Compact "+3" / "−2" places-moved indicator for leaderboard rows. */
export function MovementIndicator({ movement }: { movement: number | null }) {
  if (movement === null || movement === 0) {
    return <span className="text-xs font-medium tabular-nums text-white/25">—</span>;
  }
  const up = movement > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-bold tabular-nums",
        up ? "text-emerald-300" : "text-amber-300",
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(movement)}
    </span>
  );
}
