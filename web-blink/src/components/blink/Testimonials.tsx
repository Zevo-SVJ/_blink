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
 *
 * **Cards are sized by their content.** They used to be a fixed 7.5rem tall
 * with `line-clamp-3` on the quote, which silently ate the end of the longer
 * reactions — "…my gf said thats literally just me being" and then nothing.
 * A testimonial with its punchline cut off is worse than no testimonial. The
 * width is fixed so the row stays a row; the height is whatever the words
 * need, and `items-start` in the marquee keeps them from stretching to match
 * each other.
 */

import { Heart } from "lucide-react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Marquee } from "@/components/blink/Marquee";
import { Reveal } from "@/components/blink/Reveal";
import { TESTIMONIALS, TESTIMONIALS_FR, type Testimonial } from "@/lib/blink-data";
import { useI18n, type Lang } from "@/lib/i18n";

/** Interleaved rather than split down the middle, so neither row is all shorts. */
const ROW_A = TESTIMONIALS.filter((_, i) => i % 2 === 0);
const ROW_B = TESTIMONIALS.filter((_, i) => i % 2 === 1);

function formatLikes(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

/**
 * ## Why these cards say "Example"
 *
 * They are written, not collected. Nobody named here exists, and the like
 * counts are invented. Presented as "what people said after running their own
 * profile" — the previous wording — that is a fabricated testimonial wall:
 * deceptive under French consumer law (which requires a trader to say whether
 * reviews are verified, and forbids presenting fake ones as genuine), under
 * the EU unfair commercial practices rules, and under the FTC's rule on
 * consumer reviews.
 *
 * The section keeps its job — showing the register of reaction Blink gets —
 * by being honest about what it is: the heading says these are written
 * examples, and every card carries the marker, so a reader who scrolls past
 * the heading still cannot mistake one for a real review.
 */
export function Testimonials({ onCTA }: { onCTA: () => void }) {
  const { lang, t } = useI18n();

  return (
    <section id="reactions" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-blink-sky/70">
            {t.testimonials.eyebrow}
          </p>
          <h2 className="mt-3 text-[1.75rem] font-extrabold tracking-tight text-white sm:text-4xl">
            {t.testimonials.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/50 sm:mt-4 sm:text-base">
            {t.testimonials.subtitle}
          </p>
        </Reveal>
      </div>

      {/* Full-bleed: the stream should run off both edges of the screen. */}
      <div className="mt-10 space-y-3 sm:mt-12">
        <Marquee
          items={ROW_A}
          keyFor={(card) => card.id}
          renderItem={(card) => (
            <ReactionCard card={card} badge={t.testimonials.badge} lang={lang} />
          )}
          speed={30}
        />
        <Marquee
          items={ROW_B}
          keyFor={(card) => card.id}
          renderItem={(card) => (
            <ReactionCard card={card} badge={t.testimonials.badge} lang={lang} />
          )}
          speed={24}
          direction={-1}
        />
      </div>

      <div className="mx-auto mt-12 flex max-w-3xl flex-col items-center gap-4 px-4 sm:px-6">
        <p className="text-center text-sm font-medium text-white/45">
          {t.testimonials.footer}
        </p>
        <CTAButton label={t.testimonials.cta} onClick={onCTA} size="lg" />
      </div>
    </section>
  );
}

function ReactionCard({
  card,
  badge,
  lang,
}: {
  card: Testimonial;
  badge: string;
  lang: Lang;
}) {
  const text = lang === "fr" ? (TESTIMONIALS_FR[card.id] ?? card.text) : card.text;

  return (
    <figure className="flex w-[15.5rem] flex-col rounded-2xl bg-blink-navy-2/70 p-4 ring-1 ring-white/[0.07] sm:w-[17rem]">
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
        <figcaption className="min-w-0 flex-1 truncate text-[0.75rem] font-semibold text-white/50">
          @{card.handle}
          {card.age !== undefined && (
            <span className="text-white/30"> · {card.age}</span>
          )}
        </figcaption>
        {/* Small, but on every card and never removable: a reader who never
            sees the heading still knows this is written, not collected. */}
        <span className="shrink-0 rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.08em] text-white/40">
          {badge}
        </span>
      </div>

      <blockquote className="mt-3 text-[0.9rem] font-medium leading-snug text-white">
        {text}
      </blockquote>

      {card.likes !== undefined && (
        <p className="mt-3 flex items-center gap-1.5 text-[0.7rem] font-semibold text-white/30">
          <Heart className="h-3 w-3 fill-current text-rose-400/60" aria-hidden />
          {formatLikes(card.likes)}
        </p>
      )}
    </figure>
  );
}
