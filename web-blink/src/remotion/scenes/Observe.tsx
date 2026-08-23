/**
 * 3–6s — the loupe crosses the print.
 *
 * This scene has one job: prove that Blink *looks*. Not that it indicates, or
 * highlights, or draws a box — that it magnifies, the way a person leaning in
 * with a lens does.
 *
 * So the photo is drawn twice and the second copy is scaled about the lens
 * centre. Whatever is under the glass is genuinely bigger, and it slides at a
 * different rate from the rest of the print as the loupe travels. The three
 * things it finds are named as it reaches them, on a label that sits *beside*
 * the lens rather than over the picture.
 */

import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { Desk } from "../objects/Desk";
import { Photo } from "../objects/Photo";
import { LENS_R, Loupe } from "../objects/Loupe";
import { Camera } from "../motion/Camera";
import { springAt } from "../motion/springs";
import { Tag } from "../objects/Card";
import type { FilmCopy } from "../copy";
import { a, C, HEIGHT, WIDTH } from "../theme";
import {
  DETAIL_BEATS,
  LOUPE_ENTER,
  LOUPE_FROM,
  LOUPE_IN,
  LOUPE_TO,
} from "../timeline";

/*
  Where the lens is, frame by frame.

  Written as stops on the timeline rather than as a shape with an easing over
  it, because the scene names what it is looking at: the label has to appear
  on the frame the glass is actually over the thing. Solved as a curve with a
  separate easing, the lens was still near its entry point when the first
  label said "the bio", and it was over the bottom of the print while the
  highlight lit the top of it.

  The coordinates come from the print's real layout. It is 880 wide, centred,
  so it spans x 100–980 and y 422–1497; inside it the bio sits around y 560,
  the first row of tiles runs y 627–890, and the grid as a whole is centred
  near y 1030.
*/
const STOPS: Array<{ at: number; p: [number, number] }> = [
  { at: LOUPE_FROM, p: [880, 520] },
  { at: DETAIL_BEATS[0], p: [408, 562] },
  { at: DETAIL_BEATS[1], p: [540, 760] },
  { at: DETAIL_BEATS[2], p: [548, 1058] },
  { at: LOUPE_TO, p: [812, 1352] },
];

function lensAt(frame: number): [number, number] {
  if (frame <= STOPS[0].at) return STOPS[0].p;
  for (let i = 1; i < STOPS.length; i++) {
    if (frame <= STOPS[i].at) {
      const A = STOPS[i - 1];
      const B = STOPS[i];
      const f = (frame - A.at) / (B.at - A.at);
      // Smoothstep, so the glass settles on each detail instead of cornering.
      const e = f * f * (3 - 2 * f);
      return [A.p[0] + (B.p[0] - A.p[0]) * e, A.p[1] + (B.p[1] - A.p[1]) * e];
    }
  }
  return STOPS[STOPS.length - 1].p;
}

export function Observe({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* The slide in. Started six frames before the scene's own beat and thrown
     only 520px: at 900 the loupe was still past the right edge of a 1080
     frame on the frame the entrance was supposed to be photographed, so the
     scene opened on a print with nothing happening to it. */
  const enter = springAt({ frame, fps, start: LOUPE_ENTER, preset: "crash" });

  const [lx, ly] = lensAt(frame);
  // Off frame to the right before it enters.
  const x = lx + (1 - enter) * 520;
  const y = ly + (1 - enter) * -140;

  /* Which detail is currently under the glass. */
  const found = DETAIL_BEATS.filter((b) => frame >= b).length - 1;

  /* The print, as a component, so it can be drawn twice — once flat and once
     magnified inside the lens. Identical props, so the two copies cannot
     disagree. */
  const print = (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Photo handle={copy.handle} lit={found} />
    </AbsoluteFill>
  );

  return (
    <Desk light={[0.44, 0.42]} spread={0.62}>
      <Camera drift={0.045} driftOver={90} shake={{ at: LOUPE_IN, amount: 10, decay: 4 }}>
        {print}
        <Loupe x={x} y={y} power={1.95} tilt={-14}>
          {print}
        </Loupe>
      </Camera>

      {/* What it found, on a gummed label beside the lens. Placed on the
          opposite side to the lens's travel so it never covers what is being
          looked at. */}
      {found >= 0 && (
        <div
          style={{
            position: "absolute",
            /* Under the lens, never beside it. A 336px lens and a 390px label
               do not both fit across a 1080 frame, so whichever side the
               label was put on it either covered the glass or hung off the
               edge — it did both, in the same scene. Below the glass there is
               always room, and the thing being named stays visible. */
            left: Math.min(WIDTH - 440, Math.max(40, x - 150)),
            top: Math.min(HEIGHT - 150, y + LENS_R + 22),
            transform: `scale(${0.7 + springAt({ frame, fps, start: DETAIL_BEATS[found], preset: "crash" }) * 0.3}) rotate(${found % 2 === 0 ? -2.5 : 2}deg)`,
            transformOrigin: "0% 0%",
          }}
        >
          <Tag>{copy.details[found]}</Tag>
        </div>
      )}

      {/* A thin trail behind the lens: where it has already been. Fades, so
          the scene reads as a pass rather than as a scribble. */}
      {frame > LOUPE_FROM + 4 && frame < LOUPE_TO && (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={{ position: "absolute", inset: 0 }}
          fill="none"
        >
          <polyline
            points={Array.from({ length: 24 }, (_, i) => {
              const [px, py] = lensAt(
                LOUPE_FROM + ((frame - LOUPE_FROM) * i) / 23,
              );
              return `${px},${py}`;
            }).join(" ")}
            stroke={a(C.sky, 0.22)}
            strokeWidth={3}
            strokeDasharray="10 14"
          />
        </svg>
      )}
    </Desk>
  );
}
