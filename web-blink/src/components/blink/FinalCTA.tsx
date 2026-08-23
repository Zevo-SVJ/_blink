import { motion } from "framer-motion";

import { CTAButton } from "@/components/blink/CTAButton";
import { BlinkLogo } from "@/components/blink/BlinkLogo";
import { Reveal } from "@/components/blink/Reveal";
import { useT } from "@/lib/i18n";

export function FinalCTA({ onCTA }: { onCTA: () => void }) {
  const t = useT();

  return (
    <section className="relative overflow-hidden px-4 py-28 sm:px-6 sm:py-40">
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        <Reveal>
          <div className="relative">
            <div className="animate-blink-breathe absolute -inset-8 rounded-full bg-blink-sky/20 blur-3xl" />
            <motion.div whileHover={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              <BlinkLogo width={72} className="animate-blink-float relative" />
            </motion.div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <h2 className="t-display mt-10 text-balance text-white">
            {t.brand.tagline}
          </h2>
        </Reveal>

        <Reveal delay={0.22}>
          <p className="t-body mt-5 max-w-md text-balance text-[length:var(--t-body-lg)] leading-relaxed text-white/50">
            {t.finalCta.subtitle}
          </p>
        </Reveal>

        <Reveal delay={0.32}>
          <div className="mt-10">
            <CTAButton label={t.brand.cta} size="lg" onClick={onCTA} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
