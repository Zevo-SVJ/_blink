/**
 * An elegant mirror, and a controlled fracture.
 *
 * ## What the crack has to avoid
 *
 * The cheap version is a stock "broken glass" PNG dropped on top. This is
 * built from the physics instead: radial fractures from a single impact
 * point, a couple of concentric ones crossing them, and the shards between
 * them displaced slightly outward and rotated a degree or two.
 *
 * The restraint is what makes it read as expensive: eight radials, not fifty;
 * a two-degree rotation, not fifteen; and the glass never actually leaves the
 * frame. It is a fracture, not an explosion.
 *
 * The reflection is drawn twice — the polished version the subject believes
 * in, and, once cracked, what is actually behind it.
 */

import type { ReactNode } from "react";

import { a, C } from "../theme";

/* Big enough to be a mirror rather than a hand mirror on a table: at
   700×940 it filled under half the frame's height and the scene read as an
   object sitting in a lot of empty desk. */
export const MIRROR_W = 812;
export const MIRROR_H = 1206;

/** Deterministic fracture geometry, so a re-render is the same film. */
const RADIALS = [-78, -34, 8, 46, 96, 134, 178, 216, 262, 308];
const SHARD_DRIFT = [3, -2, 4, -3, 2, -4, 3, -2, 4, -3];

export function Mirror({
  /** 0–1: how far the fracture has spread from the impact point. */
  crack = 0,
  /**
   * 0–1: how far the shards have left the frame.
   *
   * The fracture alone does not reveal anything — displaced by a few
   * millimetres the wedges still cover what is behind them, so the scene's
   * whole point (the real perception is underneath, and always was) never
   * became visible. The shards have to actually go.
   */
  shed = 0,
  /** What the glass shows before it breaks. */
  front,
  /** What is behind it, revealed by the fracture. */
  behind,
  /** Impact point, as a fraction of the mirror. */
  impact = [0.52, 0.42],
}: {
  crack?: number;
  shed?: number;
  front: ReactNode;
  behind: ReactNode;
  impact?: [number, number];
}) {
  const ix = impact[0] * MIRROR_W;
  const iy = impact[1] * MIRROR_H;
  const reach = Math.hypot(MIRROR_W, MIRROR_H);

  return (
    <div
      style={{
        position: "relative",
        width: MIRROR_W,
        height: MIRROR_H,
        borderRadius: `${MIRROR_W / 2}px ${MIRROR_W / 2}px 18px 18px`,
        // The frame: a brass bevel with light coming from the upper left.
        padding: 22,
        background: `linear-gradient(146deg, hsl(44 54% 82%), ${C.brass} 28%, ${C.brassDark} 62%, ${C.brass})`,
        boxShadow: `0 40px 110px ${a("hsl(0 0% 0%)", 0.62)}, inset 0 0 0 3px ${a("hsl(28 40% 20%)", 0.4)}`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: `${MIRROR_W / 2 - 22}px ${MIRROR_W / 2 - 22}px 8px 8px`,
          overflow: "hidden",
          background: C.navy,
        }}
      >
        {/* What is behind the glass. Always drawn — the fracture uncovers it
            rather than swapping to it, which is why the reveal reads as
            something that was already there. */}
        <div style={{ position: "absolute", inset: 0 }}>{behind}</div>

        {/* The reflection, in shards. Before the crack this is one unbroken
            pane; after, each wedge is displaced along its own bisector. */}
        {RADIALS.map((deg, i) => {
          const next = RADIALS[(i + 1) % RADIALS.length];
          const span = (next > deg ? next : next + 360) - deg;
          const mid = ((deg + span / 2) * Math.PI) / 180;
          const drift = crack * SHARD_DRIFT[i] * 6;

          /* Each wedge leaves on its own beat, in the order the fracture
             reached it, and falls as well as slides — glass does not float
             away sideways. */
          const go = Math.max(0, Math.min(1, shed * (RADIALS.length + 3) - i));
          const fall = go * go;

          // A wedge from the impact point out past the far corner.
          const p1 = [
            ix + Math.cos((deg * Math.PI) / 180) * reach,
            iy + Math.sin((deg * Math.PI) / 180) * reach,
          ];
          const p2 = [
            ix + Math.cos(((deg + span) * Math.PI) / 180) * reach,
            iy + Math.sin(((deg + span) * Math.PI) / 180) * reach,
          ];

          return (
            <div
              key={deg}
              style={{
                position: "absolute",
                inset: 0,
                clipPath: `polygon(${ix}px ${iy}px, ${p1[0]}px ${p1[1]}px, ${p2[0]}px ${p2[1]}px)`,
                transform: `translate(${Math.cos(mid) * (drift + go * 210)}px, ${Math.sin(mid) * drift + fall * 620}px) rotate(${crack * SHARD_DRIFT[i] * 0.24 + go * SHARD_DRIFT[i] * 4}deg)`,
                transformOrigin: `${ix}px ${iy}px`,
                opacity: 1 - go,
                // Each shard catches the light slightly differently once it
                // has moved — that variation is most of the effect.
                filter: crack > 0.01 ? `brightness(${1 + SHARD_DRIFT[i] * 0.03 * crack})` : undefined,
              }}
            >
              {front}
            </div>
          );
        })}

        {/* The fracture lines themselves, drawn over the shards. */}
        {crack > 0.01 && (
          <svg
            viewBox={`0 0 ${MIRROR_W} ${MIRROR_H}`}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            fill="none"
          >
            {RADIALS.map((deg, i) => {
              const r = crack * reach * (0.8 + (i % 3) * 0.1);
              const x2 = ix + Math.cos((deg * Math.PI) / 180) * r;
              const y2 = iy + Math.sin((deg * Math.PI) / 180) * r;
              /* A fine bright line over a wide soft one. A single hard white
                 stroke is what makes a fracture look like a scratch drawn on
                 top; the halo is the light the glass is actually catching. */
              return (
                <g key={deg} opacity={Math.max(0, 1 - shed * 1.25)}>
                  <line
                    x1={ix}
                    y1={iy}
                    x2={x2}
                    y2={y2}
                    stroke={a(C.sky, 0.16)}
                    strokeWidth={9}
                    strokeLinecap="round"
                  />
                  <line
                    x1={ix}
                    y1={iy}
                    x2={x2}
                    y2={y2}
                    stroke={a("hsl(0 0% 100%)", 0.62)}
                    strokeWidth={1.6}
                  />
                </g>
              );
            })}
            {/* Two concentric fractures crossing the radials — real glass
                does this, and without them the radials look like a starburst
                graphic. */}
            {[0.3, 0.62].map((k) => {
              const r = crack * reach * 0.42 * (k / 0.3);
              const pts = RADIALS.map((deg) => {
                const rr = r * (0.86 + ((deg % 7) / 7) * 0.28);
                return `${ix + Math.cos((deg * Math.PI) / 180) * rr},${iy + Math.sin((deg * Math.PI) / 180) * rr}`;
              });
              return (
                <polygon
                  key={k}
                  points={pts.join(" ")}
                  stroke={a("hsl(0 0% 100%)", 0.34)}
                  strokeWidth={1.4}
                  fill="none"
                  opacity={Math.max(0, 1 - shed * 1.25)}
                />
              );
            })}
          </svg>
        )}

        {/* The sheen on the glass, over everything. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(128deg, ${a("hsl(0 0% 100%)", 0.14)}, transparent 38%, transparent 72%, ${a("hsl(0 0% 100%)", 0.07)})`,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
