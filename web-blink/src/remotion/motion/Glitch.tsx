/**
 * The pattern interrupt.
 *
 * Chromatic aberration: the picture drawn three times, once per channel,
 * offset horizontally and composited additively. That is what a torn signal
 * actually looks like, and it is the reason this reads as the image failing
 * rather than as a filter being applied.
 *
 * It fires **once** in the film, over about eight frames. A film that glitches
 * on every cut has no cuts — the effect only means anything because everything
 * around it is clean.
 */

import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export function Glitch({
  children,
  at,
  duration = 8,
  /** Peak channel separation, in pixels. */
  amount = 26,
}: {
  children: ReactNode;
  at: number;
  duration?: number;
  amount?: number;
}) {
  const frame = useCurrentFrame();
  const t = frame - at;

  if (t < 0 || t > duration) return <>{children}</>;

  /* Stepped, not smooth: a tear that eases is a transition. These are the
     frames it is torn on, and the amount jumps between them. */
  const steps = [1, 0.35, 0.9, 0.2, 0.7, 0.12, 0.4, 0.05, 0];
  const k = steps[Math.min(steps.length - 1, t)] ?? 0;
  const dx = amount * k;
  /* Horizontal slip of the whole frame, in the opposite direction. */
  const slip = interpolate(t % 3, [0, 2], [-1, 1]) * amount * k * 0.6;

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `translateX(${-dx + slip}px)`,
          filter: "url(#glitch-r)",
          mixBlendMode: "screen",
        }}
      >
        {children}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `translateX(${dx + slip}px)`,
          filter: "url(#glitch-c)",
          mixBlendMode: "screen",
        }}
      >
        {children}
      </AbsoluteFill>

      {/* Channel isolation. Cheaper and more predictable than a CSS filter
          chain, and it renders identically headless. */}
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id="glitch-r">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
            />
          </filter>
          <filter id="glitch-c">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>
    </AbsoluteFill>
  );
}
