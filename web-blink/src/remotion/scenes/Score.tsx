/**
 * Act 4 — the score.
 *
 * The note: *not a circular gauge.* A ring is what every analytics dashboard
 * does, it takes a second to fill, and the number inside it is small.
 *
 * So the number itself is the composition. It arrives at the largest size in
 * the film, the camera pulls back off it, and the tags from act three come
 * *back* — flying in to orbit it as the evidence the number was computed from.
 * The only circular element is a fragment of arc that snaps to length in three
 * frames; it reads as a mark, not a loading indicator.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Label, Word } from "../motion/Kinetic";
import { Camera } from "../motion/Camera";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { SCORE } from "../copy";
import { C, FONT, HEIGHT, T, TRACK, WIDTH } from "../theme";
import { at } from "../timeline";

/*
  Where the tags settle around the number.

  Every seat is a *centre*, and the labels are translated by half their own
  width, so an x near the frame edge puts half the word outside it —
  "MYSTÉRIEUX" is nearly five hundred pixels wide and ran off the left at
  x=120. These are pulled in far enough that the longest tag in either
  language clears both edges.
*/
const ORBIT = [
  { x: 306, y: 472, rot: -7 },
  { x: 744, y: 322, rot: 5 },
  { x: 306, y: 1500, rot: 6 },
  { x: 744, y: 1622, rot: -5 },
];

export function Score({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const T_RISE = at("scoreRise");
  const T_LAND = at("scoreLand");
  const T_LINE = at("scoreLine");

  /* Counts up during the rise, then the real value slams in. The count is
     deliberately not smooth to two decimals — it rolls, so the eye reads
     "measuring" rather than "animating". */
  const rise = interpolate(frame, [T_RISE, T_LAND], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });
  const landed = frame >= T_LAND;
  const land = springAt({ frame, fps, start: T_LAND, preset: "heavy" });

  const shown = landed ? SCORE.toFixed(1) : (SCORE * rise).toFixed(1);
  const scale = landed ? 0.78 + land * 0.22 : 0.66 + rise * 0.12;

  /* Not a gauge.
     Two short arcs facing each other, snapping to length in three frames —
     brackets around the number rather than a ring filling up. A single
     continuous arc at this radius came back reading as exactly the circular
     progress meter the brief rules out. */
  const arc = springAt({ frame, fps, start: T_LAND + 1, preset: "crisp" });
  const R = 392;
  const CIRC = 2 * Math.PI * R;
  const sweep = (SCORE / 10) * 0.19;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(66% 44% at 50% 46%, ${C.bright}40, transparent 74%)`,
          opacity: Math.min(1, rise * 2),
        }}
      />

      {/* The camera drives in on the rise and pulls back as the number lands,
          so the reveal is a move rather than a scale-up of one element. */}
      <Camera zoom={[1.5, 1]} over={[T_RISE, T_LAND + 12]} origin={[WIDTH / 2, 960]}>
        {/* The tags return, as the evidence. */}
        {copy.tags.map((tag, i) => {
          const start = T_LAND + 4 + i * 3;
          const s = springAt({ frame, fps, start, preset: "punch" });
          if (s <= 0) return null;
          const seat = ORBIT[i];
          return (
            <div
              key={tag}
              style={{
                position: "absolute",
                left: seat.x,
                top: seat.y,
                transform: `translate(-50%,-50%) scale(${0.6 + s * 0.4}) rotate(${seat.rot * s}deg)`,
                opacity: Math.min(1, s * 3) * 0.92,
                padding: "16px 32px",
                borderRadius: 999,
                border: `2px solid ${C.sky}44`,
                background: "rgba(10,22,48,0.8)",
                fontFamily: FONT,
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: C.sky,
                whiteSpace: "nowrap",
              }}
            >
              {tag}
            </div>
          );
        })}

        {/* The red flag stays in the picture too — the score is not only the
            flattering half, and leaving it out would make the number a
            compliment rather than a reading. */}
        {frame >= T_LAND + 16 && (
          <div
            style={{
              position: "absolute",
              left: WIDTH / 2,
              top: 1620,
              transform: `translate(-50%,-50%) scale(${0.7 + springAt({ frame, fps, start: T_LAND + 16, preset: "punch" }) * 0.3})`,
              padding: "16px 32px",
              borderRadius: 999,
              border: `2px solid ${C.flag}66`,
              background: "rgba(48,26,8,0.75)",
              fontFamily: FONT,
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: C.flag,
              whiteSpace: "nowrap",
            }}
          >
            {copy.flagWord}
          </div>
        )}

        {/* The arc fragment. */}
        <svg
          viewBox="0 0 1000 1000"
          style={{
            position: "absolute",
            left: WIDTH / 2 - 500,
            top: 960 - 500,
            width: 1000,
            opacity: arc,
          }}
          fill="none"
        >
          {[0, 180].map((turn) => (
            <circle
              key={turn}
              cx={500}
              cy={500}
              r={R}
              stroke={C.sky}
              strokeWidth={16}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - sweep * arc)}
              transform={`rotate(${turn - 90 - (sweep * 360) / 2} 500 500)`}
            />
          ))}
        </svg>

        {/* The number. */}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "baseline",
              transform: `scale(${scale})`,
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: 420,
                fontWeight: 800,
                letterSpacing: "-0.06em",
                lineHeight: 0.86,
                color: C.white,
                fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 120px ${C.bright}55`,
              }}
            >
              {shown}
            </div>
            {/* In the flow and always occupying its width. Positioned at
                `left: 100%` it hung off the right edge of the frame; given
                zero width it made the number jump sideways when it appeared.
                Reserving the space costs a stable composition nothing. */}
            <div
              style={{
                fontFamily: FONT,
                fontSize: 96,
                fontWeight: 800,
                color: C.soft,
                marginLeft: 14,
                opacity: arc,
              }}
            >
              {copy.scoreOutOf}
            </div>
          </div>
        </AbsoluteFill>
      </Camera>

      {/* High enough to clear the upper tag seats. At 300 it sat in the same
          band as the right-hand tag and the two overlapped. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 172 }}>
        <Label start={T_RISE + 2} color={C.sky} size={T.label}>
          {copy.scoreLabel}
        </Label>
      </AbsoluteFill>

      {/* The breath: two words, one of them enormous. */}
      {frame >= T_LINE && (
        <AbsoluteFill
          style={{
            background: C.bg,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Word start={T_LINE} from="left" size={T.big} color={C.soft}>
            {copy.scoreLine[0]}
          </Word>
          <Word start={T_LINE + 4} from="right" size={T.big} color={C.white}>
            {copy.scoreLine[1]}
          </Word>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
