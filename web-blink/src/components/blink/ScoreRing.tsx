import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

interface ScoreRingProps {
  /** Score out of 10 */
  value: number;
  /** Diameter in px */
  size?: number;
  /** Restart animation whenever this changes */
  playKey?: number | string;
  showOutOf?: boolean;
  /** Light variant for use on dark surfaces */
  light?: boolean;
}

/** Animated circular score — the Blink result moment. */
export function ScoreRing({
  value,
  size = 150,
  playKey = 0,
  showOutOf = true,
  light = true,
}: ScoreRingProps) {
  const stroke = Math.max(5, size * 0.05);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const progress = useMotionValue(0);
  const display = useTransform(progress, (v: number) => (v * value).toFixed(1));
  const dashOffset = useTransform(progress, (v: number) => circumference * (1 - (v * value) / 10));

  useEffect(() => {
    progress.set(0);
    const controls = animate(progress, 1, {
      duration: 1.2,
      delay: 0.1,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [playKey, progress, value]);

  const trackColor = light ? "hsl(var(--blink-navy-3))" : "hsl(var(--blink-cloud-2))";
  const textColor = light ? "text-white" : "text-blink-navy";
  const subColor = light ? "text-white/45" : "text-blink-gray/60";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--blink-sky))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className={cn("font-extrabold tracking-tight", textColor)} style={{ fontSize: size * 0.26, lineHeight: 1 }}>
          {display}
        </motion.span>
        {showOutOf && (
          <span className={cn("mt-1 font-semibold", subColor)} style={{ fontSize: size * 0.09 }}>
            / 10
          </span>
        )}
      </div>
    </div>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
