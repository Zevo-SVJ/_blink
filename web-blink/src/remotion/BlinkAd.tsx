/**
 * The film.
 *
 * Acts are mounted as `<Sequence>`s so each one receives a frame counted from
 * its own start — which is what lets a moment be lengthened in `timeline.ts`
 * without a single number inside a scene changing. The act components then
 * position their own moments off `at()`, so the edit stays in one file.
 *
 * The transitions that carry one act into the next live here rather than
 * inside either act, because a transition belongs to the seam: the wipe that
 * takes the analysis into the perceptions is not part of either.
 */

import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";

import { Track } from "./audio/Track";
import { COPY, type Lang } from "./copy";
import { Analysis } from "./scenes/Analysis";
import { Cta } from "./scenes/Cta";
import { Hook } from "./scenes/Hook";
import { Perceptions } from "./scenes/Perceptions";
import { Score } from "./scenes/Score";
import { Flash, ObjectWipe } from "./motion/transitions";
import { C } from "./theme";
import { at, DURATION, end } from "./timeline";

/**
 * Remotion types a composition's props as `Record<string, unknown>`, so the
 * schema is declared as an index-signature-compatible type rather than a plain
 * interface. The component still reads them as the narrow types it wants.
 */
export type AdProps = {
  lang: Lang;
  /** Rendering silent is useful for stills and for a muted web build. */
  silent?: boolean;
};

export function BlinkAd({ lang, silent = false }: AdProps) {
  const frame = useCurrentFrame();
  const copy = COPY[lang];

  const A_ANALYSIS = at("eyeOpen");
  const A_TAGS = at("tag1");
  const A_SCORE = at("scoreRise");
  const A_CTA = at("appOpen");

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Act 1. Runs to the match cut. */}
      <Sequence durationInFrames={A_ANALYSIS} name="Hook">
        <Hook copy={copy} />
      </Sequence>

      {/* Act 2. Mounted from the cut so its camera can continue the hook's
          push as a pull-back — one move across two shots. */}
      <Sequence from={A_ANALYSIS} durationInFrames={A_TAGS - A_ANALYSIS} name="Analysis">
        <Shifted by={A_ANALYSIS}>
          <Analysis copy={copy} />
        </Shifted>
      </Sequence>

      <Sequence from={A_TAGS} durationInFrames={A_SCORE - A_TAGS} name="Perceptions">
        <Shifted by={A_TAGS}>
          <Perceptions copy={copy} />
        </Shifted>
      </Sequence>

      <Sequence from={A_SCORE} durationInFrames={A_CTA - A_SCORE} name="Score">
        <Shifted by={A_SCORE}>
          <Score copy={copy} />
        </Shifted>
      </Sequence>

      <Sequence from={A_CTA} durationInFrames={DURATION - A_CTA} name="CTA">
        <Shifted by={A_CTA}>
          <Cta copy={copy} />
        </Shifted>
      </Sequence>

      {/* Seam transitions. A bar physically crosses the frame and the next act
          is behind it, so the two shots never coexist — which is the whole
          difference between a wipe and a dissolve. */}
      <ObjectWipe start={at("wipeToTags")} duration={16} color={C.sky} direction="right" />
      <ObjectWipe start={at("scoreRise") - 6} duration={14} color={C.navy2} direction="up" />
      <ObjectWipe start={at("appOpen") - 5} duration={13} color={C.sky} direction="left" />

      {/* Punctuation, on three frames only. */}
      <Flash at={at("eyeOpen")} color={C.sky} peak={0.75} duration={5} />
      <Flash at={at("redFlagHit") + 2} color={C.flag} peak={0.4} duration={4} />
      <Flash at={at("scoreLand") + 1} color={C.white} peak={0.3} duration={3} />

      {!silent && <Track />}
    </AbsoluteFill>
  );
}

/**
 * Undo a `Sequence`'s frame offset.
 *
 * The acts address absolute frames — `at("tag3")` is a number on the film's
 * own timeline — but a `Sequence` restarts the clock at zero for whatever is
 * inside it. Nesting a negative-offset `Sequence` hands the absolute frame
 * back, so the acts can keep reading the edit directly and a moment moved in
 * `timeline.ts` moves everything that refers to it.
 */
function Shifted({ by, children }: { by: number; children: React.ReactNode }) {
  return (
    <Sequence from={-by} durationInFrames={DURATION + by} layout="none">
      {children}
    </Sequence>
  );
}
