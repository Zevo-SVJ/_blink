/**
 * Act 2 — the analysis.
 *
 * The note this act exists to answer: *show that Blink analyses the profile,
 * don't show a progress bar.* So nothing here reports progress. The profile is
 * physically taken apart on screen.
 *
 *  - **eyeOpen** — the avatar the camera just drove into *is* the iris. The
 *    eye opens around it, so the reveal is a transformation of the thing
 *    already being looked at rather than a new object appearing.
 *  - **scanPass** — the profile is seen *through* the aperture, travelling,
 *    with a line of light passing down it.
 *  - **signals** — four labels are physically pulled out of the aperture and
 *    thrown outward. The profile is being decomposed into what Blink read.
 *  - **readingLine** — the breath. One short line, still, so the four seconds
 *    either side read as fast.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Eye, EyeAperture } from "../elements/Eye";
import { ScanLine } from "../elements/Reticle";
import { Label, Word } from "../motion/Kinetic";
import { Camera } from "../motion/Camera";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { C, FONT, HEIGHT, T, WIDTH } from "../theme";
import { at, len } from "../timeline";
import { CX, H, W } from "../elements/Eye";

/* The eye's drawing box.

   `top` is solved rather than picked: the box is 2480 wide for a 1400-unit
   viewBox, so one unit is 1.771 film pixels and the eye's midline sits 1063
   pixels below the box's top edge. Placing the box at 300 put the eye in the
   bottom third with a dead upper half above it — the first cut placed the box
   instead of the eye. -233 lands the midline at 830, high enough to leave the
   lower frame for the signals and the line. */
const BOX = { left: -880, top: -246, width: 2840 };
const UNIT = BOX.width / W;
/** Centre of the iris in film pixels — the far side of the match cut. */
const IRIS = { x: BOX.left + CX * UNIT, y: BOX.top + 600 * UNIT };

/*
  Where the signals fly out to.

  Solved against the aperture, which spans roughly y 620–960 and nearly the
  full width: two seats sit clear above it, two clear below, and every x keeps
  the label's own half-width inside the frame — the first cut ran "COULEURS"
  off the left edge and dropped "COHÉRENCE" on top of the eye.
*/
const SIGNAL_SEATS = [
  { x: 306, y: 500, dir: -1 },
  { x: 754, y: 640, dir: 1 },
  { x: 300, y: 1252, dir: -1 },
  { x: 752, y: 1392, dir: 1 },
];

export function Analysis({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const T_OPEN = at("eyeOpen");
  const T_SCAN = at("scanPass");
  const T_SIG = at("signals");
  const T_READ = at("readingLine");
  const T_WIPE = at("wipeToTags");

  /* The eye opens fast and hard — this is the reveal, not a mood. */
  const open = springAt({ frame, fps, start: T_OPEN, preset: "crisp" });

  /* The profile travels up behind the aperture. Something is always in the
     slot; an eye opening onto nothing reads as a loading state. */
  const travel = interpolate(frame, [T_OPEN + 6, T_SIG + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  });

  /* Two passes of the scan line, because one reads as an accident. */
  const scanP = interpolate(frame, [T_SCAN, T_SCAN + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanP2 = interpolate(frame, [T_SCAN + 14, T_SCAN + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* The camera pulls back out of the push that ended the hook, so the two
          acts are one continuous move across the cut. */}
      <Camera zoom={[3.1, 1]} over={[T_OPEN, T_OPEN + 18]} origin={[IRIS.x, IRIS.y]}>
        {/* A wash behind the eye so it is not floating on flat navy. */}
        <AbsoluteFill
          style={{
            /* Strong enough to read as light coming off the eye. At 0x22 it
               was invisible against the navy and the eye floated on flat
               colour. */
            background: `radial-gradient(62% 40% at 50% ${(IRIS.y / HEIGHT) * 100}%, ${C.bright}4a, transparent 72%)`,
          }}
        />

        <EyeAperture
          open={open}
          id="film-aperture"
          style={{
            position: "absolute",
            left: BOX.left,
            top: BOX.top,
            width: BOX.width,
          }}
        >
          <rect x={0} y={0} width={W} height={H} fill={C.navy} />

          {/* The account, rising through the slot: identity first, grid after.
              Solved against the aperture rather than eyeballed — the slot is
              centred on 600, so at travel 0 the identity row is in it. */}
          <g transform={`translate(0 ${640 - travel * 380})`}>
            <circle cx={548} cy={-40} r={58} fill={C.sky} />
            <rect x={636} y={-74} width={244} height={32} rx={16} fill="rgba(255,255,255,0.92)" />
            <rect x={636} y={-24} width={156} height={19} rx={10} fill="rgba(255,255,255,0.38)" />
            {Array.from({ length: 12 }, (_, i) => (
              <rect
                key={i}
                x={520 + (i % 3) * 128}
                y={70 + Math.floor(i / 3) * 128}
                width={116}
                height={116}
                rx={16}
                fill={`rgba(255,255,255,${0.1 + (i % 4) * 0.045})`}
              />
            ))}
          </g>
        </EyeAperture>

        {/* The scan, clipped to the aperture's bounding area. */}
        <div
          style={{
            position: "absolute",
            left: BOX.left + 380 * UNIT,
            top: BOX.top + 430 * UNIT,
            width: 640 * UNIT,
            height: 340 * UNIT,
            overflow: "hidden",
            opacity: open,
          }}
        >
          <ScanLine p={scanP} width={640 * UNIT} height={340 * UNIT} />
          <ScanLine p={scanP2} width={640 * UNIT} height={340 * UNIT} />
        </div>
      </Camera>

      {/* Signals, thrown out of the aperture. Each is pulled *from* the eye
          rather than placed near it, so the profile is visibly being taken
          apart into what Blink read off it. */}
      {frame >= T_SIG &&
        copy.signals.map((sig, i) => {
          const start = T_SIG + i * 7;
          const s = springAt({ frame, fps, start, preset: "punch" });
          const seat = SIGNAL_SEATS[i];
          const gone = interpolate(frame, [T_WIPE - 4, T_WIPE + 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Travels from the iris to its seat.
          const x = IRIS.x + (seat.x - IRIS.x) * s;
          const y = IRIS.y + (seat.y - IRIS.y) * s;

          return (
            <div
              key={sig}
              style={{
                position: "absolute",
                left: x,
                top: y,
                transform: `translate(-50%,-50%) scale(${(0.4 + s * 0.6) * (1 - gone * 0.3)}) rotate(${seat.dir * (1 - s) * 8}deg)`,
                opacity: Math.min(1, s * 4) * (1 - gone),
                padding: "18px 34px",
                borderRadius: 999,
                background: "rgba(9,20,45,0.86)",
                border: `2px solid ${C.sky}55`,
                fontFamily: FONT,
                fontSize: 38,
                fontWeight: 800,
                letterSpacing: "0.1em",
                color: C.sky,
                whiteSpace: "nowrap",
                boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
              }}
            >
              {sig}
            </div>
          );
        })}

      {/* The breath. */}
      {frame >= T_READ && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 190 }}>
          <Word start={T_READ} from="up" preset="settle" size={T.lead} color={C.white} track="-0.03em">
            {copy.reading}
          </Word>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
