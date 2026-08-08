/**
 * Score, rank and momentum display primitives.
 *
 * Kept deliberately plain — one accent colour, no gradients or badges — so a
 * screen full of numbers still reads as calm.
 */

import { motion } from "framer-motion";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { MAX_SCORE, type Momentum, type Tier } from "@/lib/ranking";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Score dial
// ---------------------------------------------------------------------------

export function ScoreDial({
  score,
  tier,
  size = 190,
}: {
  score: number;
  tier: Tier;
  size?: number;
}) {
  const stroke = Math.round(size * 0.055);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, score / MAX_SCORE));

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--blink-sky))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 28 }}
          className="text-[2.6rem] font-extrabold leading-none tabular-nums tracking-tight text-white"
          style={{ fontSize: size * 0.23 }}
        >
          {score}
        </motion.span>
        <span className="mt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-white/40">
          Blink Score
        </span>
        <span className="mt-2 rounded-full bg-blink-sky/15 px-3 py-1 text-xs font-bold text-blink-sky">
          {tier.label}
        </span>
      </div>
      <span className="sr-only">
        {score} out of {MAX_SCORE}. Tier: {tier.label}.
      </span>
    </div>
  );
}

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
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
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
      {momentum.label}
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
