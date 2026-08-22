/**
 * Scene 4 — the reads.
 *
 * The payoff, and the part that has to be unmistakable at a glance: one lens,
 * one word, nothing else on screen. Four of them, each landing on a spring
 * with overshoot and leaving on a whip.
 *
 * The words are the product's own — the same tags the result screen returns,
 * taken from the copy rather than written for the ad. A punchier invented
 * adjective here would be a promise Blink does not keep.
 *
 * One at a time is a deliberate constraint. Four words on screen together is a
 * word cloud, which is read as decoration and remembered as nothing.
 */

import { CX, irisCentre, irisRadius, lids, PUPIL_RATIO } from "@/components/blink/eye-geometry";
import { interpolate, inExpo, outExpo, spring } from "@/video/frame";
import { ink, Layer } from "@/video/Stage";
import { useFilmCopy } from "@/video/copy-context";

/**
 * The word is set to fit, not to a fixed size.
 *
 * At a flat 178px "Mysterious" ran off the right edge while "Secure" sat in
 * half the frame. A headline that clips is not a style choice, and shrinking
 * everything to the longest word wastes the short ones — so the size is
 * derived from the word, which is the only thing that actually varies.
 */
/*
 * The constant is measured, not guessed: at 800 weight and -0.055em, Inter
 * averages ~0.58em per character, and the column is 904px wide, so the widest
 * safe size is ~1560/length. 1500 leaves the margin visible — at 1660
 * "Mysterious" still reached both edges with no air on either side.
 */
export const wordSize = (word: string) => Math.min(184, Math.round(1500 / word.length));

/** Frames each read owns, end to end. */
export const READ_STRIDE = 39;

export function Perceptions({ frame }: { frame: number }) {
  const { perceptions: READS } = useFilmCopy();

  /* The eye, holding open behind the reads. These are what it saw, so it is
     still on screen while they arrive — the scene is a consequence of the one
     before it rather than a separate slide. */
  const ghost = interpolate(frame, [0, 18], [0, 1], { easing: outExpo });

  return (
    <Layer>
      <svg
        viewBox="0 0 1400 1200"
        style={{
          position: "absolute",
          left: -740,
          top: 120,
          width: 2560,
          opacity: 0.26 * ghost,
        }}
        fill="none"
      >
        <path d={lids(1)} fill="hsl(var(--blink-sky) / 0.05)" />
        <path d={lids(1)} fill="none" stroke={ink.bright} strokeOpacity={0.3} strokeWidth={26} strokeLinecap="round" />
        <path d={lids(1)} fill="none" stroke={ink.sky} strokeOpacity={0.5} strokeWidth={6} strokeLinecap="round" />
        <circle cx={CX} cy={irisCentre(1)} r={irisRadius(1)} fill="hsl(var(--blink-sky) / 0.12)" />
        <circle cx={CX} cy={irisCentre(1)} r={irisRadius(1)} fill="none" stroke={ink.sky} strokeOpacity={0.45} strokeWidth={5} />
        <circle cx={CX} cy={irisCentre(1)} r={irisRadius(1) * PUPIL_RATIO} fill={ink.bg} fillOpacity={0.8} />
      </svg>

      {READS.map((read, i) => {
        const local = frame - i * READ_STRIDE;
        if (local < -6 || local > READ_STRIDE + 8) return null;

        /* In on a spring that overshoots — the word arrives past its mark and
           settles, which is what makes it land rather than appear. */
        const enter = spring({ frame: local, config: { stiffness: 200, damping: 13 } });
        /* Out on a whip: fast, sideways, gone. The exit is the transition. */
        const exit = interpolate(local, [30, 39], [0, 1], { easing: inExpo });

        const x = (1 - enter) * 70 - exit * 260;
        const blur = exit * 14;

        return (
          <div
            key={read.word}
            style={{
              position: "absolute",
              left: 88,
              right: 88,
              top: 620,
              opacity: Math.min(enter * 1.5, 1) * (1 - exit),
              transform: `translateX(${x}px)`,
              filter: blur > 0.4 ? `blur(${blur}px)` : undefined,
            }}
          >
            <div
              style={{
                fontSize: 38,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: ink.sky,
                opacity: interpolate(local, [0, 8], [0, 0.9], { easing: outExpo }),
              }}
            >
              {read.lens}
            </div>
            <div
              style={{
                marginTop: 22,
                fontSize: wordSize(read.word),
                lineHeight: 0.94,
                whiteSpace: "nowrap",
                fontWeight: 800,
                letterSpacing: "-0.055em",
                color: ink.white,
                transform: `scale(${0.86 + enter * 0.14})`,
                transformOrigin: "left center",
              }}
            >
              {read.word}
            </div>
          </div>
        );
      })}

      {/* A quiet counter. Tells the viewer this is a list and how far in they
          are, which is what stops the fourth word feeling like a loop. */}
      <div
        style={{
          position: "absolute",
          left: 88,
          top: 1640,
          display: "flex",
          gap: 12,
        }}
      >
        {READS.map((r, i) => {
          const on = frame >= i * READ_STRIDE;
          return (
            <span
              key={r.word}
              style={{
                width: on ? 54 : 22,
                height: 6,
                borderRadius: 99,
                background: on ? ink.sky : "hsl(210 40% 96% / 0.16)",
                transition: "none",
              }}
            />
          );
        })}
      </div>
    </Layer>
  );
}
