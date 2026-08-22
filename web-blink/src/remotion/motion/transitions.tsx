/**
 * Transitions that are objects moving, not opacity changing.
 *
 * Each of these is motivated: something on screen physically carries the cut.
 * A bar sweeps across and the next shot is behind it. The frame whips sideways
 * and lands on the next one. A shape grows out of a point and becomes the new
 * background. That is the difference between an edit and a slideshow, and it
 * is the note the previous cut failed.
 */

import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { C, HEIGHT, WIDTH } from "../theme";

const expoOut = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
const expoIn = (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));

/**
 * A solid bar crosses the frame and takes the picture with it.
 *
 * The classic object wipe. The bar is brand-coloured and thick enough to hide
 * the seam, so the outgoing and incoming shots never coexist on screen — which
 * is what stops it reading as a dissolve.
 */
export function ObjectWipe({
  start,
  duration = 14,
  color = C.sky,
  direction = "right",
}: {
  start: number;
  duration?: number;
  color?: string;
  direction?: "right" | "left" | "up";
}) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (v) => (v < 0.5 ? expoIn(v * 2) / 2 : 0.5 + expoOut((v - 0.5) * 2) / 2),
  });

  if (t <= 0 || t >= 1) return null;

  const span = direction === "up" ? HEIGHT : WIDTH;
  // Travels from fully outside one side to fully outside the other.
  const pos = -span * 1.15 + t * span * 2.3;

  const common = {
    position: "absolute" as const,
    background: color,
  };

  return (
    <AbsoluteFill style={{ zIndex: 60 }}>
      <div
        style={
          direction === "up"
            ? { ...common, left: 0, right: 0, height: HEIGHT * 1.15, top: -pos }
            : {
                ...common,
                top: 0,
                bottom: 0,
                width: WIDTH * 1.15,
                left: direction === "right" ? pos : -pos,
              }
        }
      />
    </AbsoluteFill>
  );
}

/**
 * The frame is thrown sideways and lands on the next shot.
 *
 * Blur along the direction of travel is what sells it — a whip pan without
 * motion blur is just a fast slide. The blur peaks at the midpoint, where a
 * real camera would be moving fastest.
 */
export function WhipPan({
  children,
  start,
  duration = 12,
  direction = "left",
}: {
  children: ReactNode;
  start: number;
  duration?: number;
  direction?: "left" | "right";
}) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sign = direction === "left" ? -1 : 1;
  // Out and back: the shot leaves, and the next one arrives from the far side.
  const travel = t < 0.5 ? expoIn(t * 2) : 1 - expoOut((t - 0.5) * 2);
  const blur = Math.sin(t * Math.PI) * 26;

  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${sign * travel * WIDTH * (t < 0.5 ? 1 : -1)}px)`,
        filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/**
 * A circle grows from a point until it is the whole frame.
 *
 * Used where the new scene should feel like it came *out of* something the
 * viewer was already looking at — the iris opening into the analysis, the
 * score blooming out of the tag stack.
 */
export function ShapeWipe({
  start,
  duration = 16,
  color = C.bg,
  origin = [WIDTH / 2, HEIGHT / 2],
  children,
}: {
  start: number;
  duration?: number;
  color?: string;
  origin?: [number, number];
  children?: ReactNode;
}) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: expoOut,
  });

  if (t <= 0) return null;

  // Far corner distance, so the circle is guaranteed to cover the frame.
  const reach = Math.hypot(
    Math.max(origin[0], WIDTH - origin[0]),
    Math.max(origin[1], HEIGHT - origin[1]),
  );
  const r = t * reach;

  return (
    <AbsoluteFill
      style={{
        clipPath: `circle(${r}px at ${origin[0]}px ${origin[1]}px)`,
        background: color,
        zIndex: 40,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/**
 * Two frames of black, on the beat.
 *
 * The cheapest pattern interrupt there is and the most effective: taking the
 * picture away entirely for a sixteenth of a second makes whatever lands next
 * feel like it hit. Two frames, not six — long enough to register, short
 * enough that it is felt rather than seen.
 */
export function HardCut({ at, frames = 2 }: { at: number; frames?: number }) {
  const frame = useCurrentFrame();
  if (frame < at || frame >= at + frames) return null;
  return <AbsoluteFill style={{ background: "#000", zIndex: 80 }} />;
}

/**
 * A single flash of light on an impact.
 *
 * One frame at full, gone over three. Sparingly — this is punctuation, and a
 * film that flashes on every cut is a film with no cuts.
 */
export function Flash({
  at,
  color = C.white,
  peak = 0.5,
  duration = 4,
}: {
  at: number;
  color?: string;
  peak?: number;
  duration?: number;
}) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 1, at + duration], [0, peak, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (o <= 0.001) return null;
  return <AbsoluteFill style={{ background: color, opacity: o, zIndex: 70 }} />;
}
