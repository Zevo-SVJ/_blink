/**
 * A rubber stamp, and the mark it leaves.
 *
 * ## Why the imprint is rough
 *
 * A word set cleanly in red is a heading. What makes an imprint read as ink
 * pressed onto paper is that it is *uneven*: heavier where the rubber met the
 * sheet first, patchy where it did not quite make contact, with a ring of
 * over-inking at the edge of the die.
 *
 * That is done here with two stacked copies of the word — a solid one and a
 * lighter one offset by a pixel — under a deterministic mask of soft holes.
 * No `feTurbulence`: it would be re-rasterised on every one of seven hundred
 * and fifty frames, and it is not needed to sell this.
 */

import type { CSSProperties } from "react";

import { fitSize } from "../motion/Kinetic";
import { a, C, FONT } from "../theme";

/** Deterministic voids in the ink, as [x%, y%, size%]. */
const VOIDS: Array<[number, number, number]> = [
  [12, 28, 9], [31, 62, 6], [48, 22, 7], [63, 70, 8],
  [78, 36, 6], [88, 58, 9], [22, 78, 5], [56, 44, 4],
];

/** The stamp body, seen from slightly above. */
export function Stamp({
  /** 0 is fully raised, 1 is pressed home. */
  press,
  width = 520,
  style,
}: {
  press: number;
  width?: number;
  style?: CSSProperties;
}) {
  const squash = 1 + press * 0.06;

  return (
    <div style={{ width, ...style }}>
      {/* The handle: a turned wooden knob. */}
      <div
        style={{
          width: width * 0.46,
          height: 150,
          margin: "0 auto",
          borderRadius: "46% 46% 22% 22%",
          background: `linear-gradient(96deg, hsl(24 34% 26%), hsl(28 40% 46%) 38%, hsl(30 44% 56%) 52%, hsl(26 36% 34%))`,
          boxShadow: `inset 0 -12px 28px ${a("hsl(0 0% 0%)", 0.45)}`,
        }}
      />
      {/* The collar. */}
      <div
        style={{
          width: width * 0.3,
          height: 30,
          margin: "-8px auto 0",
          borderRadius: 6,
          background: `linear-gradient(90deg, ${C.brassDark}, hsl(44 54% 82%) 50%, ${C.brassDark})`,
        }}
      />
      {/* The mount and the die, squashing as it presses. */}
      <div
        style={{
          width,
          height: 74,
          marginTop: 6,
          borderRadius: 10,
          background: `linear-gradient(94deg, hsl(24 30% 22%), hsl(28 38% 42%) 44%, hsl(24 30% 24%))`,
          transform: `scaleY(${2 - squash}) scaleX(${squash})`,
          transformOrigin: "50% 100%",
          boxShadow: `0 ${18 - press * 14}px ${36 - press * 22}px ${a("hsl(0 0% 0%)", 0.55)}`,
        }}
      />
      <div
        style={{
          width: width * 0.94,
          height: 34,
          margin: "0 auto",
          borderRadius: "0 0 8px 8px",
          background: `linear-gradient(180deg, hsl(354 40% 26%), hsl(352 46% 16%))`,
          transform: `scaleX(${squash})`,
        }}
      />
    </div>
  );
}

/** The mark left on the paper. */
export function Imprint({
  children,
  /** 0–1: how much ink has transferred. */
  ink = 1,
  width = 900,
  style,
}: {
  children: string;
  ink?: number;
  width?: number;
  style?: CSSProperties;
}) {
  const size = fitSize(children, 190, width - 70, -0.03);

  return (
    <div
      style={{
        width,
        position: "relative",
        // The die's border: a rectangle of over-inking around the word.
        border: `9px solid ${C.ink}`,
        borderRadius: 8,
        padding: "26px 34px",
        transform: "rotate(-3.4deg)",
        opacity: Math.min(1, ink * 1.4),
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: size,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.04,
          color: C.ink,
          textAlign: "center",
          whiteSpace: "nowrap",
          // A second, lighter impression a pixel off — the double-strike a
          // hand-held stamp always leaves.
          textShadow: `2px 2px 0 ${a(C.inkDeep, 0.55)}`,
        }}
      >
        {children}
      </div>

      {/* Where the rubber did not quite meet the paper. */}
      {VOIDS.map(([vx, vy, vs], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${vx}%`,
            top: `${vy}%`,
            width: `${vs}%`,
            height: `${vs * 1.6}%`,
            borderRadius: "50%",
            background: C.paper,
            opacity: 0.85 * Math.min(1, ink * 1.2),
            transform: `rotate(${i * 37}deg)`,
            mixBlendMode: "lighten",
          }}
        />
      ))}
    </div>
  );
}
