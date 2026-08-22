/**
 * Scene 6 — the score.
 *
 * Proof that the reads are a measurement and not an opinion generator. The
 * ring draws, the number counts, and it is over — this is the shortest scene
 * on purpose, because a number is evidence, not the story.
 *
 * Same vocabulary as the product's own score ring: one stroked arc, `tnum`
 * figures, the value out of ten. Reusing the shipping component would have
 * meant importing its time-based animation, which cannot be addressed by
 * frame; the geometry is the part that carries the identity, and it is four
 * lines.
 */

import { interpolate, inOut, outExpo, spring } from "@/video/frame";
import { useFilmCopy } from "@/video/copy-context";
import { ink, Layer } from "@/video/Stage";

const VALUE = 8.6;
const R = 250;
const CIRC = 2 * Math.PI * R;

export function Score({ frame }: { frame: number }) {
  const { scoreLabel, scoreOutOf, scoreKicker } = useFilmCopy();

  /* The arc draws, then the number catches up to it — the ring is the claim,
     the digits are the receipt. */
  const draw = interpolate(frame, [4, 46], [0, 1], { easing: inOut });
  const shown = (VALUE * draw).toFixed(1);
  const pop = spring({ frame: frame - 44, config: { stiffness: 260, damping: 17 } });

  /* No opaque floor here: the scene's own background was painting over the
     atmosphere the edit allots it, so the score sat on dead navy while the
     scene either side of it breathed. The film already lays a floor. */
  return (
    <Layer>
      <svg
        viewBox="0 0 640 640"
        style={{ position: "absolute", left: 220, top: 620, width: 640 }}
        fill="none"
      >
        <circle cx={320} cy={320} r={R} stroke="hsl(210 40% 96% / 0.09)" strokeWidth={26} />
        <circle
          cx={320}
          cy={320}
          r={R}
          stroke={ink.sky}
          strokeWidth={26}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - (draw * VALUE) / 10)}
          transform="rotate(-90 320 320)"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          left: 220,
          top: 620,
          width: 640,
          height: 640,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${0.96 + pop * 0.04})`,
        }}
      >
        <div
          style={{
            fontSize: 196,
            fontWeight: 800,
            letterSpacing: "-0.05em",
            color: ink.white,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {shown}
        </div>
        <div style={{ marginTop: 6, fontSize: 46, fontWeight: 700, color: ink.soft }}>{scoreOutOf}</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 470,
          textAlign: "center",
          fontSize: 38,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: ink.sky,
          opacity: interpolate(frame, [0, 12], [0, 0.9], { easing: outExpo }),
        }}
      >
        {scoreLabel}
      </div>

      <div
        style={{
          position: "absolute",
          left: 88,
          right: 88,
          top: 1380,
          textAlign: "center",
          fontSize: 44,
          fontWeight: 600,
          lineHeight: 1.3,
          color: ink.soft,
          opacity: interpolate(frame, [50, 64], [0, 1], { easing: outExpo }),
        }}
      >
        {scoreKicker}
      </div>
    </Layer>
  );
}
