/**
 * A camera over the frame.
 *
 * Everything in the film is drawn at 1080×1920 and then looked at through
 * this: push in, pull out, pan, and a controlled shake. It exists because
 * moving the camera and moving the content are different-looking things — when
 * the camera pushes, *everything* scales together and the composition holds,
 * whereas scaling one element makes it grow against a static background, which
 * reads as a zoom on a still image.
 *
 * `origin` is what makes a match cut possible: pushing into the point where
 * the avatar sits, then cutting to the next shot with the eye's iris at the
 * same point and the same scale, and the two shapes are the same object.
 */

import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export interface CameraMove {
  /** Scale at the start and end of the move. 1 is neutral. */
  zoom?: [number, number];
  /** Frames the move runs over, relative to the moment. */
  over?: [number, number];
  /** Where the zoom is centred, in film pixels. */
  origin?: [number, number];
  /** Pan, in film pixels, start to end. */
  pan?: [[number, number], [number, number]];
  easing?: (t: number) => number;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
/** Slow, then very fast: the shape of a push that becomes a cut. */
export const easeInExpo = (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function Camera({
  children,
  zoom = [1, 1],
  over = [0, 30],
  origin = [540, 960],
  pan,
  easing = easeOut,
  shake,
}: CameraMove & {
  children: ReactNode;
  /** `{ at, amount, decay }` — an impact the camera feels. */
  shake?: { at: number; amount: number; decay?: number };
}) {
  const frame = useCurrentFrame();

  /* A camera that is simply *held* at a pose is a legitimate thing to ask
     for, and it is written as a zero-length move. `interpolate` rejects an
     input range that does not increase, so that case is answered here rather
     than by every caller remembering to write `[0, 1]`. */
  const t =
    over[1] > over[0]
      ? interpolate(frame, over, [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing,
        })
      : frame >= over[1]
        ? 1
        : 0;

  const scale = zoom[0] + (zoom[1] - zoom[0]) * t;
  const px = pan ? pan[0][0] + (pan[1][0] - pan[0][0]) * t : 0;
  const py = pan ? pan[0][1] + (pan[1][1] - pan[0][1]) * t : 0;

  /*
    Shake, decaying.

    Deterministic rather than random: the same frame must shake by the same
    amount every render, or a re-render produces a different film. Two
    detuned sine waves read as an impact; noise reads as a glitch, and this
    brand does not glitch.
  */
  let sx = 0;
  let sy = 0;
  if (shake) {
    const s = frame - shake.at;
    if (s >= 0) {
      const decay = Math.exp(-s / (shake.decay ?? 6));
      sx = Math.sin(s * 1.9) * shake.amount * decay;
      sy = Math.cos(s * 2.7) * shake.amount * 0.7 * decay;
    }
  }

  return (
    <AbsoluteFill
      style={{
        transform: `translate3d(${px + sx}px, ${py + sy}px, 0) scale(${scale})`,
        transformOrigin: `${origin[0]}px ${origin[1]}px`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}
