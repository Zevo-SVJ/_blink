/**
 * "How to climb" — the concrete ways to move up, as a deck.
 *
 * This used to be a stack of accordions: six closed rows, each hiding the two
 * sentences that made it worth doing. Nobody opens six accordions. As a deck
 * you get one whole action at a time, fully written out, and moving on costs a
 * flick — which is the same interaction the landing page already teaches.
 *
 * **No arrows.** Buttons beside the cards turn a deck into a carousel and the
 * user stops touching the card itself. A one-shot hint covers discovery, and
 * the progress rail shows there is more without inviting a click.
 *
 * The ordering is the argument. Whatever this specific profile most needs
 * comes first, then the model's profile-specific recommendations, then the
 * general paths. Paths that ask you to *change how your profile looks* are
 * marked optional and never sort to the front — someone happy with their
 * profile has to be able to see, immediately, that they still have real routes
 * up. That constraint is why this section exists at all.
 */

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { DeckProgress, DeckStatus, SwipeDeck, SwipeHint } from "@/components/blink/SwipeDeck";
import { climbHeadline, getClimbPaths, type ClimbPath } from "@/lib/climb";
import type { ProfileStats } from "@/lib/ranking";
import { cn } from "@/lib/utils";

interface ActionCard {
  id: string;
  /** Small label above the title, naming what kind of move this is. */
  kind: string;
  title: string;
  body: string;
  /** Second paragraph — why it moves the score. Optional. */
  why: string | null;
  /** Typical range, or null when it depends entirely on the profile. */
  impact: string | null;
  /** Requires changing how the profile looks. Always flagged, never first. */
  optional: boolean;
  /** The single most useful next step for this user. */
  priority: boolean;
}

function pathCard(path: ClimbPath): ActionCard {
  return {
    id: `path-${path.id}`,
    kind: path.priority ? "Start here" : "Any profile",
    title: path.title,
    body: path.action,
    why: path.why,
    impact: path.impact,
    optional: path.redesign,
    priority: path.priority,
  };
}

function recommendationCard(text: string, i: number): ActionCard {
  return {
    id: `rec-${i}`,
    kind: "Specific to your profile",
    title: text,
    body: "Blink read this off your last screenshot. Make the change, upload a new one, and it counts.",
    why: null,
    impact: null,
    optional: false,
    priority: false,
  };
}

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
  const [seen, setSeen] = useState(false);

  const cards = useMemo(() => {
    const paths = getClimbPaths(stats);
    // `getClimbPaths` already sorts priority first and optional last; keeping
    // that order and slotting the recommendations behind the priority items
    // means the first card is always this user's actual next step.
    const priority = paths.filter((p) => p.priority).map(pathCard);
    const rest = paths.filter((p) => !p.priority).map(pathCard);
    return [...priority, ...recommendations.map(recommendationCard), ...rest];
  }, [stats, recommendations]);

  return (
    <section>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-blink-sky">
        <TrendingUp className="h-3.5 w-3.5" />
        How to climb
      </p>
      <p className="mt-2.5 text-sm leading-relaxed text-white/70">
        {climbHeadline(stats, rank)}
      </p>

      <div className="mt-6">
        <SwipeDeck
          items={cards}
          height={264}
          cardClassName="p-5"
          onIndexChange={(i) => {
            if (i > 0) setSeen(true);
          }}
          renderCard={(card) => <ActionCardBody card={card} />}
          footer={({ index, total }) => (
            <>
              <DeckProgress index={index} total={total} />
              <DeckStatus index={index} total={total} />
              <SwipeHint shown={!seen} />
            </>
          )}
        />
      </div>

      <p className="mt-6 text-[0.72rem] leading-relaxed text-white/35">
        You never have to redesign your profile to climb. Depth, consistency and staying
        active move the score on their own.
      </p>

      {onAnalyze && (
        <motion.button
          type="button"
          onClick={onAnalyze}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="mt-4 min-h-[48px] w-full rounded-2xl bg-blink-sky text-sm font-bold text-blink-navy"
        >
          Upload a new screenshot
        </motion.button>
      )}
    </section>
  );
}

function ActionCardBody({ card }: { card: ActionCard }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.1em]",
            card.priority
              ? "bg-blink-sky text-blink-navy"
              : "bg-white/[0.08] text-white/50",
          )}
        >
          {card.kind}
        </span>
        {card.optional && (
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white/40">
            Optional
          </span>
        )}
      </div>

      <p className="mt-3 text-[1.02rem] font-extrabold leading-snug tracking-tight text-white">
        {card.title}
      </p>

      <p className="mt-2 text-[0.8rem] leading-relaxed text-white/65">{card.body}</p>

      {card.why && (
        <p className="mt-2 text-[0.75rem] leading-relaxed text-white/40">{card.why}</p>
      )}

      {card.impact && (
        <p className="mt-auto pt-3 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-blink-sky/80">
          {card.impact}
        </p>
      )}
    </div>
  );
}
