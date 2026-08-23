/**
 * The surface everything happens on.
 *
 * A pool of light on a dark desk. It is doing two jobs: it is why the objects
 * have shadows to fall on, and it is what makes the final pull-back read as
 * *a place* rather than as a set of elements arranged on a background.
 *
 * Deliberately not a wood texture. The brand is navy, and a desk that looks
 * like oak would make the film about a workshop rather than about Blink.
 * Dark, slightly blue, with a warm lamp falling across it from the upper
 * left — which is the direction every object's highlight already assumes.
 */

import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import { a, C } from "../theme";

export function Desk({
  /** Where the lamp pools, as a fraction of the frame. */
  light = [0.42, 0.38],
  /** How tight the pool is. Widens as the camera pulls back. */
  spread = 0.62,
  children,
}: {
  light?: [number, number];
  spread?: number;
  children?: ReactNode;
}) {
  return (
    <AbsoluteFill style={{ background: C.desk }}>
      {/* The lamp pool. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(${spread * 100}% ${spread * 66}% at ${light[0] * 100}% ${light[1] * 100}%, ${C.deskLight}, ${C.desk} 72%)`,
        }}
      />
      {/* A cooler rim from the far side, so the surface has two lights and
          therefore a readable shape. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(80% 40% at 90% 96%, ${a(C.bright, 0.12)}, transparent 70%)`,
        }}
      />
      {children}
      {/* Vignette. The pool needs an edge or the frame reads as flat. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 80% at 50% 45%, transparent 42%, ${a("hsl(220 60% 4%)", 0.72)})`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}
