import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { CTAButton } from "@/components/blink/CTAButton";
import { Reveal } from "@/components/blink/Reveal";
import { ScoreRing } from "@/components/blink/ScoreRing";

const STAGES = [
  { id: "profile", label: "Profile" },
  { id: "upload", label: "Upload" },
  { id: "analysis", label: "Analysis" },
  { id: "perception", label: "Perception" },
  { id: "result", label: "Result" },
];

const STAGE_DURATION = 1800;

const SIGNALS = ["Visual identity", "Content", "Social signals", "Profile picture", "Aesthetic"];
const TRAITS = ["Confident", "Mysterious", "High-status"];

const spring = { type: "spring", stiffness: 340, damping: 30 } as const;
const exit = { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.3 } } as const;

export function HowItWorks({ onCTA }: { onCTA: () => void }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.4 });
  const [stage, setStage] = useState(0);
  const [loopKey, setLoopKey] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let step = 0;
    let timer: number;
    const run = () => {
      timer = window.setTimeout(() => {
        step = (step + 1) % STAGES.length;
        setStage(step);
        if (step === 0) setLoopKey((k) => k + 1);
        run();
      }, STAGE_DURATION);
    };
    run();
    return () => window.clearTimeout(timer);
  }, [inView, loopKey]);

  useEffect(() => {
    if (!inView) setStage(0);
  }, [inView]);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/50">
            One seamless flow. Your profile becomes a perception in seconds.
          </p>
        </Reveal>

        <div className="relative mx-auto mt-14 aspect-square w-full max-w-[360px] sm:mt-16 sm:max-w-[420px]">
          <div className="absolute inset-0 rounded-[2.5rem] border border-white/8 bg-white/[0.02]" />
          <div className="relative flex h-full items-center justify-center p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {stage === 0 && <ProfileStage key={`profile-${loopKey}`} />}
              {stage === 1 && <UploadStage key={`upload-${loopKey}`} />}
              {stage === 2 && <AnalysisStage key={`analysis-${loopKey}`} />}
              {stage === 3 && <PerceptionStage key={`perception-${loopKey}`} />}
              {stage === 4 && <ResultStage key={`result-${loopKey}`} onCTA={onCTA} />}
            </AnimatePresence>
          </div>

          <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5">
            {STAGES.map((s, i) => (
              <motion.div
                key={s.id}
                className="h-1.5 rounded-full bg-white"
                initial={false}
                animate={{
                  width: i === stage ? 20 : 6,
                  opacity: i === stage ? 1 : 0.25,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            ))}
          </div>
        </div>

        <Reveal delay={0.1} className="mt-12 flex justify-center">
          <CTAButton label="I want to see mine" onClick={onCTA} />
        </Reveal>
      </div>
    </section>
  );
}

function ProfileStage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={exit}
      transition={spring}
      className="flex w-full flex-col items-center"
    >
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blink-sky to-blink-sky-bright" />
      <p className="mt-3 text-sm font-bold text-white">you</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[0.5, 0.7, 0.4, 0.6, 0.8, 0.5].map((opacity, i) => (
          <div key={i} className="h-14 w-14 rounded-lg bg-white/15" style={{ opacity }} />
        ))}
      </div>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-white/40">Your profile</p>
    </motion.div>
  );
}

function UploadStage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={exit}
      transition={spring}
      className="flex w-full flex-col items-center"
    >
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blink-sky to-blink-sky-bright" />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.2 }}
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-blink-navy"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </motion.div>
      </div>
      <p className="mt-4 text-sm font-bold text-white">you</p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
        className="mt-5 rounded-2xl bg-blink-sky px-6 py-3 text-sm font-semibold text-blink-navy"
      >
        Upload profile
      </motion.div>
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-white/40">Screenshot</p>
    </motion.div>
  );
}

function AnalysisStage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={exit}
      transition={{ duration: 0.3 }}
      className="relative flex h-full w-full items-center justify-center"
    >
      <div className="relative h-24 w-24 rounded-full border border-blink-sky/40 bg-blink-sky/10">
        <div className="absolute inset-0 rounded-full border border-blink-sky/20" />
        <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blink-sky to-blink-sky-bright" />
      </div>

      {SIGNALS.map((label, i) => {
        const angle = (i * 360) / SIGNALS.length - 90;
        const radius = 110;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        return (
          <motion.div
            key={label}
            className="absolute flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 shadow-sm backdrop-blur-sm"
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, x, y, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: i * 0.1 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blink-sky-bright" />
            <span className="text-[10px] font-bold text-white/90 sm:text-xs">{label}</span>
          </motion.div>
        );
      })}
      <p className="absolute bottom-8 text-xs font-bold uppercase tracking-widest text-white/40">Reading signals</p>
    </motion.div>
  );
}

function PerceptionStage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={exit}
      transition={{ duration: 0.3 }}
      className="relative flex h-full w-full items-center justify-center"
    >
      <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-blink-sky to-blink-sky-bright" />
      {TRAITS.map((trait, i) => {
        const angle = (i - 1) * 55 - 90;
        const radius = 105;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        return (
          <motion.div
            key={trait}
            className="absolute rounded-full bg-blink-sky px-3.5 py-1.5 text-xs font-bold text-blink-navy"
            initial={{ opacity: 0, x: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, x, y, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 24, delay: i * 0.12 }}
          >
            {trait}
          </motion.div>
        );
      })}
      <p className="absolute bottom-8 text-xs font-bold uppercase tracking-widest text-white/40">Interpretation</p>
    </motion.div>
  );
}

function ResultStage({ onCTA }: { onCTA: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
      transition={spring}
      className="flex flex-col items-center"
    >
      <ScoreRing value={8.7} size={130} light />
      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-white/50">First impression</p>
      <div className="mt-4 flex gap-2">
        {TRAITS.map((t) => (
          <span
            key={t}
            className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90"
          >
            {t}
          </span>
        ))}
      </div>
      <motion.button
        type="button"
        onClick={onCTA}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="mt-6 rounded-2xl bg-blink-sky px-5 py-2.5 text-sm font-bold text-blink-navy"
      >
        See mine
      </motion.button>
    </motion.div>
  );
}
