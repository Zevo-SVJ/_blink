/**
 * Scene 4 — the interrupt. 6.0s to 8.0s.
 *
 * Everything established over six seconds is torn away in eight frames. The
 * background goes warm — the only warm frames in the film — and the word that
 * lands is at a scale nothing else uses.
 *
 * Amber rather than red. This is an observation about somebody, not an alarm,
 * and it is the thing a viewer actually wants to know about themselves. Making
 * it look like an error message would make it a warning to dismiss rather than
 * a reading to check.
 *
 * The word breathes once it has landed — a slow pulse, not a loop, so the
 * two seconds it holds do not go dead.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Camera } from "../motion/Camera";
import { fitSize, Label } from "../motion/Kinetic";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { C, FONT, TRACK, WIDTH } from "../theme";
import { at, FLAG_WORD } from "../timeline";

export function Flag({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const land = springAt({ frame, fps, start: FLAG_WORD, preset: "slam" });

  /* The warmth arrives with the tear and settles back — a held colour cast
     would just be a differently coloured slide. */
  const heat = interpolate(frame, [at("flag") - 3, at("flag") + 3, at("flag") + 24], [0, 1, 0.62], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* One slow breath across the hold. */
  const pulse = 1 + Math.sin(Math.max(0, frame - FLAG_WORD) / 9) * 0.022;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(74% 48% at 50% 50%, ${C.flagDeep}, transparent 72%)`,
          opacity: heat,
        }}
      />

      <Camera drift={0.05} driftOver={60} shake={{ at: at("flag"), amount: 30, decay: 6 }}>
        {/* Two rules snapping out from the centre line: the composition
            itself changing, not just the word inside it. */}
        {[0, 1].map((i) => {
          const w = interpolate(frame, [at("flag"), at("flag") + 9], [0, WIDTH * 1.1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: (t) => 1 - Math.pow(1 - t, 4),
          });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                top: i === 0 ? 800 : 1180,
                width: w,
                height: 5,
                marginLeft: -w / 2,
                background: C.flag,
                opacity: 0.85,
              }}
            />
          );
        })}

        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
          <Label start={at("flag")} color={C.flag} size={40}>
            {copy.flagLabel}
          </Label>

          <div
            style={{
              fontFamily: FONT,
              /* Divided by the slam's overshoot: this arrives from 0.3 and
                 throws past its resting size before settling, and the frame
                 does not care that the extra width lasts three frames. */
              fontSize: fitSize(copy.flagWord, 300, (WIDTH - 90) / 1.28),
              fontWeight: 800,
              letterSpacing: TRACK.mega,
              lineHeight: 1.02,
              color: C.white,
              whiteSpace: "nowrap",
              opacity: Math.min(1, land * 5),
              transform: `scale(${(0.3 + land * 0.7) * pulse})`,
              textShadow: `0 0 100px ${C.flagDeep}`,
            }}
          >
            {copy.flagWord}
          </div>
        </AbsoluteFill>
      </Camera>
    </AbsoluteFill>
  );
}
