/**
 * Scene 5 — the score. 8.0s to 10.0s.
 *
 * The gauge fills in fifteen frames. That is deliberate and it is the whole
 * point of the beat: a meter that fills slowly is a loading indicator, and a
 * loading indicator is the least interesting thing a screen can show. Filled
 * in half a second it reads as a measurement completing.
 *
 * The number is the composition — the arc is a mark around it, not a container
 * for it.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Camera } from "../motion/Camera";
import { Label } from "../motion/Kinetic";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { a, C, FONT, WIDTH } from "../theme";
import { at, GAUGE_FROM, GAUGE_TO } from "../timeline";

export function Score({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fill = interpolate(frame, [GAUGE_FROM, GAUGE_TO], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  /* The number lands on the frame the gauge finishes, not before it. */
  const pop = springAt({ frame, fps, start: GAUGE_TO, preset: "slam" });
  const value = Number(copy.score);
  const shown = (value * fill).toFixed(1);

  const R = 380;
  const CIRC = 2 * Math.PI * R;
  const sweep = (value / 10) * 0.78;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(66% 44% at 50% 50%, ${a(C.bright, 0.27)}, transparent 74%)`,
          opacity: Math.min(1, fill * 2),
        }}
      />

      <Camera zoom={[1.22, 1]} over={[at("score"), GAUGE_TO]} drift={0.04} driftOver={60}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <svg
            viewBox="0 0 900 900"
            style={{ position: "absolute", width: 900, left: (WIDTH - 900) / 2, top: 960 - 450 }}
            fill="none"
          >
            <circle cx={450} cy={450} r={R} stroke={C.hair} strokeWidth={18} />
            <circle
              cx={450}
              cy={450}
              r={R}
              stroke={C.sky}
              strokeWidth={18}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - sweep * fill)}
              transform="rotate(-90 450 450)"
            />
          </svg>

          {/* Stacked, not inline. Side by side the pair was wider than the
              ring and "/10" landed exactly on the stroke, which reads as a
              collision rather than a composition. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transform: `scale(${0.84 + pop * 0.16})`,
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: 340,
                fontWeight: 800,
                letterSpacing: "-0.06em",
                lineHeight: 0.88,
                color: C.white,
                fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 120px ${a(C.bright, 0.4)}`,
              }}
            >
              {shown}
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 78,
                fontWeight: 800,
                color: C.soft,
                marginTop: -8,
              }}
            >
              {copy.scoreOutOf}
            </div>
          </div>
        </AbsoluteFill>
      </Camera>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 330 }}>
        <Label start={at("score") + 2} color={C.sky} size={40}>
          {copy.scoreLabel}
        </Label>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
