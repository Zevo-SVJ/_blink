/**
 * Blink — social proof as a moving stream.
 *
 * Two rows drifting in opposite directions, never stopping, no controls. The
 * deck that lived here read as one person's opinion at a time and required a
 * gesture to see a second; a stream reads as volume, which is the thing social
 * proof is actually for. Nothing here is interactive, so there is no state to
 * get stuck in and nothing to discover.
 *
 * Splitting the thirty-four reactions across two rows rather than looping one
 * long row matters: opposite directions mean two cards never travel together
 * for long, so the eye can't latch onto a repeating pattern.
 */

import { Heart } from "lucide-react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Marquee } from "@/components/blink/Marquee";
import { Reveal } from "@/components/blink/Reveal";
import { TESTIMONIALS, type Testimonial } from "@/lib/blink-data";

/** Interleaved rather than split down the middle, so neither row is all shorts. */
const ROW_A = TESTIMONIALS.filter((_, i) => i % 2 === 0);
const ROW_B = TESTIMONIALS.filter((_, i) => i % 2 === 1);

function formatLikes(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

export function Testimonials({ onCTA }: { onCTA: () => void }) {
  return (
    <section id="reactions" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-blink-sky/70">
            Reactions
          </p>
          <h2 className="mt-3 text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
            People can&rsquo;t stop comparing scores.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/50 sm:mt-4 sm:text-base">
            What people said after running their own profile.
          </p>
        </Reveal>
      </div>

      {/* Full-bleed: the stream should run off both edges of the screen. */}
      <div className="mt-10 space-y-3 sm:mt-12">
        <Marquee
          items={ROW_A}
          keyFor={(t) => t.id}
          renderItem={(t) => <ReactionCard card={t} />}
          speed={30}
        />
        <Marquee
          items={ROW_B}
          keyFor={(t) => t.id}
          renderItem={(t) => <ReactionCard card={t} />}
          speed={24}
          direction={-1}
        />
      </div>

      <div className="mx-auto mt-12 flex max-w-3xl flex-col items-center gap-4 px-4 sm:px-6">
        <p className="text-center text-sm font-medium text-white/45">
          Find out what your Instagram says about you
        </p>
        <CTAButton label="See my first impression" onClick={onCTA} size="lg" />
      </div>
    </section>
  );
}

function ReactionCard({ card }: { card: Testimonial }) {
  return (
    <figure className="flex h-[7.5rem] w-[15.5rem] flex-col rounded-2xl bg-blink-navy-2/70 p-4 ring-1 ring-white/[0.07] sm:w-[17rem]">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{
            background: `linear-gradient(140deg, hsl(${card.hue} 60% 44%), hsl(${card.hue} 70% 28%))`,
          }}
          aria-hidden
        >
          {card.initial}
        </span>
        <figcaption className="min-w-0 truncate text-[0.75rem] font-semibold text-white/50">
          @{card.handle}
          {card.age !== undefined && (
            <span className="text-white/30"> · {card.age}</span>
          )}
        </figcaption>
      </div>

      <blockquote className="mt-3 line-clamp-3 text-[0.9rem] font-medium leading-snug text-white">
        {card.text}
      </blockquote>

      {card.likes !== undefined && (
        <p className="mt-auto flex items-center gap-1.5 pt-2 text-[0.7rem] font-semibold text-white/30">
          <Heart className="h-3 w-3 fill-current text-rose-400/60" aria-hidden />
          {formatLikes(card.likes)}
        </p>
      )}
    </figure>
  );
}
