/**
 * Blink — the perception card.
 *
 * One reading of a profile: who is looking, what they conclude, the traits
 * they'd use, and the line they'd say. A tinted surface with the lens emoji
 * sitting large and faint behind the words.
 *
 * This is the product's signature object. It lives here, on its own, because
 * three surfaces render it — the analysis result, the landing's How It Works
 * sequence, and the share sheet's preview — and they had started drifting into
 * three near-copies. A visitor who signs up should recognise the result screen
 * from the landing page, which only holds if it is literally the same
 * component.
 */

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

/** A tint per lens, so a shared crop is recognisably one perspective. */
export const LENS_TINT: Record<string, string> = {
  crush: "rgba(244, 114, 182, 0.16)",
  stranger: "rgba(175, 224, 249, 0.14)",
  friends: "rgba(52, 211, 153, 0.13)",
  recruiter: "rgba(251, 191, 36, 0.12)",
  "green-flag": "rgba(52, 211, 153, 0.15)",
  "red-flag": "rgba(248, 113, 113, 0.14)",
};

export function PerceptionCard({
  lensId,
  emoji,
  kicker,
  title,
  traits,
  summary,
  score,
  className,
  compact = false,
}: {
  /** Drives the tint. Unknown ids fall back to a neutral surface. */
  lensId: string;
  emoji: string;
  /** Small line above the title. Optional. */
  kicker?: string;
  title: string;
  traits: string[];
  summary?: string;
  /** Shown top-right when the caller has one. */
  score?: number;
  className?: string;
  /** Tighter type, for the landing's sequence where space is shared. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl p-5 ring-1 ring-white/[0.08]",
        className,
      )}
      style={{
        background: `linear-gradient(155deg, ${
          LENS_TINT[lensId] ?? "rgba(255,255,255,0.05)"
        } 0%, rgba(255,255,255,0.03) 60%)`,
      }}
    >
      {/* The lens, large and faint. Sized in em so it tracks the card. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 -top-4 select-none text-[5.5rem] leading-none opacity-[0.13]"
      >
        {emoji}
      </span>

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          {kicker && (
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/40">
              {kicker}
            </p>
          )}
          <p
            className={cn(
              "font-extrabold leading-tight tracking-tight text-white",
              kicker && "mt-1.5",
              compact ? "text-[1.15rem]" : "text-[1.3rem]",
            )}
          >
            {title}
          </p>
        </div>

        {score !== undefined && (
          <p className="shrink-0 text-2xl font-extrabold tabular-nums leading-none text-white">
            {score.toFixed(1)}
          </p>
        )}
      </div>

      {traits.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {traits.map((trait, i) => (
            <motion.span
              key={trait}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 28,
                delay: 0.05 + i * 0.05,
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-[0.8rem] font-bold",
                i === 0 ? "bg-blink-sky text-blink-navy" : "bg-white/[0.1] text-white/85",
              )}
            >
              {trait}
            </motion.span>
          ))}
        </div>
      )}

      {summary && (
        <p
          className={cn(
            "relative mt-4 font-medium leading-relaxed text-white/90",
            compact ? "text-[0.92rem]" : "text-[1rem]",
          )}
        >
          {summary}
        </p>
      )}
    </div>
  );
}
