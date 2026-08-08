import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";

/** Floating CTA for mobile — appears after the hero and before the final CTA. */
export function MobileCTA({ onCTA }: { onCTA: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.85;
      const nearBottom =
        window.scrollY + window.innerHeight > document.documentElement.scrollHeight - 1100;
      setVisible(pastHero && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-4 bottom-4 z-40 flex justify-center md:hidden"
        >
          <CTAButton
            label="See my first impression"
            onClick={onCTA}
            className="w-full max-w-sm justify-center py-3.5 shadow-[0_10px_40px_-8px_rgba(0,0,0,0.3)]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
