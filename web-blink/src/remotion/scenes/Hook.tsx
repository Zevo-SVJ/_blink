/**
 * 0–3s — the photo lands, and two lines hit it.
 *
 * The print falls from above frame and *lands*: it overshoots, bounces once
 * and settles, with the shadow tightening underneath as it comes down. That
 * bounce is three frames of work and it is the difference between an object
 * arriving and an image appearing.
 *
 * Then the claim strikes it, and then the interrupt strikes harder. The second
 * line is the hook — the first is a question you could shrug off, the second
 * says it has already happened.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Desk } from "../objects/Desk";
import { Photo, PHOTO_H } from "../objects/Photo";
import { Camera } from "../motion/Camera";
import { Crash, fitBlock } from "../motion/Kinetic";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { a, C, HEIGHT, T, WIDTH } from "../theme";
import { HOOK_A, HOOK_B, HOOK_B_EVERY, HOOK_EVERY, PHOTO_DROP } from "../timeline";

/** Columns the two statements are set in. */
const COL_A = WIDTH - 160;
const COL_B = WIDTH - 60;

export function Hook({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* One size per statement. Solved once, off the longest line, so the block
     is a block and not a pile of independently scaled captions. */
  const sizeA = fitBlock(copy.hookA, T.big, COL_A);
  const sizeB = fitBlock(copy.hookB, T.huge, COL_B);

  /* The fall. A spring on the drop gives the bounce for free — the overshoot
     *is* the print hitting the desk and rebounding a few millimetres. */
  const drop = springAt({ frame, fps, start: PHOTO_DROP, preset: "drop" });
  /* Half a frame height, not a whole one. Thrown from -0.95 the print is
     entirely above the top edge for the first eight frames, so the film opened
     on an empty desk — the worst possible first second. At -0.5 the bottom of
     the print is already in shot on frame 0 and the audience sees the fall
     rather than its aftermath. */
  const y = (1 - drop) * -HEIGHT * 0.5;
  const tilt = (1 - drop) * -14;

  /* The shadow tightens and darkens as the gap closes. Nothing sells a fall
     like the shadow arriving before the object does. */
  const gap = Math.max(0, 1 - drop);
  const shadowBlur = 40 + gap * 130;
  const shadowSpread = gap * 60;

  /* The second line pushes the whole scene back — the interrupt is a change
     of depth, not just a change of words. */
  const shove = springAt({ frame, fps, start: HOOK_B, preset: "crash" });

  return (
    <Desk light={[0.46, 0.4]} spread={0.6}>
      <Camera
        drift={0.05}
        driftOver={90}
        shake={[
          { at: PHOTO_DROP + 8, amount: 26, decay: 5 },
          { at: HOOK_A, amount: 12, decay: 4 },
          { at: HOOK_B, amount: 34, decay: 6 },
        ]}
      >
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${1 - shove * 0.14})`,
          }}
        >
          <div
            style={{
              transform: `translateY(${y}px) rotate(${tilt}deg)`,
              filter: `drop-shadow(0 ${18 + gap * 60}px ${shadowBlur}px ${a("hsl(0 0% 0%)", 0.55 + gap * 0.2)})`,
            }}
          >
            <Photo handle={copy.handle} />
          </div>
        </AbsoluteFill>
      </Camera>

      {/* The claim. Struck across the print, not floating above it. */}
      {frame >= HOOK_A && frame < HOOK_B && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {copy.hookA.map((line, i) => {
              /* Three short lines, eight frames apart — closer together than
                 the springs take to settle, so each one lands while the last
                 is still moving. One seventeen-character line had to be set at
                 95px to fit the frame, which is small for the claim the whole
                 film rests on; broken in three it sets at the full 124. */
              const start = HOOK_A + i * HOOK_EVERY;
              if (frame < start) return null;
              return (
                <Crash
                  key={line}
                  start={start}
                  from={2.1}
                  size={sizeA}
                  fit={false}
                  color={C.white}
                  style={{ textShadow: `0 10px 40px ${a("hsl(0 0% 0%)", 0.85)}` }}
                >
                  {line}
                </Crash>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* The interrupt. Bigger, warmer, and it arrives on a hit. */}
      {frame >= HOOK_B && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {/* A slab behind it, so the second line is unmistakably a different
              kind of statement from the first. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: interpolate(frame, [HOOK_B, HOOK_B + 6], [0, 636], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: (t) => 1 - Math.pow(1 - t, 4),
              }),
              background: a(C.bg, 0.9),
              borderTop: `4px solid ${C.sky}`,
              borderBottom: `4px solid ${C.sky}`,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            {copy.hookB.map((line, i) => {
              /* Three lines, seven frames apart. Two lines capped the whole
                 block at the width of "SANS QUE TU" — 127px against the
                 claim's 124 — so the interrupt was the same size as the thing
                 it was interrupting. Broken shorter it sets at the full 168
                 and lands three hits inside the last second of the scene. */
              /* The first line lands *on* the beat, not two frames after it:
                 the sub-bass fires at HOOK_B and that frame was rendering the
                 slab opening over an empty pane. */
              const start = HOOK_B + i * HOOK_B_EVERY;
              if (frame < start) return null;
              return (
                <Crash
                  key={line}
                  start={start}
                  from={2.3}
                  size={sizeB}
                  fit={false}
                  color={i === copy.hookB.length - 1 ? C.sky : C.white}
                >
                  {line}
                </Crash>
              );
            })}
          </div>
        </AbsoluteFill>
      )}
    </Desk>
  );
}
