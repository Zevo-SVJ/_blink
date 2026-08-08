import { motion } from "framer-motion";

import { CTAButton } from "@/components/blink/CTAButton";
import { BlinkLogo } from "@/components/blink/BlinkLogo";
import { Reveal } from "@/components/blink/Reveal";
import { BRAND } from "@/lib/brand";

export function FinalCTA({ onCTA }: { onCTA: () => void }) {
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
          <h2 className="mt-10 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
            {BRAND.tagline}
          </h2>
        </Reveal>

        <Reveal delay={0.22}>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/50 sm:text-lg">
            Your first impression is already out there. Blink shows it to you.
          </p>
        </Reveal>

        <Reveal delay={0.32}>
          <div className="mt-10">
            <CTAButton label={BRAND.cta} size="lg" onClick={onCTA} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
