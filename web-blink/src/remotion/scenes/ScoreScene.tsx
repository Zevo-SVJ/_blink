/**
 * 15–18s — into the ink, and the projector.
 *
 * The match cut is the whole scene. The camera drives at the red mark left by
 * the stamp until the ink is the entire frame — and then the frame *stays*
 * red and a machine switches on inside it. Nothing cuts. The audience is
 * carried into the next room through a colour they were already looking at.
 *
 * What waits there is a slide projector, because the score should read as
 * something a device reported rather than as a number that appeared. It
 * counts in tenths, mechanically, and stops.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Beam, Projector, Slide } from "../objects/Projector";
import { Imprint } from "../objects/Stamp";
import { Camera } from "../motion/Camera";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { a, C, HEIGHT, WIDTH } from "../theme";
import { DIVE, INK, PROJECT, SCORE_FROM, SCORE_TO, at, end } from "../timeline";

/** Ink blooms in the flooded frame: x%, y%, diameter, alpha. Deterministic. */
const BLOOMS: Array<[number, number, number, number]> = [
  [24, 22, 620, 0.5], [72, 30, 480, 0.38], [40, 66, 760, 0.42],
  [82, 74, 520, 0.3], [14, 82, 440, 0.34], [58, 12, 380, 0.28],
];

export function ScoreScene({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* The dive. Accelerating, so it reads as travelling rather than scaling. */
  const dive = interpolate(frame, [DIVE, INK], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => Math.pow(t, 2.6),
  });

  /* The ink floods, then drains back to a wash as the room takes over.

     Nine frames to drain, not fourteen, and it never quite reaches opaque:
     held at 1 for that long the film sat on half a second of flat red with
     nothing in it, which is a dead spot in the middle of its best cut. */
  const flood = interpolate(frame, [INK - 6, INK, INK + 9], [0, 0.94, 0.24], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lamp = springAt({ frame, fps, start: PROJECT, preset: "tight" });
  const spread = interpolate(frame, [PROJECT, PROJECT + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  /* Tenths, and it stops on the value. A counter wheel does not ease. */
  const target = Number(copy.score);
  const t = interpolate(frame, [SCORE_FROM, SCORE_TO], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shown = (Math.round(target * t * 10) / 10).toFixed(1);

  return (
    <AbsoluteFill style={{ background: C.inkDeep, overflow: "hidden" }}>
      {/* The room the ink turns into. Blooms and a grain over the gradient:
          flat red is a colour, and the scene needs somewhere to *be*. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(80% 54% at 62% 48%, hsl(354 40% 18%), hsl(352 60% 8%))`,
        }}
      />
      <AbsoluteFill style={{ opacity: 0.9 }}>
        {BLOOMS.map(([bx, by, r, o], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${bx}%`,
              top: `${by}%`,
              width: r,
              height: r,
              marginLeft: -r / 2,
              marginTop: -r / 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${a("hsl(356 74% 46%)", o)}, transparent 68%)`,
              filter: "blur(18px)",
            }}
          />
        ))}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `repeating-linear-gradient(102deg, ${a("hsl(0 0% 0%)", 0.16)} 0 2px, transparent 2px 7px)`,
          opacity: 0.5,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(72% 46% at 50% 50%, transparent 42%, ${a("hsl(352 70% 4%)", 0.86)})`,
        }}
      />

      {/* The dive. The sheet from the scene before, driven at the camera until
          the red of the word is the whole frame — that is the match cut, and
          without it the twenty frames between the stamp and the projector were
          a dark red screen with nothing on it. */}
      {frame < INK + 4 && (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: 950,
            filter: dive > 0.5 ? `blur(${(dive - 0.5) * 26}px)` : undefined,
          }}
        >
          <div
            style={{
              width: 980,
              height: 460,
              background: `linear-gradient(166deg, ${C.paper}, ${C.paperEdge})`,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 40px 90px ${a("hsl(0 0% 0%)", 0.5)}`,
              transform: `scale(${1 + dive * 26})`,
              transformOrigin: "50% 50%",
            }}
          >
            <Imprint ink={1} width={860}>
              {copy.verdict}
            </Imprint>
          </div>
        </AbsoluteFill>
      )}

      <Camera drift={0.05} driftOver={90} shake={{ at: PROJECT, amount: 14, decay: 4 }}>
        {frame >= PROJECT && (
          <>
            {/* The machine, high and centred, throwing down the frame. */}
            <div
              style={{
                position: "absolute",
                left: WIDTH / 2 - 230,
                top: 214,
                transform: `scale(${(0.88 + lamp * 0.12) * 1.22})`,
                transformOrigin: "50% 100%",
              }}
            >
              <Projector lamp={lamp} />
            </div>

            <Beam
              spread={spread}
              width={WIDTH}
              height={1150}
              style={{ position: "absolute", left: 0, top: 500 }}
            >
              <div
                style={{
                  transform: `scale(${0.86 + springAt({ frame, fps, start: PROJECT + 8, preset: "crash" }) * 0.14})`,
                  opacity: Math.min(1, (frame - PROJECT - 6) / 4),
                }}
              >
                <Slide
                  label={copy.scoreLabel}
                  value={shown}
                  outOf={copy.scoreOutOf}
                  width={840}
                />
              </div>
            </Beam>
          </>
        )}
      </Camera>

      {/* The ink flooding the frame. Drawn last so it covers the dive, and
          fading to a wash so the room is revealed *through* it. */}
      {flood > 0.01 && (
        <AbsoluteFill
          style={{
            background: C.ink,
            opacity: flood,
            // Grows from where the mark was until it is everything.
            clipPath: `circle(${Math.max(dive, flood) * 160}% at 50% 62%)`,
          }}
        />
      )}
    </AbsoluteFill>
  );
}
