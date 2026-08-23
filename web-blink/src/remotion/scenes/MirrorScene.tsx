/**
 * 9–12s — the mirror, and what is behind it.
 *
 * The gap this scene has to make physical: how you see yourself versus how
 * you are seen. A mirror is the only object that can hold both, which is why
 * it is here and not a split screen.
 *
 * It arrives on a whip, shows the polished version for long enough to be
 * believed, and then something strikes it. The reveal is a *fracture*, not a
 * cut: what was behind the glass was always drawn underneath, so the crack
 * uncovers it rather than swapping to it.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

import { Desk } from "../objects/Desk";
import { Mirror, MIRROR_H, MIRROR_W } from "../objects/Mirror";
import { Camera } from "../motion/Camera";
import { Crash, Label } from "../motion/Kinetic";
import { springAt } from "../motion/springs";
import type { FilmCopy } from "../copy";
import { a, C, FONT, HEIGHT, T, WIDTH } from "../theme";
import {
  CRACK,
  MIRROR_IN,
  MIRROR_LABEL,
  SHED_FROM,
  TRUTH,
  at,
  end,
} from "../timeline";

/** The composed, deliberate version. Neat grid, even spacing, all correct. */
function Polished({ handle }: { handle: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(168deg, ${C.bgLift}, ${C.navy})`,
        padding: 40,
        paddingTop: 150,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 108,
            height: 108,
            borderRadius: "50%",
            background: `linear-gradient(150deg, ${C.sky}, ${C.bright})`,
          }}
        />
        <div>
          <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 800, color: C.white }}>
            {handle}
          </div>
          <div style={{ marginTop: 10, height: 10, width: 190, borderRadius: 5, background: a(C.white, 0.3) }} />
        </div>
      </div>
      <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[0.9, 0.6, 0.8, 0.68, 0.95, 0.55, 0.85, 0.72, 0.9].map((v, i) => (
          <div
            key={i}
            style={{
              paddingTop: "100%",
              borderRadius: 6,
              background: `hsl(212 ${18 + v * 20}% ${18 + v * 24}%)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * What is actually read off it: the same profile, in words.
 *
 * This is the payoff of the scene, so it has to be worth uncovering. Three
 * words floating in a nearly black arch read as an empty frame with a caption
 * — the reveal needs a light of its own, the full set of readings the film
 * has already extracted, and enough weight to hold a mirror this size.
 */
function Perceived({ copy }: { copy: FilmCopy }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(78% 52% at 52% 40%, hsl(214 58% 17%), hsl(220 60% 8%) 68%, hsl(222 64% 5%))`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        padding: 40,
        paddingTop: 150,
      }}
    >
      {copy.cards.map((word, i) => (
        <div
          key={word}
          style={{
            fontFamily: FONT,
            fontSize: i === 0 ? 104 : 86,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 1.08,
            color: i === 0 ? C.sky : a(C.white, 0.82 - i * 0.13),
            textShadow: i === 0 ? `0 0 60px ${a(C.sky, 0.45)}` : undefined,
            transform: `rotate(${i % 2 ? 1.2 : -1.4}deg)`,
          }}
        >
          {word}
        </div>
      ))}
    </div>
  );
}

export function MirrorScene({ copy }: { copy: FilmCopy }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const settle = springAt({ frame, fps, start: MIRROR_IN, preset: "crash" });

  /* The fracture spreads fast and then keeps creeping — glass does not break
     at a constant rate. */
  const crack = interpolate(frame, [CRACK, CRACK + 7, end("mirror") - 6], [0, 0.72, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* And then the glass goes. The fracture is the shock; the shards leaving is
     the reveal, and without it the polished version stayed on top of the real
     one for the whole second half of the scene. */
  const shed = interpolate(frame, [SHED_FROM, TRUTH + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t * t * (3 - 2 * t),
  });

  return (
    <Desk light={[0.5, 0.42]} spread={0.58}>
      <Camera
        drift={0.05}
        driftOver={90}
        shake={[
          { at: MIRROR_IN, amount: 16, decay: 4 },
          { at: CRACK, amount: 40, decay: 7 },
        ]}
      >
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              transform: `scale(${0.82 + settle * 0.18}) rotate(${(1 - settle) * 7}deg)`,
              marginTop: 40,
            }}
          >
            <Mirror
              crack={crack}
              shed={shed}
              front={<Polished handle={copy.handle} />}
              behind={<Perceived copy={copy} />}
              impact={[0.54, 0.38]}
            />
          </div>
        </AbsoluteFill>
      </Camera>

      {/* The comparison, stated as a comparison. Replacing one caption with
          the other left the audience holding only the second half of the
          sentence — the contrast *is* the idea, so the first line stays,
          struck out, while the second lands underneath it. */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 110,
          gap: 14,
        }}
      >
        <Label
          start={MIRROR_LABEL}
          color={a(C.white, frame >= TRUTH ? 0.34 : 0.72)}
          size={52}
          style={{
            textDecoration: frame >= TRUTH ? "line-through" : undefined,
            textDecorationThickness: 3,
          }}
        >
          {copy.mirrorYou}
        </Label>
        {frame >= TRUTH && (
          <Crash start={TRUTH} from={2.2} size={T.lead} column={WIDTH - 120} color={C.sky}>
            {copy.mirrorThem}
          </Crash>
        )}
      </AbsoluteFill>
    </Desk>
  );
}
