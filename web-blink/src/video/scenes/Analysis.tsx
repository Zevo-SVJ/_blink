/**
 * Scene 3 — the look.
 *
 * The eye is a window and the profile travels through it. The lids part, the
 * account rises behind the opening, and as each part of it passes the eye
 * names what it is reading.
 *
 * Two earlier cuts failed here and both failures were instructive. Putting the
 * eye *behind* the profile card hid it: an eye you cannot see is a shape, and
 * the scene read as a rectangle with a line across it. Clipping a whole
 * portrait card *inside* the aperture failed differently — the aperture is a
 * lens roughly a sixth as tall as it is wide, so a card placed in it is mostly
 * cropped away, which looks like a bug rather than a frame.
 *
 * Moving the subject instead of the frame solves both. A slot showing one band
 * of something at a time is a legible thing to look at, it gives the scene its
 * own motion without a camera move, and it says the right thing: you are
 * seeing this account the way Blink sees it, a piece at a time.
 */

import { CY, lids } from "@/components/blink/eye-geometry";
import { interpolate, inOut, outExpo, spring } from "@/video/frame";
import { ink, Layer } from "@/video/Stage";
import { useFilmCopy } from "@/video/copy-context";

/* The eye's drawing box, in film pixels. Overhangs the frame so the aperture
   is the picture rather than an icon sitting in the middle of one. `top` is
   set so the eye's own midline lands just above the centre of frame — the
   first pass placed the box rather than the eye, which put the aperture in
   the bottom third with a dead gap above it. */
const BOX = { left: -700, top: -163, width: 2480, viewW: 1400, viewH: 1200 };
const unit = BOX.width / BOX.viewW;

export function Analysis({ frame }: { frame: number }) {
  const open = interpolate(frame, [0, 30], [0, 1], { easing: outExpo });
  /* The account travels up behind the opening: identity first, then the grid.
     Eased at both ends so it reads as considered rather than mechanical.

     Starts at frame 10, not 24. The aperture used to hold nothing for the
     first three quarters of a second — the eye opened onto an empty slot,
     which reads as a loading state rather than as a thing being looked at. */
  const travel = interpolate(frame, [10, 92], [0, 1], { easing: inOut });

  const { signals: SIGNALS, reads } = useFilmCopy();

  /* One signal at a time. Four labels stacked at one position is how the first
     cut rendered them — all on the same line, on top of each other. */
  const step = Math.min(SIGNALS.length - 1, Math.max(0, Math.floor((frame - 26) / 15)));
  const signal = SIGNALS[step];
  const signalIn = spring({ frame: frame - (26 + step * 15), config: { stiffness: 320, damping: 26 } });

  return (
    <Layer>
      <svg
        viewBox={`0 0 ${BOX.viewW} ${BOX.viewH}`}
        style={{ position: "absolute", left: BOX.left, top: BOX.top, width: BOX.width }}
        fill="none"
      >
        <defs>
          <clipPath id="film-aperture">
            <path d={lids(open)} />
          </clipPath>
        </defs>

        <g clipPath="url(#film-aperture)">
          <rect x={0} y={0} width={BOX.viewW} height={BOX.viewH} fill="hsl(220 62% 12%)" />

          {/* The account, rising. Drawn tall so there is always something in
              the slot, and moved rather than the frame.

              The offsets are solved against the aperture, not eyeballed: the
              slot is centred on `CY`, so at `travel` 0 the identity row sits
              exactly in it, and at 1 the grid does. The first cut started the
              row below the slot, so the scene's opening third was an empty
              window. */}
          <g transform={`translate(0 ${CY + 40 - travel * 360})`}>
            <circle cx={548} cy={-40} r={58} fill="hsl(var(--blink-sky) / 0.85)" />
            <rect x={636} y={-74} width={244} height={32} rx={16} fill="hsl(210 40% 96% / 0.92)" />
            <rect x={636} y={-24} width={156} height={19} rx={10} fill="hsl(210 40% 96% / 0.38)" />
            {Array.from({ length: 12 }, (_, i) => (
              <rect
                key={i}
                x={520 + (i % 3) * 128}
                y={70 + Math.floor(i / 3) * 128}
                width={116}
                height={116}
                rx={16}
                fill={`hsl(210 40% 96% / ${0.1 + (i % 4) * 0.045})`}
              />
            ))}
          </g>

          {/* A soft wash tying the contents to the light of the eye. */}
          <rect
            x={0}
            y={0}
            width={BOX.viewW}
            height={BOX.viewH}
            fill="hsl(var(--blink-sky-bright) / 0.07)"
          />
        </g>

        <path d={lids(open)} fill="none" stroke={ink.bright} strokeOpacity={0.22} strokeWidth={26} strokeLinecap="round" />
        {/* Thinner than the first cut. At 9 the rim was the brightest thing on
            screen and the profile inside it read as a smudge behind a frame. */}
        <path d={lids(open)} fill="none" stroke={ink.white} strokeWidth={6.5} strokeLinecap="round" />
      </svg>

      {/* What it is reading, one thing at a time, under the eye. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: CY * unit + BOX.top + 250,
          textAlign: "center",
          fontSize: 46,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: ink.sky,
          opacity: signalIn * 0.95,
          transform: `translateY(${(1 - signalIn) * 22}px)`,
        }}
      >
        {signal}
      </div>

      {/* A floor, and a count. Without it the scene has a live top half and a
          dead bottom third, and the signals read as one label changing rather
          than a list being worked through. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1560,
          display: "flex",
          justifyContent: "center",
          gap: 14,
        }}
      >
        {SIGNALS.map((s, i) => (
          <span
            key={s}
            style={{
              width: i === step ? 58 : 26,
              height: 6,
              borderRadius: 99,
              background:
                i < step
                  ? "hsl(var(--blink-sky) / 0.45)"
                  : i === step
                    ? ink.sky
                    : "hsl(210 40% 96% / 0.14)",
              opacity: interpolate(frame, [20, 32], [0, 1], { easing: outExpo }),
            }}
          />
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: 88,
          right: 88,
          top: 430,
          textAlign: "center",
          fontSize: 50,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: ink.soft,
          opacity: interpolate(frame, [6, 20], [0, 1], { easing: outExpo }),
        }}
      >
        {reads}
      </div>
    </Layer>
  );
}
