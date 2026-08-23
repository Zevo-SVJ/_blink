/**
 * A camera over the frame.
 *
 * ## Never static
 *
 * `drift` is on by default and is the point: even when nothing else is
 * happening the frame is creeping from 1.0 to about 1.05 over the scene. It is
 * too slow to notice and it is the difference between a video and a slide.
 *
 * ## Shake is deterministic
 *
 * Two detuned sine waves, decaying — not random. The same frame must shake by
 * the same amount on every render or a re-render is a different film. Noise
 * would also read as a glitch, and the glitch is a separate, deliberate effect
 * that appears exactly once.
 */

import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export interface Shake {
  /** Frame the impact lands on. */
  at: number;
  /** Pixels at the peak. */
  amount: number;
  /** Frames to decay over. */
  decay?: number;
}

export function Camera({
  children,
  /** `[from, to]` scale, applied over `over`. */
  zoom,
  over,
  /**
   * The scale, straight from a function of the absolute frame.
   *
   * For a move that does not begin and end inside one scene: `zoom`/`over`
   * bakes in its own easing, so two scenes sharing a move each get their own
   * curve and the join between them stops. Takes precedence over `zoom`.
   */
  scaleAt,
  origin = [540, 960],
  /** Continuous creep, as a scale gained across `driftOver` frames. */
  drift = 0.05,
  driftOver = 60,
  shake,
  style,
}: {
  children: ReactNode;
  zoom?: [number, number];
  over?: [number, number];
  scaleAt?: (frame: number) => number;
  origin?: [number, number];
  drift?: number;
  driftOver?: number;
  shake?: Shake | Shake[];
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();

  /* The deliberate move, if there is one. */
  let scale = 1;
  if (scaleAt) {
    scale = scaleAt(frame);
  } else if (zoom && over && over[1] > over[0]) {
    scale = interpolate(frame, over, zoom, {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  } else if (zoom) {
    scale = zoom[1];
  }

  /* The creep, always. */
  scale *= 1 + (drift * Math.min(1, Math.max(0, frame / driftOver)));

  let sx = 0;
  let sy = 0;
  for (const s of Array.isArray(shake) ? shake : shake ? [shake] : []) {
    const t = frame - s.at;
    if (t < 0) continue;
    const decay = Math.exp(-t / (s.decay ?? 5));
    sx += Math.sin(t * 2.1) * s.amount * decay;
    sy += Math.cos(t * 2.9) * s.amount * 0.72 * decay;
  }

  return (
    <AbsoluteFill
      style={{
        transform: `translate3d(${sx}px, ${sy}px, 0) scale(${scale})`,
        transformOrigin: `${origin[0]}px ${origin[1]}px`,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}
