/**
 * Scene 2 — the profile.
 *
 * The thing being judged, shown plainly. It is a stylised Instagram profile
 * rather than a generic SaaS panel because the viewer has to recognise it in
 * under a second — this is *their* screen, and the recognition is what makes
 * the next scene land on them personally.
 *
 * Nothing here is a real account. The handle is invented and the grid is
 * abstract tiles; a real profile in an ad is somebody's face used without
 * asking.
 */

import { interpolate, outExpo, spring } from "@/video/frame";
import { useFilmCopy } from "@/video/copy-context";
import { ink, Layer } from "@/video/Stage";

const TILE = 9;

export function Profile({ frame }: { frame: number }) {
  const { yours } = useFilmCopy();

  /* The card arrives with weight: a spring past its mark and back, so it
     reads as landing rather than fading up. */
  const land = spring({ frame, config: { stiffness: 170, damping: 14 } });

  return (
    <Layer style={{ background: ink.bg }}>
      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          top: 380,
          opacity: Math.min(1, land * 1.6),
          transform: `translateY(${(1 - land) * 90}px) scale(${0.9 + land * 0.1})`,
          borderRadius: 44,
          background: "hsl(220 60% 12% / 0.9)",
          border: "1px solid hsl(210 40% 96% / 0.09)",
          padding: 56,
        }}
      >
        {/* Identity row. */}
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          <div
            style={{
              width: 168,
              height: 168,
              borderRadius: "50%",
              background: `linear-gradient(150deg, ${ink.sky}, ${ink.bright})`,
              flexShrink: 0,
              opacity: 0.85,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 54, fontWeight: 800, color: ink.white, letterSpacing: "-0.02em" }}>
              @your.handle
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 12, flexDirection: "column" }}>
              <span style={{ display: "block", height: 15, width: 300, borderRadius: 99, background: "hsl(210 40% 96% / 0.2)" }} />
              <span style={{ display: "block", height: 15, width: 205, borderRadius: 99, background: "hsl(210 40% 96% / 0.11)" }} />
            </div>
          </div>
        </div>

        {/* The grid, tile by tile. The stagger is the sound of the scene. */}
        <div
          style={{
            marginTop: 48,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {Array.from({ length: TILE }, (_, i) => {
            const t = spring({
              frame: frame - 14 - i * 2,
              config: { stiffness: 260, damping: 20 },
            });
            return (
              <span
                key={i}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 14,
                  background: `hsl(210 40% 96% / ${0.05 + (i % 4) * 0.022})`,
                  opacity: t,
                  transform: `scale(${0.82 + t * 0.18})`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 96,
          top: 268,
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: "0.02em",
          color: ink.soft,
          opacity: interpolate(frame, [10, 22], [0, 1], { easing: outExpo }),
        }}
      >
        {yours}
      </div>
    </Layer>
  );
}
