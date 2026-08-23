/**
 * A slide projector, and the rectangle of light it throws.
 *
 * The machine matters as much as the image: the score arrives as something a
 * device *reported*, not as a number that faded up. So the lamp strikes, the
 * carriage clacks, the light cone widens, and only then does the slide show
 * a figure — and the figure counts mechanically, in tenths, the way a
 * counter wheel would.
 *
 * The cone is a clip-path trapezoid rather than a gradient, because a cone of
 * light has hard edges where the gate is and a soft falloff along its length,
 * and only the first of those is a gradient.
 */

import type { ReactNode } from "react";

import { a, C, FONT } from "../theme";

export function Projector({
  /** 0–1: how far the lamp has come up. */
  lamp,
  style,
}: {
  lamp: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ width: 460, ...style }}>
      {/* The body. */}
      <div
        style={{
          width: 460,
          height: 190,
          borderRadius: "16px 22px 14px 14px",
          background: `linear-gradient(168deg, hsl(212 14% 40%), hsl(214 16% 24%) 46%, hsl(214 18% 16%))`,
          boxShadow: `0 30px 70px ${a("hsl(0 0% 0%)", 0.62)}, inset 0 2px 0 ${a("hsl(0 0% 100%)", 0.16)}`,
          position: "relative",
        }}
      >
        {/* The slide carousel on top. */}
        <div
          style={{
            position: "absolute",
            left: 120,
            top: -44,
            width: 250,
            height: 52,
            borderRadius: "8px 8px 3px 3px",
            background: `linear-gradient(90deg, hsl(214 14% 22%), hsl(212 12% 34%) 50%, hsl(214 14% 20%))`,
          }}
        />
        {/* Ventilation. */}
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 40,
              top: 44 + i * 18,
              width: 130,
              height: 6,
              borderRadius: 3,
              background: a("hsl(0 0% 0%)", 0.4),
            }}
          />
        ))}
        {/* The lens barrel, pointing down. */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: -70,
            marginLeft: -54,
            width: 108,
            height: 84,
            borderRadius: 8,
            background: `linear-gradient(90deg, hsl(214 16% 18%), hsl(214 12% 34%), hsl(214 16% 18%))`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: -80,
            marginLeft: -32,
            width: 64,
            height: 22,
            borderRadius: 6,
            background: `radial-gradient(circle at 50% 40%, ${a(C.lamp, 0.2 + lamp * 0.8)}, hsl(214 18% 12%))`,
            boxShadow: lamp > 0.1 ? `0 0 ${46 * lamp}px ${a(C.lamp, 0.75 * lamp)}` : undefined,
          }}
        />
      </div>
    </div>
  );
}

/**
 * The beam and what it lands on.
 *
 * It throws **downward**. The first version projected left to right, which is
 * how a projector sits in a room and completely wrong for a 9:16 frame: the
 * machine hung off one edge and the slide off the other, with the whole
 * composition running across the narrow axis. Pointing it down puts the
 * machine at the top, the cone through the middle and the slide large in the
 * lower half — the only arrangement this aspect ratio has room for.
 *
 * `spread` widens the cone; `children` is the slide, at the far end.
 */
export function Beam({
  spread,
  width,
  height,
  children,
  style,
}: {
  spread: number;
  width: number;
  height: number;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  const w = Math.max(0.001, spread);

  return (
    <div style={{ position: "relative", width, height, ...style }}>
      {/* The cone: narrow at the gate, wide where it lands. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `polygon(${50 - 6 * w}% 0, ${50 + 6 * w}% 0, ${50 + 42 * w}% 100%, ${50 - 42 * w}% 100%)`,
          background: `linear-gradient(180deg, ${a(C.lamp, 0.42 * w)}, ${a(C.lamp, 0.06 * w)} 74%, transparent)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          transform: "translateX(-50%)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** The slide itself: a mounted transparency in its cardboard frame. */
export function Slide({
  label,
  value,
  outOf,
  width = 640,
}: {
  label: string;
  value: string;
  outOf: string;
  width?: number;
}) {
  return (
    <div
      style={{
        width,
        padding: 26,
        background: `linear-gradient(160deg, hsl(38 20% 88%), hsl(34 16% 76%))`,
        borderRadius: 4,
        boxShadow: `0 24px 60px ${a("hsl(0 0% 0%)", 0.5)}`,
      }}
    >
      <div
        style={{
          background: `linear-gradient(170deg, ${a(C.lamp, 0.96)}, hsl(44 84% 68%))`,
          padding: "34px 30px 30px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: "0.2em",
            color: "hsl(24 50% 22%)",
          }}
        >
          {label}
        </div>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 192,
              fontWeight: 800,
              letterSpacing: "-0.05em",
              lineHeight: 1,
              color: "hsl(220 60% 12%)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 56,
              fontWeight: 800,
              color: a("hsl(220 60% 12%)", 0.55),
              marginLeft: 8,
            }}
          >
            {outOf}
          </div>
        </div>
      </div>
    </div>
  );
}
