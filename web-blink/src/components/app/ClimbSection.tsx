/**
 * "How to climb" — the concrete ways to move up.
 *
 * Shown on the Profile and after an own-profile analysis. Paths that require
 * changing how the profile looks are marked optional, so someone happy with
 * their profile can see at a glance that they still have real routes.
 */

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, TrendingUp } from "lucide-react";
import { useState } from "react";

import { climbHeadline, getClimbPaths, type ClimbPath } from "@/lib/climb";
import type { ProfileStats } from "@/lib/ranking";
import { cn } from "@/lib/utils";

export function ClimbSection({
  stats,
  rank,
  /** The model's profile-specific recommendations, if any. */
  recommendations = [],
  onAnalyze,
}: {
  stats: ProfileStats;
  rank: number | null;
  recommendations?: string[];
  onAnalyze?: () => void;
}) {
  const paths = getClimbPaths(stats);

  return (
    <section className="rounded-2xl border border-blink-sky/20 bg-blink-sky/[0.05] p-5">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blink-sky">
        <TrendingUp className="h-3.5 w-3.5" />
        How to climb
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/70">{climbHeadline(stats, rank)}</p>

      {recommendations.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/45">
            Specific to your profile
          </p>
          <ol className="mt-2.5 space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blink-sky/20 text-[0.6rem] font-bold text-blink-sky">
                  {i + 1}
                </span>
                <span className="text-xs leading-relaxed text-white/75">{rec}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/40">
        Ways to move up
      </p>
      <div className="mt-2.5 space-y-2">
        {paths.map((path) => (
          <PathRow key={path.id} path={path} />
        ))}
      </div>

      <p className="mt-4 text-[0.7rem] leading-relaxed text-white/35">
        You never have to redesign your profile to climb. Depth, consistency and staying
        active move the score on their own.
      </p>

      {onAnalyze && (
        <button
          type="button"
          onClick={onAnalyze}
          className="mt-4 w-full rounded-2xl bg-blink-sky py-3 text-sm font-bold text-blink-navy transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          Upload a new screenshot
        </button>
      )}
    </section>
  );
}

function PathRow({ path }: { path: ClimbPath }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        path.priority
          ? "border-blink-sky/30 bg-blink-sky/[0.07]"
          : "border-white/[0.07] bg-white/[0.03]",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
            {path.title}
            {path.priority && (
              <span className="rounded-full bg-blink-sky px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-blink-navy">
                Start here
              </span>
            )}
            {path.redesign && (
              <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-white/45">
                Optional
              </span>
            )}
          </p>
          {path.impact && (
            <p className="mt-0.5 text-[0.7rem] font-semibold text-blink-sky/80">{path.impact}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-white/30 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-3.5 pb-3.5">
              <p className="text-xs leading-relaxed text-white/70">{path.action}</p>
              <p className="text-xs leading-relaxed text-white/40">
                <span className="font-bold text-white/55">Why: </span>
                {path.why}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
