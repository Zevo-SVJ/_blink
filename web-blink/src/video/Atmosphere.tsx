/**
 * Blink — the air the film is shot in.
 *
 * The first cut was legible and looked like a text slide: black field, white
 * word, nothing else. Legibility was never the problem — belonging was. The
 * landing's eye sits in a luminous material, and a film for the same product
 * that has none of it reads as a different project's asset dropped in.
 *
 * So this runs behind every scene: the same technique as the eye's atmosphere
 * — heavily elongated forms, softly filled, at low individual opacity, drifting
 * slowly. Slowly is the point. It is the floor of the mix, not an event; if it
 * ever draws attention it is doing the wrong job, and anything moving fast
 * enough to notice would compete with the cuts.
 *
 * `intensity` lets a scene ask for more or less of it — the quiet beats want
 * almost none, the reveal wants all of it.
 */

import { FILM_H, FILM_W, Layer } from "@/video/Stage";

interface Drift {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
  opacity: number;
  /** Film pixels travelled over the whole piece. */
  travel: [number, number];
}

/*
  Hand-placed. A seeded scatter spreads evenly, and an even spread is what
  makes generated texture look generated: these cluster low-left and high-right
  and leave the middle band clear, because that is where the words go.

  Flatter and fainter than the first pass, which used tall forms at nearly
  double these opacities and read as blotches drifting behind the type rather
  than as depth. Air should be noticed only when it is gone.
*/
const DRIFTS: Drift[] = [
  { x: 90, y: 400, rx: 620, ry: 74, rot: -16, opacity: 0.15, travel: [70, -50] },
  { x: 1010, y: 640, rx: 540, ry: 62, rot: 12, opacity: 0.13, travel: [-60, 40] },
  { x: 250, y: 1400, rx: 700, ry: 84, rot: 9, opacity: 0.12, travel: [90, -70] },
  { x: 940, y: 1640, rx: 580, ry: 68, rot: -10, opacity: 0.1, travel: [-80, -30] },
  { x: 520, y: 200, rx: 780, ry: 58, rot: 3, opacity: 0.085, travel: [40, 60] },
  { x: 560, y: 1860, rx: 840, ry: 72, rot: -5, opacity: 0.075, travel: [-50, -40] },
  { x: 760, y: 1080, rx: 460, ry: 54, rot: 20, opacity: 0.09, travel: [-40, 30] },
  { x: 220, y: 900, rx: 420, ry: 50, rot: -22, opacity: 0.08, travel: [50, -20] },
];

export function Atmosphere({
  frame,
  duration,
  intensity = 1,
}: {
  frame: number;
  duration: number;
  intensity?: number;
}) {
  const t = Math.min(1, Math.max(0, frame / duration));

  return (
    <Layer style={{ pointerEvents: "none" }}>
      <svg
        viewBox={`0 0 ${FILM_W} ${FILM_H}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        fill="none"
      >
        <defs>
          {/* Solid at the heart, nothing at the edge — the softness, without a
              blur filter to re-rasterise on every frame. */}
          <radialGradient id="film-air">
            <stop offset="0%" stopColor="hsl(var(--blink-sky-bright))" stopOpacity="0.5" />
            <stop offset="48%" stopColor="hsl(var(--blink-sky-bright))" stopOpacity="0.22" />
            <stop offset="100%" stopColor="hsl(var(--blink-sky))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {DRIFTS.map((d, i) => {
          const cx = d.x + d.travel[0] * t;
          const cy = d.y + d.travel[1] * t;
          return (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={d.rx}
              ry={d.ry}
              fill="url(#film-air)"
              opacity={d.opacity * intensity}
              transform={`rotate(${d.rot} ${cx} ${cy})`}
            />
          );
        })}
      </svg>
    </Layer>
  );
}
