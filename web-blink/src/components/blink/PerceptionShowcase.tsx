import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import { ScoreRing } from "@/components/blink/ScoreRing";
import { PERCEPTIONS } from "@/lib/blink-data";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  crush: "crush",
  stranger: "stranger",
  friends: "friends",
  recruiter: "recruiter",
  "green-flag": "green flag",
  "red-flag": "red flag",
};

export function PerceptionShowcase({ onCTA }: { onCTA: () => void }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.4 });
  const [active, setActive] = useState(0);
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    if (!inView || interacted) return;
    const interval = window.setInterval(() => {
      setActive((i) => (i + 1) % PERCEPTIONS.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [inView, interacted]);

  const select = (index: number) => {
    setInteracted(true);
    setActive(index);
  };

  const current = PERCEPTIONS[active];

  return (
    <section
      id="perceptions"
      ref={sectionRef}
      className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            One profile. Multiple impressions.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/50">
            Blink reveals how the same profile reads from six different perspectives.
          </p>
        </Reveal>

        <div className="relative mx-auto mt-14 w-full max-w-2xl rounded-[2.5rem] border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_80px_-20px_rgba(175,224,249,0.06)] sm:mt-16 sm:p-10">
          <div className="flex min-h-[300px] flex-col items-center text-center sm:min-h-[280px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex flex-col items-center"
              >
                <span className="text-3xl sm:text-4xl">{current.emoji}</span>
                <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">
                  {current.title}
                </h3>
                <p className="mt-4 max-w-md text-base leading-relaxed text-white/60 sm:text-lg">
                  &ldquo;{current.quote}&rdquo;
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {current.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "rounded-full px-3.5 py-1 text-xs font-semibold",
                        tag === current.traits[0]
                          ? "bg-blink-sky text-blink-navy"
                          : "bg-white/10 text-white/70",
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-7">
                  <ScoreRing value={current.score} size={90} light />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <Reveal delay={0.1} className="mt-8">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {PERCEPTIONS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => select(i)}
                className={cn(
                  "flex flex-col items-center rounded-2xl px-5 py-3 text-center transition-all duration-200 sm:px-6",
                  i === active
                    ? "bg-blink-sky text-blink-navy"
                    : "border border-white/10 text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <span className="text-xl sm:text-2xl">{p.emoji}</span>
                <span className="mt-1 text-xs font-semibold sm:text-sm">
                  {labels[p.id]}
                </span>
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.05} className="mt-12 flex justify-center">
          <CTAButton label="How would people see me?" onClick={onCTA} />
        </Reveal>
      </div>
    </section>
  );
}
