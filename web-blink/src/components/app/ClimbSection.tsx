/**
 * t.climb.title — the concrete ways to move up, as a deck.
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
 *
 * Every card carries what to try, why it helps, and what it explicitly does
 * not ask you to change. The third line is not padding: without it, a card
 * about identity still reads as "so you want me to become someone else", which
 * is the exact reaction the section exists to prevent.
 */

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { DeckProgress, DeckStatus, SwipeDeck, SwipeHint } from "@/components/blink/SwipeDeck";
import {
  trackLabel,
  climbHeadline,
  getClimbPaths,
  type ClimbIdentity,
  type ClimbPath,
  type ClimbTrack,
} from "@/lib/climb";
import type { ProfileStats } from "@/lib/ranking";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { Messages } from "@/lib/messages";

interface ActionCard {
  id: string;
  /** Which of the three routes up this belongs to. */
  track: ClimbTrack | null;
  /** Small label above the title, naming what kind of move this is. */
  kind: string;
  title: string;
  /** What to actually do. */
  whatToTry: string;
  /** Why it moves the score. */
  why: string | null;
  /** What this card explicitly is not asking for. */
  notNeeded: string | null;
  /** Typical range, or null when it depends entirely on the profile. */
  impact: string | null;
  /** Requires changing how the profile looks. Always flagged, never first. */
  optional: boolean;
  /** The single most useful next step for this user. */
  priority: boolean;
}

function pathCard(path: ClimbPath, t: Messages): ActionCard {
  return {
    id: `path-${path.id}`,
    track: path.track,
    kind: path.priority ? t.climb.startHere : path.kind,
    title: path.title,
    whatToTry: path.whatToTry,
    why: path.why,
    notNeeded: path.notNeeded,
    impact: path.impact,
    optional: path.redesign,
    priority: path.priority,
  };
}

function recommendationCard(text: string, i: number, t: Messages): ActionCard {
  return {
    id: `rec-${i}`,
    track: "perception",
    kind: t.climb.readOff,
    title: text,
    whatToTry:
      t.climb.body,
    why: null,
    notNeeded: null,
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
  /** What Blink already believes about this profile, for the identity path. */
  identity,
  onAnalyze,
}: {
  stats: ProfileStats;
  rank: number | null;
  recommendations?: string[];
  identity?: ClimbIdentity;
  onAnalyze?: () => void;
}) {
  const t = useT();
  const [seen, setSeen] = useState(false);
  const [index, setIndex] = useState(0);

  const cards = useMemo(() => {
    const paths = getClimbPaths(stats, identity, t);
    // `getClimbPaths` already sorts priority first and optional last; keeping
    // that order and slotting the recommendations behind the priority items
    // means the first card is always this user's actual next step.
    const priority = paths.filter((p) => p.priority).map((p) => pathCard(p, t));
    const rest = paths.filter((p) => !p.priority).map((p) => pathCard(p, t));
    return [
      ...priority,
      ...recommendations.map((text, i) => recommendationCard(text, i, t)),
      ...rest,
    ];
  }, [stats, recommendations, identity]);

  const activeTrack = cards[index]?.track ?? null;

  return (
    <section>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-blink-sky">
        <TrendingUp className="h-3.5 w-3.5" />
        {t.climb.title}
      </p>
      <p className="mt-2.5 text-sm leading-relaxed text-white/70">
        {climbHeadline(stats, rank, t)}
      </p>

      {/* The three routes, stated up front. Someone who likes their profile
          exactly as it is needs to see that before they see any advice. */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(["perception", "momentum", "recognition"] as ClimbTrack[]).map((track) => (
          <span
            key={track}
            className={cn(
              "rounded-full px-2.5 py-1 text-[0.65rem] font-bold transition-colors",
              track === activeTrack
                ? "bg-blink-sky/20 text-blink-sky ring-1 ring-blink-sky/30"
                : "bg-white/[0.05] text-white/35 ring-1 ring-white/[0.06]",
            )}
          >
            {trackLabel(track, t)}
            {track === "perception" && (
              <span className="ml-1 font-semibold opacity-60">· optional</span>
            )}
          </span>
        ))}
      </div>

      <div className="mt-6">
        <SwipeDeck
          items={cards}
          height={264}
          cardClassName="p-5"
          onIndexChange={(i) => {
            setIndex(i);
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
        {t.climb.noRedesign}
      </p>

      {onAnalyze && (
        <motion.button
          type="button"
          onClick={onAnalyze}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="mt-4 min-h-[48px] w-full rounded-2xl bg-blink-sky text-sm font-bold text-blink-navy"
        >
          {t.climb.uploadNew}
        </motion.button>
      )}
    </section>
  );
}

function ActionCardBody({ card }: { card: ActionCard }) {
  const t = useT();

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
        {card.track && (
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white/45">
            {trackLabel(card.track, t)}
          </span>
        )}
        {card.optional && (
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white/40">
            Optional
          </span>
        )}
      </div>

      <p className="mt-3 text-[1.02rem] font-extrabold leading-snug tracking-tight text-white">
        {card.title}
      </p>

      <p className="mt-2 text-[0.8rem] leading-relaxed text-white/70">{card.whatToTry}</p>

      {card.why && (
        <p className="mt-2.5 text-[0.75rem] leading-relaxed text-white/40">
          <span className="font-bold text-white/55">{t.climb.whyThisHelps} </span>
          {card.why}
        </p>
      )}

      {/* The reassurance is the point of the whole section, so it is never
          collapsed away or left to the reader to infer. */}
      {card.notNeeded && (
        <p className="mt-2 text-[0.75rem] leading-relaxed text-emerald-300/60">
          <span className="font-bold">{t.climb.noNeedToChange} </span>
          {card.notNeeded}
        </p>
      )}

      {card.impact && (
        <p className="mt-auto pt-3 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-blink-sky/80">
          {card.impact}
        </p>
      )}
    </div>
  );
}
