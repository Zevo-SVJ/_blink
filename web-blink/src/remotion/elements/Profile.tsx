/**
 * A social profile, drawn rather than screenshotted.
 *
 * ## Recognisable, not a clone
 *
 * It has to read as "somebody's profile" in about a fifth of a second, which
 * means the *arrangement* has to be right — round avatar top-left, handle,
 * three stat columns, a two-line bio, a square grid — while none of the
 * specifics are Instagram's. Different proportions, different type, Blink's
 * own palette, no glyphs anyone owns. The layout is the recognition; the
 * styling is ours.
 *
 * ## Why it is not a photograph
 *
 * A real screenshot would be somebody's actual face and handle, which is a
 * person's likeness in an advert. Drawn, the tiles can also be *analysed* on
 * screen — lit one at a time, masked, pulled apart — which a flat image
 * cannot.
 */

import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Reticle } from "./Reticle";
import { springAt } from "../motion/springs";
import { C, FONT } from "../theme";

/*
  Deterministic tile shades, so a re-render is the same film.

  Nine, not twelve. A fourth row made the card taller than the frame could
  hold alongside three lines of display type, and three-by-three is the shape
  a profile grid is *recognised* by — the extra row added height and no
  recognition.
*/
const TILES = [0.16, 0.1, 0.2, 0.12, 0.24, 0.09, 0.18, 0.13, 0.21];

export function ProfileCard({
  /** Frame the card lands on. */
  start = 0,
  /** 0–1: how much the grid has arrived. */
  gridIn = 1,
  /** Index of the tile currently lit by the scan, or -1. */
  litTile = -1,
  /** Drains the colour as Blink takes over the reading. */
  drain = 0,
  handle = "@ton.profil",
  width = 820,
  /** Frame the reticle snaps onto the avatar, or null for no reticle. */
  lockAt = null,
}: {
  start?: number;
  gridIn?: number;
  litTile?: number;
  drain?: number;
  handle?: string;
  width?: number;
  lockAt?: number | null;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /*
    The card is already on screen on frame zero.

    A spring from zero means frame zero renders nothing at all, and frame zero
    is the frame a feed thumbnail is taken from and the frame that decides
    whether the next one gets watched. So the arrival runs from oversized down
    to rest — it is fully opaque throughout and *already moving* when the first
    frame is shown, rather than growing into existence.
  */
  const land = springAt({ frame, fps, start, preset: "heavy" });
  const scale = 1.34 - land * 0.34;

  const pad = 44;
  const gap = 14;
  const cell = (width - pad * 2 - gap * 2) / 3;
  const AVATAR = 148;

  return (
    <div
      style={{
        width,
        borderRadius: 52,
        background: `linear-gradient(168deg, ${C.bgLift}, ${C.navy})`,
        border: `2px solid rgba(255,255,255,${0.1 - drain * 0.05})`,
        padding: pad,
        boxShadow: "0 60px 140px rgba(0,0,0,0.55)",
        transform: `scale(${scale})`,
        filter: drain > 0.01 ? `saturate(${1 - drain * 0.75})` : undefined,
      }}
    >
      {/* Identity row. */}
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        {/* The reticle is a child of the avatar rather than a sibling of the
            card, so it is locked to the thing it is targeting no matter how
            the card is scaled, moved or pushed back by the type above it. The
            first cut positioned it by arithmetic against the frame and it
            landed half off the left edge. */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {lockAt !== null && frame >= lockAt && (
            <div
              style={{
                position: "absolute",
                inset: -26,
                pointerEvents: "none",
              }}
            >
              <Reticle
                start={lockAt}
                width={AVATAR + 52}
                height={AVATAR + 52}
                tighten={lockAt + 7}
                arm={42}
                thickness={5}
              />
            </div>
          )}
        <div
          style={{
            width: AVATAR,
            height: AVATAR,
            borderRadius: "50%",
            background: `linear-gradient(150deg, ${C.sky}, ${C.bright})`,
            // The avatar is the object the camera pushes into at the end of
            // the hook, and the ring is what survives the match cut into the
            // iris — so it is drawn, not decorative.
            boxShadow: `0 0 0 6px rgba(255,255,255,0.09)`,
          }}
        />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: C.white,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {handle}
          </div>
          <div style={{ display: "flex", gap: 34, marginTop: 16 }}>
            {[
              ["1 284", "posts"],
              ["18,4K", "abonnés"],
              ["612", "suivi"],
            ].map(([n, l]) => (
              <div key={l}>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 30,
                    fontWeight: 800,
                    color: C.white,
                  }}
                >
                  {n}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 21, color: C.faint }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bio, as bars: unreadable on purpose, because it is not the subject. */}
      <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 11 }}>
        <div style={{ height: 15, width: "72%", borderRadius: 8, background: "rgba(255,255,255,0.2)" }} />
        <div style={{ height: 15, width: "48%", borderRadius: 8, background: "rgba(255,255,255,0.12)" }} />
      </div>

      {/* The grid. */}
      <div
        style={{
          marginTop: 30,
          display: "grid",
          gridTemplateColumns: `repeat(3, ${cell}px)`,
          gap,
        }}
      >
        {TILES.map((shade, i) => {
          // Staggered by row, so the grid builds downward rather than all at
          // once — which is what a page loading actually looks like.
          const p = interpolate(gridIn, [i * 0.045, i * 0.045 + 0.3], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const lit = i === litTile;
          return (
            <div
              key={i}
              style={{
                width: cell,
                height: cell,
                borderRadius: 18,
                background: lit
                  ? `linear-gradient(150deg, ${C.sky}, ${C.sky2})`
                  : `rgba(255,255,255,${shade * (1 - drain * 0.5)})`,
                transform: `scale(${0.86 + p * 0.14})`,
                opacity: p,
                boxShadow: lit ? `0 0 60px ${C.sky}66` : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
