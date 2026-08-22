/**
 * Scene 2 — the illusion. 2.0s to 3.5s.
 *
 * The profile, as its owner sees it: clean, considered, exactly what they
 * meant to put out. It springs up from below the frame so it arrives rather
 * than cuts, and the label above it names the assumption the rest of the film
 * takes apart.
 *
 * A drawn profile rather than a screenshot. The arrangement is what makes it
 * recognisable — round avatar, handle, three stat columns, a square grid —
 * while none of the specifics belong to anyone: different proportions,
 * Blink's palette, no glyphs another company owns, and a handle that is
 * obviously a placeholder.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Camera } from "../motion/Camera";
import { Label } from "../motion/Kinetic";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { C, FONT, HEIGHT } from "../theme";
import { at, PROFILE_IN } from "../timeline";

/** Deterministic tile shades, so a re-render is the same film. */
export const TILES = [0.2, 0.12, 0.24, 0.14, 0.28, 0.1, 0.22, 0.16, 0.26];

export function Illusion({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = springAt({ frame, fps, start: PROFILE_IN, preset: "crash" });

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Camera drift={0.045} driftOver={45}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {/* Travels the full height of the frame, so it is genuinely
              arriving from off screen rather than fading up in place. */}
          <div style={{ transform: `translateY(${(1 - rise) * HEIGHT * 0.62}px)` }}>
            <ProfileCard handle={copy.handle} />
          </div>
        </AbsoluteFill>
      </Camera>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 190 }}>
        <Label start={at("illusion") + 8} color={C.soft} size={36}>
          {copy.illusionLabel}
        </Label>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function ProfileCard({
  handle,
  width = 820,
  /** 0–1, how far a wipe has cleared the grid. 1 leaves it intact. */
  grid = 1,
}: {
  handle: string;
  width?: number;
  grid?: number;
}) {
  const pad = 46;
  const gap = 16;
  const cell = (width - pad * 2 - gap * 2) / 3;

  return (
    <div
      style={{
        width,
        borderRadius: 54,
        background: `linear-gradient(168deg, ${C.bgLift}, ${C.navy})`,
        border: "2px solid rgba(255,255,255,0.11)",
        padding: pad,
        boxShadow: "0 60px 150px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: `linear-gradient(150deg, ${C.sky}, ${C.bright})`,
            flexShrink: 0,
            boxShadow: "0 0 0 6px rgba(255,255,255,0.1)",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 50,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: C.white,
              whiteSpace: "nowrap",
            }}
          >
            {handle}
          </div>
          <div style={{ display: "flex", gap: 36, marginTop: 16 }}>
            {[
              ["1 284", "posts"],
              ["18,4K", "followers"],
              ["612", "following"],
            ].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontFamily: FONT, fontSize: 31, fontWeight: 800, color: C.white }}>
                  {n}
                </div>
                <div style={{ fontFamily: FONT, fontSize: 21, color: C.faint }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The bio, as bars. Unreadable on purpose — it is not the subject. */}
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ height: 16, width: "74%", borderRadius: 8, background: "rgba(255,255,255,0.22)" }} />
        <div style={{ height: 16, width: "46%", borderRadius: 8, background: "rgba(255,255,255,0.13)" }} />
      </div>

      <div
        style={{
          marginTop: 32,
          display: "grid",
          gridTemplateColumns: `repeat(3, ${cell}px)`,
          gap,
          // The wipe clears the grid from the top down, one row at a time.
          clipPath: `inset(0 0 ${(1 - grid) * 100}% 0)`,
        }}
      >
        {TILES.map((shade, i) => (
          <div
            key={i}
            style={{
              width: cell,
              height: cell,
              borderRadius: 20,
              background: `rgba(255,255,255,${shade})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
