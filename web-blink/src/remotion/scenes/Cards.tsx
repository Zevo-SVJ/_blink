/**
 * 6–9s — the print comes apart and the cards come out of it.
 *
 * The argument of the scene is *extraction*. Each card has to look like it
 * was pulled from the photograph rather than placed next to it, so every one
 * of them starts at the tile it came from — small, at the print's own angle —
 * and travels out to its seat, growing and straightening as it goes.
 *
 * They arrive on different arcs at different speeds, because four objects
 * that move identically read as a list animating, not as things being pulled
 * out of something.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Desk } from "../objects/Desk";
import { Photo } from "../objects/Photo";
import { Card } from "../objects/Card";
import { Camera } from "../motion/Camera";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { a, C, HEIGHT, WIDTH } from "../theme";
import { CARD_BEATS, FRAGMENT, at, end } from "../timeline";

/** Where each card starts (on the print) and ends (on the desk). */
const FLIGHT = [
  // Clear of the header: the first card used to come to rest across the
  // avatar and the handle, so the profile lost its identity the moment the
  // scene started reading it.
  { from: [420, 900], to: [300, 726], rot: -7, w: 470 },
  { from: [660, 940], to: [778, 902], rot: 5, w: 470 },
  { from: [430, 1120], to: [286, 1130], rot: 4, w: 470 },
  { from: [690, 1150], to: [790, 1382], rot: -6, w: 470 },
];

export function Cards({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* The print disintegrates as the cards leave it — cause and effect, not
     two things happening at once. */
  /* Linear, deliberately. An ease-out here front-loads the disintegration
     into the first half-second and the print is an empty frame by the time
     the third card is pulled — the opposite of what the scene is arguing. */
  const fragment = interpolate(frame, [FRAGMENT, end("cards") - 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Desk light={[0.46, 0.44]} spread={0.68}>
      <Camera
        drift={0.04}
        driftOver={90}
        zoom={[1, 0.88]}
        over={[FRAGMENT, end("cards") - 20]}
        shake={CARD_BEATS.map((b) => ({ at: b, amount: 9, decay: 3 }))}
      >
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {/* No wash. Fading the print against a dark desk turns warm paper
              grey, and a grey print reads as an old photo rather than as one
              being taken apart — the emptying happens inside the image area
              instead. It does settle back a little as it gives up its last
              tile, so the shot is not static going into the whip. */}
          <div
            style={{
              transform: `scale(${1 - fragment * 0.05}) rotate(${fragment * -1.1}deg)`,
            }}
          >
            <Photo handle={copy.handle} fragment={fragment} />
          </div>
        </AbsoluteFill>

        {CARD_BEATS.map((beat, i) => {
          if (frame < beat) return null;
          const s = springAt({ frame, fps, start: beat, preset: "crash" });
          const f = FLIGHT[i];

          // Straight from the tile it came from to its seat, on an arc.
          const px = f.from[0] + (f.to[0] - f.from[0]) * s;
          const py = f.from[1] + (f.to[1] - f.from[1]) * s - Math.sin(s * Math.PI) * 70;

          return (
            <div
              key={copy.cards[i]}
              style={{
                position: "absolute",
                left: px,
                top: py,
                transform: `translate(-50%,-50%) scale(${0.3 + s * 0.7}) rotate(${(1 - s) * (i % 2 ? 34 : -30) + f.rot * s}deg)`,
                opacity: Math.min(1, (frame - beat) / 2),
              }}
            >
              <Card width={f.w}>{copy.cards[i]}</Card>
            </div>
          );
        })}
      </Camera>
    </Desk>
  );
}
