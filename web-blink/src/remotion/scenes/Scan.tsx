/**
 * Scene 3 — the scan. 3.5s to 6.0s.
 *
 * The eye slams over the profile, a laser passes down the grid, and where it
 * passes the photographs are gone and personality tags are there instead. The
 * substitution is the argument: this is not a caption over a picture, it is
 * the picture being *replaced* by what Blink read off it.
 *
 * The eye is the landing page's own — same geometry module — so the film and
 * the site cannot drift apart.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { lids, CX, W, H, irisCentre, irisRadius, PUPIL_RATIO } from "@/components/blink/eye-geometry";
import { Camera } from "../motion/Camera";
import { Crash, Label } from "../motion/Kinetic";
import { springAt } from "../motion/springs";
import { ProfileCard } from "./Illusion";
import type { FilmCopy } from "../copy";
import { a, C, HEIGHT, T, WIDTH } from "../theme";
import { at, EYE_IN, SCAN_FROM, SCAN_TO, TAG_BEATS } from "../timeline";

/** Where the tags land once the grid has gone. */
/*
  Solved against the card, not eyeballed.

  The card sits at 470 with 46 of padding; its identity row, bio and margins
  put the grid's top edge at about 770 and its bottom at 1438. The tags go
  where the grid was — that is the whole argument of the scene — so they are
  spaced inside that band rather than hung underneath it.
*/
const TAG_SEATS = [
  { y: 880, tilt: -3 },
  { y: 1054, tilt: 2 },
  { y: 1228, tilt: -2 },
];

export function Scan({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* The eye lands hard rather than opening gently — it is an interruption,
     not an introduction. */
  const eye = springAt({ frame, fps, start: EYE_IN, preset: "slam" });

  /* The laser's position down the card, 0 at the top and 1 past the bottom. */
  const laser = interpolate(frame, [SCAN_FROM, SCAN_TO], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* The grid is cleared by the laser: whatever the beam has passed is gone. */
  const grid = 1 - laser;

  const CARD_TOP = 640;
  const CARD_H = 1140;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(66% 42% at 50% 34%, ${a(C.bright, 0.22)}, transparent 74%)`,
        }}
      />

      <Camera
        drift={0.05}
        driftOver={75}
        shake={{ at: EYE_IN, amount: 22, decay: 5 }}
      >
        {/* The profile, being taken apart. */}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 470 }}>
          <div style={{ position: "relative", opacity: 1 - laser * 0.22 }}>
            <ProfileCard handle={copy.handle} width={760} grid={grid} />

            {/* The beam. The trail behind it is what does the work — a bare
                line reads as a scratch on the lens. */}
            {laser > 0 && laser < 1 && (
              <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 54 }}>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: `${laser * 100}%`,
                    height: 220,
                    marginTop: -220,
                    background: `linear-gradient(to bottom, transparent, ${a(C.sky, 0.2)})`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: -20,
                    right: -20,
                    top: `${laser * 100}%`,
                    height: 6,
                    background: C.white,
                    boxShadow: `0 0 40px ${C.sky}, 0 0 110px ${C.sky}`,
                  }}
                />
              </div>
            )}
          </div>
        </AbsoluteFill>

        {/* The tags, in the space the grid vacated. */}
        {TAG_BEATS.map((beat, i) => {
          if (frame < beat) return null;
          const seat = TAG_SEATS[i];
          return (
            <div
              key={copy.tags[i]}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: seat.y,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Crash
                start={beat}
                from={0.4}
                size={T.big}
                column={WIDTH - 150}
                color={i === 0 ? C.flag : C.sky}
                tilt={seat.tilt * 4}
              >
                {copy.tags[i]}
              </Crash>
            </div>
          );
        })}
      </Camera>

      {/* The eye, over everything. Slams in, holds, and is the thing doing
          the reading. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{
            position: "absolute",
            width: 1620,
            left: (WIDTH - 1620) / 2,
            top: -292,
            transform: `scale(${0.5 + eye * 0.5})`,
            transformOrigin: "50% 50%",
            opacity: Math.min(1, eye * 4),
          }}
          fill="none"
        >
          <path d={lids(1)} fill={`${a(C.bg, 0.8)}`} />
          <path
            d={lids(1)}
            fill="none"
            stroke={C.bright}
            strokeOpacity={0.34}
            strokeWidth={34}
            strokeLinecap="round"
          />
          <circle cx={CX} cy={irisCentre(1)} r={irisRadius(1)} fill={`${a(C.sky, 0.15)}`} />
          <circle
            cx={CX}
            cy={irisCentre(1)}
            r={irisRadius(1)}
            fill="none"
            stroke={C.sky}
            strokeWidth={9}
          />
          <circle cx={CX} cy={irisCentre(1)} r={irisRadius(1) * PUPIL_RATIO} fill={C.bg} />
          <path d={lids(1)} fill="none" stroke={C.white} strokeWidth={10} strokeLinecap="round" />
        </svg>
      </AbsoluteFill>

      {/* Above the eye, not inside it. At 386 the label sat across the lids
          and the iris, which reads as a caption printed on a logo. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 176 }}>
        <Label start={EYE_IN + 6} color={C.sky} size={36}>
          {copy.scanLabel}
        </Label>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
