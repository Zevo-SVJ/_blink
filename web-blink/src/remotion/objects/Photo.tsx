/**
 * The profile, as a physical print.
 *
 * A photo print rather than a screenshot: the whole film is objects on a
 * desk, and the point of the opening is that your profile is a *thing* that
 * can be picked up, looked at through a lens and taken apart. A rectangle of
 * UI cannot be handled; a print can.
 *
 * The border is uneven on purpose — wider at the bottom, the way an instant
 * print is — because that asymmetry is most of what makes something read as
 * a photograph rather than as a card with a picture on it.
 */

import type { CSSProperties } from "react";

import { a, C, FONT } from "../theme";

/** Deterministic tile shades, so a re-render is the same film. */
export const TILES = [0.9, 0.55, 0.75, 0.62, 0.95, 0.48, 0.8, 0.68, 0.86];

/**
 * Detail that only exists to be magnified.
 *
 * The loupe's whole argument is that it finds things not visible before, and
 * the first cut gave it flat colour to enlarge — so the glass was doing
 * nothing. These marks are two or three pixels at 1× (a texture, at most) and
 * legible shapes at 2×, which is exactly the effect a lens has on a print.
 *
 * Deterministic, so the film is the same on every render.
 */
const GRAIN: Array<[number, number, number, number]> = [
  [12, 18, 22, 3], [58, 26, 14, 2], [30, 44, 30, 2], [70, 58, 18, 3],
  [18, 66, 26, 2], [46, 74, 20, 3], [76, 34, 12, 2], [24, 86, 16, 2],
];

/*
  Big. This is the hero object of the first six seconds and it was rendering
  at under half the frame width, which reads as a thumbnail of a photograph
  rather than as a photograph.
*/
export const PHOTO_W = 880;
/** Print proportions: the image is square, the bottom border is deep. */
export const PHOTO_H = 1075;

/** The bio on the print. Small on purpose. */
const BIO = "photographe · paris\nne poste que ce qui est parfait\nlien en bio ↓";

/**
 * Which region the loupe is over.
 *
 * The indices are the order the observation scene names things in, so the
 * lens and the label and the highlight cannot drift apart: 0 is the bio,
 * 1 is the first row of posts, 2 is the palette across the whole grid.
 */
export const LIT = { BIO: 0, FIRST_ROW: 1, PALETTE: 2 } as const;

export function Photo({
  handle,
  /** 0–1: how far the print has come apart. */
  fragment = 0,
  /** Index of the region currently lit, or -1. See `LIT`. */
  lit = -1,
  style,
}: {
  handle: string;
  fragment?: number;
  lit?: number;
  style?: CSSProperties;
}) {
  const pad = 34;
  const inner = PHOTO_W - pad * 2;
  const cell = (inner - 20) / 3;

  return (
    <div
      style={{
        width: PHOTO_W,
        height: PHOTO_H,
        background: `linear-gradient(160deg, ${C.paper}, ${C.paperEdge})`,
        padding: pad,
        paddingBottom: pad * 2.6,
        borderRadius: 6,
        // Two shadows: a tight contact shadow and a long soft one. A single
        // shadow reads as a drop-shadow filter; two read as an object lying
        // on something.
        boxShadow: `0 4px 10px ${a("hsl(0 0% 0%)", 0.5)}, 0 44px 90px ${a("hsl(0 0% 0%)", 0.55)}`,
        ...style,
      }}
    >
      {/* The image area. */}
      <div
        style={{
          width: inner,
          height: inner + 120,
          background: `linear-gradient(170deg, ${C.bgLift}, ${C.navy})`,
          borderRadius: 3,
          padding: 22,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* What is left when the tiles have gone. Without this the emptied
            print is a bright navy rectangle — brighter than the desk it lies
            on — which reads as a blank screen rather than as a photograph
            that has been stripped. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(120% 90% at 50% 0%, ${a(C.navy, 0.2)}, ${a("hsl(0 0% 0%)", 0.72)})`,
            opacity: fragment,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18, position: "relative" }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: `linear-gradient(150deg, ${C.sky}, ${C.bright})`,
              flexShrink: 0,
              boxShadow: lit === LIT.BIO ? `0 0 46px ${a(C.sky, 0.7)}` : undefined,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: C.white,
                whiteSpace: "nowrap",
              }}
            >
              {handle}
            </div>
            {/* The bio, as bars. It is not the subject — the loupe is what
                makes it interesting, not the words. */}
            {/* The bio as actual words, set small enough to be a smudge at
                a glance and readable through the lens. This is the thing the
                loupe finds first, so it has to reward being looked at. */}
            <div
              style={{
                marginTop: 12,
                fontFamily: FONT,
                fontSize: 15,
                lineHeight: 1.5,
                fontWeight: 600,
                letterSpacing: "0.01em",
                color: a(C.white, lit === LIT.BIO ? 0.94 : 0.5),
                maxWidth: 330,
                textShadow: lit === LIT.BIO ? `0 0 24px ${C.sky}` : undefined,
              }}
            >
              {BIO.split("\n").map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 26,
            position: "relative",
            display: "grid",
            gridTemplateColumns: `repeat(3, ${cell}px)`,
            gap: 10,
          }}
        >
          {TILES.map((shade, i) => {
            /* The print comes apart tile by tile: each one lifts, turns and
               falls away, and they do it at different times so it reads as
               a thing disintegrating rather than a grid fading.

               The spread matters more than the speed. The first cut cleared
               every tile inside half a second, so the print was a hollow
               frame for most of a scene whose whole subject is the print
               being taken apart — the tiles have to still be leaving while
               the last card is pulled. Solved so tile 0 finishes at
               fragment 0.45 and tile 8 finishes exactly at 1. */
            const g = Math.max(0, Math.min(1, fragment * 2.2 - i * 0.15));
            const litHere =
              (lit === LIT.FIRST_ROW && i < 3) || lit === LIT.PALETTE;
            return (
              <div
                key={i}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 4,
                  position: "relative",
                  overflow: "hidden",
                  background: `hsl(212 ${18 + shade * 22}% ${16 + shade * 26}%)`,
                  transform: `translate(${g * (i % 3 === 0 ? -160 : i % 3 === 1 ? 30 : 180)}px, ${-g * (120 + i * 26)}px) rotate(${g * (i % 2 ? 26 : -22)}deg) scale(${1 - g * 0.2})`,
                  opacity: 1 - g,
                  boxShadow: litHere ? `0 0 34px ${a(C.sky, 0.8)}` : undefined,
                  outline: litHere ? `3px solid ${C.sky}` : undefined,
                }}
              >
                {/* The thing the loupe is for. At 1× these are a few pixels
                    of texture; at 2× they are shapes, which is the whole
                    argument of the observation scene — a lens over flat
                    colour magnifies nothing and the first cut shipped
                    exactly that. */}
                {GRAIN.map(([gx, gy, gw, gh], k) => (
                  <div
                    key={k}
                    style={{
                      position: "absolute",
                      left: `${(gx + i * 7) % 88}%`,
                      top: `${(gy + i * 11) % 88}%`,
                      width: gw,
                      height: gh,
                      borderRadius: 1,
                      background: a(C.white, k % 3 === 0 ? 0.3 : 0.16),
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
