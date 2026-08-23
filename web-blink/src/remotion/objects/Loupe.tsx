/**
 * A watchmaker's loupe.
 *
 * ## The refraction is the point
 *
 * A circle with a border over a photograph is a highlight, not a lens. What
 * makes this read as glass is that the content *inside* the circle is a
 * genuinely different image from the content behind it: the same scene drawn
 * again, scaled up around the lens centre, and clipped to the glass. Move the
 * loupe and the magnified content slides at a different rate from the
 * background, which is exactly what parallax through a lens does.
 *
 * On top of that: a bright rim where the glass meets the barrel, a specular
 * streak across the upper left, and a faint chromatic fringe at the edge —
 * three cheap details that together do more than any blur filter.
 *
 * `children` is drawn twice, so it must be a pure function of its props.
 */

import type { ReactNode } from "react";

import { a, C } from "../theme";

export const LENS_R = 168;

export function Loupe({
  /** Lens centre, in film pixels. */
  x,
  y,
  /** How much bigger the world looks through it. */
  power = 1.9,
  /** Degrees of tilt on the barrel. */
  tilt = -12,
  /** The scene the lens is looking at, in film coordinates. */
  children,
}: {
  x: number;
  y: number;
  power?: number;
  tilt?: number;
  children: ReactNode;
}) {
  return (
    <>
      {/* What the glass shows.
          Two nested elements, and the nesting is the whole trick: `clip-path`
          lives in the element's *own* coordinate space, so clipping and
          scaling on the same node scales the clip circle too — a 168px lens
          became a 328px hole showing magnified content well outside the
          brass. The outer node clips at true size; the inner one magnifies
          inside it. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `circle(${LENS_R}px at ${x}px ${y}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${power})`,
            transformOrigin: `${x}px ${y}px`,
          }}
        >
          {children}
        </div>
      </div>

      {/* The glass itself: a cool wash, a bright top edge where light enters,
          and a darker bottom where it does not. */}
      <div
        style={{
          position: "absolute",
          left: x - LENS_R,
          top: y - LENS_R,
          width: LENS_R * 2,
          height: LENS_R * 2,
          borderRadius: "50%",
          /* Much lighter than the first pass. Glass tints; it does not
             shade. At a 0.28 dark stop the lower half of the lens was darker
             than the print behind it, so the one thing the loupe exists to
             do — make something easier to see — was being undone by its own
             material. */
          background: `linear-gradient(150deg, ${a(C.glass, 0.16)}, ${a(C.glass, 0.03)} 52%, ${a("hsl(200 40% 70%)", 0.07)})`,
          pointerEvents: "none",
        }}
      />

      {/* The chromatic fringe. Two hairlines a pixel apart in opposite hues —
          barely visible, and the thing that stops the rim looking drawn. */}
      <div
        style={{
          position: "absolute",
          left: x - LENS_R,
          top: y - LENS_R,
          width: LENS_R * 2,
          height: LENS_R * 2,
          borderRadius: "50%",
          boxShadow: `inset 0 0 0 2px ${a("hsl(196 90% 70%)", 0.55)}, inset 0 0 0 4px ${a("hsl(24 90% 66%)", 0.3)}, inset 0 26px 60px ${a("hsl(0 0% 100%)", 0.14)}`,
          pointerEvents: "none",
        }}
      />

      {/* The specular streak. An ellipse, rotated, top-left — where a desk
          lamp would be. */}
      <div
        style={{
          position: "absolute",
          left: x - LENS_R * 0.72,
          top: y - LENS_R * 0.78,
          width: LENS_R * 0.9,
          height: LENS_R * 0.42,
          borderRadius: "50%",
          background: `linear-gradient(120deg, ${a("hsl(0 0% 100%)", 0.4)}, transparent 70%)`,
          transform: "rotate(-32deg)",
          pointerEvents: "none",
        }}
      />

      {/* The barrel, the knurled grip and the eyepiece. Drawn after the glass
          so it sits over the rim. */}
      <div
        style={{
          position: "absolute",
          left: x - LENS_R,
          top: y - LENS_R,
          width: LENS_R * 2,
          height: LENS_R * 2,
          transform: `rotate(${tilt}deg)`,
          transformOrigin: "50% 50%",
          pointerEvents: "none",
        }}
      >
        {/* The ring holding the glass. */}
        <div
          style={{
            position: "absolute",
            inset: -18,
            borderRadius: "50%",
            border: `18px solid ${C.brass}`,
            background: "transparent",
            boxShadow: `inset 0 0 0 3px ${C.brassDark}, 0 20px 50px ${a("hsl(0 0% 0%)", 0.6)}`,
          }}
        />
        {/* A highlight along the upper-left of the ring, so the brass has a
            direction of light rather than being a flat annulus. */}
        <div
          style={{
            position: "absolute",
            inset: -18,
            borderRadius: "50%",
            border: "18px solid transparent",
            borderTopColor: a("hsl(44 60% 88%)", 0.75),
            borderLeftColor: a("hsl(44 60% 88%)", 0.4),
            transform: "rotate(-28deg)",
          }}
        />

        {/* The barrel running off to the eyepiece. */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -18 - 150,
            width: 108,
            height: 168,
            marginLeft: -54,
            background: `linear-gradient(90deg, ${C.brassDark}, ${C.brass} 34%, hsl(44 56% 84%) 50%, ${C.brass} 66%, ${C.brassDark})`,
            borderRadius: "10px 10px 0 0",
          }}
        />
        {/* Knurling: six grooves across the barrel. */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: -18 - 138 + i * 15,
              width: 108,
              height: 5,
              marginLeft: -54,
              background: a("hsl(28 40% 22%)", 0.55),
            }}
          />
        ))}
        {/* The eyepiece flange. */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -18 - 168,
            width: 138,
            height: 26,
            marginLeft: -69,
            borderRadius: 8,
            background: `linear-gradient(90deg, ${C.brassDark}, hsl(44 56% 86%) 50%, ${C.brassDark})`,
          }}
        />
      </div>
    </>
  );
}
