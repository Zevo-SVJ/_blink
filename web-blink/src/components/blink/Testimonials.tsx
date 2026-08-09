/**
 * Blink — social proof.
 *
 * The point is "people are actually sharing this", which is undermined rather
 * than helped by volume: the previous version rendered all thirty reactions as
 * an endless marquee, which reads as filler. This shows nine of the strongest,
 * laid out as a masonry of compact social cards, plus one honest aggregate.
 *
 * The full set still lives in `blink-data`; this picks from it.
 */

import { motion } from "framer-motion";
import { Heart } from "lucide-react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import { TESTIMONIALS } from "@/lib/blink-data";
import { cn } from "@/lib/utils";

/**
 * The nine most believable and varied reactions — a mix of surprise, mild
 * self-roast and one sceptic, rather than nine variations of "wow".
 */
const FEATURED_IDS = ["1", "22", "17", "2", "30", "3", "21", "13", "20"];

const featured = FEATURED_IDS.map((id) => TESTIMONIALS.find((t) => t.id === id)!).filter(
  Boolean,
);

function formatLikes(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

export function Testimonials({ onCTA }: { onCTA: () => void }) {
  return (
    <section id="reactions" className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            People can&rsquo;t stop comparing scores.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/50">
            Reactions from people who ran their own profile.
          </p>
        </Reveal>

        {/* Masonry so cards keep their natural height and the column reads as a
            feed rather than a grid of equal boxes. */}
        <div className="mt-12 columns-1 gap-3 sm:columns-2 sm:mt-14 lg:columns-3">
          {featured.map((t, i) => (
            <ReactionCard key={t.id} testimonial={t} index={i} />
          ))}
        </div>

        <Reveal delay={0.05} className="mt-12 flex flex-col items-center gap-4">
          <p className="text-sm font-medium text-white/40">
            Find out what your Instagram says about you
          </p>
          <CTAButton label="See my first impression" onClick={onCTA} size="lg" />
        </Reveal>
      </div>
    </section>
  );
}

function ReactionCard({
  testimonial,
  index,
}: {
  testimonial: (typeof TESTIMONIALS)[number];
  index: number;
}) {
  const { handle, initial, text, likes, hue } = testimonial;

  return (
    <Reveal
      // Small, capped stagger: enough to feel alive, never enough to wait for.
      delay={Math.min(index * 0.04, 0.2)}
      className="mb-3 break-inside-avoid"
    >
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: `linear-gradient(140deg, hsl(${hue} 60% 42%), hsl(${hue} 70% 28%))` }}
            aria-hidden
          >
            {initial}
          </span>
          <span className="min-w-0 truncate text-xs font-semibold text-white/55">
            @{handle}
          </span>
        </div>

        <p className="mt-3 text-[0.95rem] leading-relaxed text-white/85">{text}</p>

        {likes !== undefined && (
          <p className={cn("mt-3 flex items-center gap-1.5 text-xs font-semibold text-white/35")}>
            <Heart className="h-3.5 w-3.5 fill-current text-rose-400/70" />
            {formatLikes(likes)}
          </p>
        )}
      </motion.div>
    </Reveal>
  );
}
