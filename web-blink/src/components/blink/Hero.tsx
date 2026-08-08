import { motion } from "framer-motion";

import { CTAButton } from "@/components/blink/CTAButton";
import { BLINK_LOGO, BRAND } from "@/lib/brand";

export function Hero({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 sm:pb-28 sm:pt-40 lg:pb-32">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
          className="inline-flex items-start gap-3 sm:gap-6"
        >
          <img
            src={BLINK_LOGO}
            alt={BRAND.name}
            className="h-14 w-14 shrink-0 select-none rounded-2xl shadow-[0_0_40px_-12px_rgba(175,224,249,0.25)] sm:h-20 sm:w-20"
            draggable={false}
          />
          <h1 className="text-left text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="block">See yourself the way</span>
            {/* `pb-*` gives the inline box room below the baseline so the rule
                clears the descender of the "y" instead of striking through it —
                the tight leading pulls the box above the glyph otherwise. */}
            <span className="relative inline-block pb-2.5 sm:pb-3.5">
              others see you.
              <span className="absolute bottom-0 left-0 h-1.5 w-full overflow-hidden rounded-full bg-blink-sky sm:h-2">
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full animate-underline-sweep"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 45%, rgba(255,255,255,0.85) 55%, transparent 100%)",
                  }}
                />
              </span>
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
          className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/55 sm:text-lg"
        >
          Blink analyzes your Instagram presence and reveals the first impression you make.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.3 }}
          className="mt-8 flex justify-center"
        >
          <CTAButton label={BRAND.cta} onClick={onCTA} size="lg" />
        </motion.div>

        {/* Answers the three objections people have before uploading, in one
            quiet line. Plain text rather than badges — the brief is minimal. */}
        <motion.ul
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.42 }}
          className="mx-auto mt-7 flex max-w-md flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-white/35 sm:text-sm"
        >
          {["Free to try", "No Instagram login", "Screenshot never stored"].map((item, i) => (
            <li key={item} className="flex items-center gap-5">
              {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-white/20" />}
              {item}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
