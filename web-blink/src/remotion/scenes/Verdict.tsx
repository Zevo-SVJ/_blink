/**
 * 12–15s — the stamp.
 *
 * The verdict has to feel like a decision that has been *made*, not a result
 * that has been computed. A stamp is the only office object that carries
 * that: it is heavy, it is manual, and what it leaves cannot be taken back.
 *
 * The mechanics are the beat. It lifts, hangs for a moment — the hang is what
 * makes the hit land — comes down fast, squashes on contact, the whole frame
 * jolts, and it lifts away to reveal the mark. The ink is already dry.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Desk } from "../objects/Desk";
import { Imprint, Stamp } from "../objects/Stamp";
import { Camera } from "../motion/Camera";
import { Label } from "../motion/Kinetic";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { a, C, HEIGHT, WIDTH } from "../theme";
import { STAMP_HIT, STAMP_LIFT, STAMP_UP, at, end } from "../timeline";

/** Where the die meets the paper. */
/*
  Where the die meets the paper.

  Centred rather than low: at 1120 the sheet sat on the bottom edge, the
  stamp lifted clean off the top of the frame, and six hundred pixels of
  nothing separated them.
*/
const PAPER_TOP = 1210;

export function Verdict({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* Up, hang, down. The hang is four frames of nothing and it is the most
     important part of the move. */
  const lift = interpolate(frame, [STAMP_LIFT, STAMP_LIFT + 9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const fall = interpolate(frame, [STAMP_HIT - 6, STAMP_HIT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t * t * t,
  });
  const away = interpolate(frame, [STAMP_UP, STAMP_UP + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  /* Height above the paper, in pixels.
     The fall is 640, not 510: at 510 the die stopped 130px short of the sheet,
     so the frame the sub-bass and the 56px shake land on was a stamp hanging
     in mid-air over an unmarked page. It has to touch on STAMP_HIT. */
  const height = 250 + lift * 260 - fall * 715 + away * 820;
  const press = frame >= STAMP_HIT && frame < STAMP_UP ? 1 : 0;

  /* The ink transfers on the hit and stays. */
  const ink = interpolate(frame, [STAMP_HIT, STAMP_HIT + 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Desk light={[0.48, 0.52]} spread={0.6}>
      <Camera
        drift={0.04}
        driftOver={90}
        shake={{ at: STAMP_HIT, amount: 56, decay: 6 }}
      >
        {/* The sheet being stamped. */}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: PAPER_TOP - 260 }}>
          <div
            style={{
              width: 980,
              height: 460,
              background: `linear-gradient(166deg, ${C.paper}, ${C.paperEdge})`,
              borderRadius: 4,
              boxShadow: `0 4px 10px ${a("hsl(0 0% 0%)", 0.45)}, 0 40px 90px ${a("hsl(0 0% 0%)", 0.5)}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {ink > 0 && (
              <Imprint ink={ink} width={860}>
                {copy.verdict}
              </Imprint>
            )}
          </div>
        </AbsoluteFill>

        {/* The stamp itself, above it. */}
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start" }}>
          <div
            style={{
              transform: `translateY(${PAPER_TOP - 700 - height}px) rotate(${-2 + lift * 1.5}deg)`,
              filter: `drop-shadow(0 ${20 + height * 0.06}px ${28 + height * 0.08}px ${a("hsl(0 0% 0%)", 0.6)})`,
            }}
          >
            {/* Wider than the mark it leaves. A 560px die printing an 860px
              word is a die that could not have made that mark, and the whole
              scene rests on believing it did. */}
          <Stamp press={press} width={900} />
          </div>
        </AbsoluteFill>
      </Camera>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 210 }}>
        <Label start={at("verdict") + 4} color={a(C.white, 0.68)} size={50}>
          {copy.verdictLabel}
        </Label>
      </AbsoluteFill>
    </Desk>
  );
}
