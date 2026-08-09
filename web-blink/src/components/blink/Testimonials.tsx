/**
 * Blink — social proof as a swipeable deck.
 *
 * A wall of testimonials reads as filler; a deck you flick through reads as
 * people reacting one after another. The physics now live in `SwipeDeck`,
 * shared with the climb actions inside the app, so Blink's signature
 * interaction feels the same everywhere.
 *
 * This surface keeps its arrows: on a marketing page a visitor may never think
 * to try dragging, and the count doubles as proof that there are more of these
 * than fit on screen. Inside the app the same deck ships without them.
 */

import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import { SwipeDeck } from "@/components/blink/SwipeDeck";
import { TESTIMONIALS } from "@/lib/blink-data";

/** The strongest, most varied reactions — surprise, self-roast, one sceptic. */
const DECK_IDS = ["1", "22", "17", "2", "30", "3", "21", "13", "20", "5"];

const DECK = DECK_IDS.map((id) => TESTIMONIALS.find((t) => t.id === id)).filter(
  (t): t is (typeof TESTIMONIALS)[number] => Boolean(t),
);

function formatLikes(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

export function Testimonials({ onCTA }: { onCTA: () => void }) {
  const [, setIndex] = useState(0);

  return (
    <section id="reactions" className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-blink-sky/70">
            Reactions
          </p>
          <h2 className="mt-3 text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
            People can&rsquo;t stop comparing scores.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/50 sm:mt-4 sm:text-base">
            Swipe through what people said after running their own profile.
          </p>
        </Reveal>

        <Reveal delay={0.05} className="mt-10 sm:mt-12">
          <SwipeDeck
            items={DECK}
            height={196}
            className="mx-auto w-full max-w-[336px]"
            cardClassName="p-5"
            onIndexChange={setIndex}
            renderCard={(card, isFront) => (
              <ReactionCard card={card} isFront={isFront} />
            )}
            footer={({ index, total, go }) => (
              <div className="mt-10 flex items-center justify-center gap-3">
                <DeckButton label="Previous reaction" onClick={() => go(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </DeckButton>
                <span className="text-[0.7rem] font-semibold tabular-nums text-white/30">
                  {index + 1} / {total}
                </span>
                <DeckButton label="Next reaction" onClick={() => go(1)}>
                  <ChevronRight className="h-4 w-4" />
                </DeckButton>
              </div>
            )}
          />
        </Reveal>

        <Reveal delay={0.05} className="mt-12 flex flex-col items-center gap-4">
          <p className="text-center text-sm font-medium text-white/45">
            Find out what your Instagram says about you
          </p>
          <CTAButton label="See my first impression" onClick={onCTA} size="lg" />
        </Reveal>
      </div>
    </section>
  );
}

function DeckButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-white/60 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12] hover:text-white"
    >
      {children}
    </button>
  );
}

function ReactionCard({
  card,
  isFront,
}: {
  card: (typeof TESTIMONIALS)[number];
  isFront: boolean;
}) {
  return (
    <div className="relative h-full">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{
            background: `linear-gradient(140deg, hsl(${card.hue} 60% 44%), hsl(${card.hue} 70% 28%))`,
          }}
          aria-hidden
        >
          {card.initial}
        </span>
        <span className="min-w-0 truncate text-[0.8rem] font-semibold text-white/55">
          @{card.handle}
        </span>
      </div>

      <p className="mt-4 text-[1.05rem] font-medium leading-snug text-white">{card.text}</p>

      {card.likes !== undefined && (
        <p className="absolute bottom-0 left-0 flex items-center gap-1.5 text-xs font-semibold text-white/35">
          <Heart className="h-3.5 w-3.5 fill-current text-rose-400/70" aria-hidden />
          {formatLikes(card.likes)}
        </p>
      )}

      {isFront && (
        <p className="absolute bottom-0 right-0 text-[0.65rem] font-semibold text-white/20">
          swipe
        </p>
      )}
    </div>
  );
}
