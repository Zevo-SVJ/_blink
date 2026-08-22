/**
 * Scene 5 — the turn.
 *
 * A pattern interrupt, and the reason this is a story rather than a feature
 * list. Four flattering reads have just gone past at speed; the film stops,
 * goes quiet, and delivers the one nobody asks for.
 *
 * The restraint is the effect. After that cadence, stillness is louder than
 * another impact — and the red flag is the thing a viewer actually wants to
 * know, which is what turns interest into a tap.
 *
 * Also real product copy: "Your biggest red flag" is a read Blink returns.
 */

import { interpolate, inExpo, outExpo, spring } from "@/video/frame";
import { ink, Layer } from "@/video/Stage";
import { wordSize } from "@/video/scenes/Perceptions";
import { useFilmCopy } from "@/video/copy-context";

export function Turn({ frame }: { frame: number }) {
  const { turn: TURN_READ, turnSetup } = useFilmCopy();
  const line = interpolate(frame, [4, 20], [0, 1], { easing: outExpo });
  const lineOut = interpolate(frame, [30, 40], [0, 1], { easing: inExpo });
  const land = spring({ frame: frame - 44, config: { stiffness: 210, damping: 15 } });

  return (
    <Layer style={{ background: ink.bg }}>
      {/* The setup, alone on screen. */}
      <div
        style={{
          position: "absolute",
          left: 88,
          right: 88,
          top: 820,
          fontSize: 68,
          lineHeight: 1.14,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: ink.soft,
          opacity: line * (1 - lineOut),
          transform: `translateY(${(1 - line) * 24 - lineOut * 18}px)`,
        }}
      >
        {turnSetup}
      </div>

      {/* The payoff. Warm rather than red — an alarm colour would make this a
          warning, and it is an observation. */}
      <div
        style={{
          position: "absolute",
          left: 88,
          right: 88,
          top: 760,
          opacity: Math.min(land * 1.6, 1),
          transform: `translateY(${(1 - land) * 40}px)`,
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "hsl(38 92% 72%)",
            opacity: 0.9,
          }}
        >
          {TURN_READ.lens}
        </div>
        <div
          style={{
            marginTop: 22,
            fontSize: wordSize(TURN_READ.word),
            lineHeight: 0.94,
            whiteSpace: "nowrap",
            fontWeight: 800,
            letterSpacing: "-0.055em",
            color: ink.white,
            transform: `scale(${0.88 + land * 0.12})`,
            transformOrigin: "left center",
          }}
        >
          {TURN_READ.word}
        </div>
      </div>
    </Layer>
  );
}
