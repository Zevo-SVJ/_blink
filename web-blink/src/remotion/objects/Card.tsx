/**
 * An index card, and a gummed label.
 *
 * Two stocks, because the film needs a hierarchy of physical objects: a card
 * is a conclusion Blink has filed, a label is something it has stuck onto
 * you. They read differently on screen and they mean different things.
 *
 * Both carry a small punched hole or a torn edge. Those details are what stop
 * a rounded rectangle with text in it from looking like a UI chip — which is
 * the exact failure mode this whole version exists to avoid.
 */

import type { CSSProperties } from "react";

import { a, C, FONT } from "../theme";
import { fitSize } from "../motion/Kinetic";

export function Card({
  children,
  width = 480,
  tone = "paper",
  style,
}: {
  children: string;
  width?: number;
  tone?: "paper" | "ink";
  style?: CSSProperties;
}) {
  const paper = tone === "paper";

  return (
    <div
      style={{
        width,
        padding: "30px 40px 32px",
        background: paper
          ? `linear-gradient(162deg, ${C.paper}, ${C.paperEdge})`
          : `linear-gradient(162deg, ${C.ink}, ${C.inkDeep})`,
        borderRadius: 5,
        boxShadow: `0 3px 8px ${a("hsl(0 0% 0%)", 0.45)}, 0 30px 64px ${a("hsl(0 0% 0%)", 0.5)}`,
        position: "relative",
        ...style,
      }}
    >
      {/* The ruled line an index card has. Sits under the text, off-centre,
          the way a real one does. */}
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          top: 26,
          height: 2,
          background: a(paper ? C.paperShade : C.white, paper ? 0.5 : 0.28),
        }}
      />
      <div
        style={{
          fontFamily: FONT,
          fontSize: fitSize(children, 68, width - 80, -0.02),
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: paper ? "hsl(220 40% 16%)" : C.paper,
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** A gummed label: smaller, warmer, and slightly crooked by nature. */
export function Tag({
  children,
  style,
}: {
  children: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        padding: "16px 30px",
        background: `linear-gradient(160deg, hsl(46 62% 88%), hsl(42 48% 78%))`,
        // A gummed label's corners are clipped, not rounded.
        clipPath: "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)",
        boxShadow: `0 2px 5px ${a("hsl(0 0% 0%)", 0.4)}, 0 18px 40px ${a("hsl(0 0% 0%)", 0.42)}`,
        fontFamily: FONT,
        /* Sized for the smallest screen the film plays on. The landing serves
           this 1080-wide frame into a ~330px column on a phone, so 34px here
           arrives as ten pixels — a label nobody reads. */
        fontSize: 42,
        fontWeight: 800,
        letterSpacing: "0.06em",
        color: "hsl(24 46% 22%)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
