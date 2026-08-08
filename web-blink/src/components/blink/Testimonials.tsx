import { Heart } from "lucide-react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import { TESTIMONIALS, type Testimonial } from "@/lib/blink-data";

function Card({ t }: { t: Testimonial }) {
  return (
    <div className="mr-3 w-[260px] shrink-0 rounded-2xl border border-white/8 bg-white/[0.04] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.15)] sm:mr-4 sm:w-[290px] sm:p-5">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
          style={{
            background: `linear-gradient(135deg, hsl(${t.hue} 75% 62%), hsl(${(t.hue + 40) % 360} 70% 50%))`,
          }}
        >
          {t.initial}
        </span>
        <span className="text-xs font-semibold text-white/50">@{t.handle}</span>
      </div>
      <p className="mt-2.5 text-sm font-medium leading-relaxed text-white/85">{t.text}</p>
      {typeof t.likes === "number" && (
        <p className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-white/40">
          <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />
          {t.likes.toLocaleString()}
        </p>
      )}
    </div>
  );
}

export function Testimonials({ onCTA }: { onCTA: () => void }) {
  const rowA = TESTIMONIALS.slice(0, 15);
  const rowB = TESTIMONIALS.slice(15);

  return (
    <section id="reactions" className="overflow-hidden pb-20 pt-4 sm:pb-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            People can&rsquo;t stop comparing scores.
          </h2>
        </Reveal>
      </div>

      <div className="mt-12 space-y-3">
        {[
          { row: rowA, duration: "55s" },
          { row: rowB, duration: "68s" },
        ].map(({ row, duration }, i) => (
          <div key={i} className="stream-mask overflow-hidden">
            <div className="stream-track" style={{ ["--stream-duration" as string]: duration }}>
              {[0, 1, 2, 3].map((half) => (
                <div key={half} className="flex shrink-0">
                  {row.map((t) => (
                    <Card key={`${half}-${t.id}`} t={t} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Reveal delay={0.05} className="mt-14 flex justify-center px-4">
        <CTAButton label="Find out what your Instagram says about you" onClick={onCTA} className="text-center" />
      </Reveal>
    </section>
  );
}
