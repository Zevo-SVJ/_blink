/**
 * The film.
 *
 * Eight `Sequence`s, twenty-five seconds. Each scene is mounted only while it
 * is on screen, so nothing lingers invisible on the timeline and a scene can
 * never bleed into the one after it by accident.
 *
 * Scenes address absolute frames, because the beats they animate are named in
 * `timeline.ts` in absolute terms. A `Sequence` restarts the clock at zero for
 * its children, so each one is wrapped in a negative-offset `Sequence` that
 * hands the absolute frame back — otherwise every scene would be doing
 * arithmetic against its own start, and a beat would land on the wrong frame
 * the moment someone lengthened the scene before it.
 *
 * Transitions between scenes live here, because a transition belongs to the
 * seam rather than to either side of it.
 */

import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";

import { Track } from "./audio/Track";
import { COPY, type Lang } from "./copy";
import { Cards } from "./scenes/Cards";
import { Cta } from "./scenes/Cta";
import { DeskScene } from "./scenes/DeskScene";
import { Hook } from "./scenes/Hook";
import { MirrorScene } from "./scenes/MirrorScene";
import { Observe } from "./scenes/Observe";
import { ScoreScene } from "./scenes/ScoreScene";
import { Verdict } from "./scenes/Verdict";
import { a, C, WIDTH } from "./theme";
import { DURATION, SCENES, WHIP, at } from "./timeline";

export type AdProps = {
  lang: Lang;
  /** Rendering silent is useful for stills and for a muted web build. */
  silent?: boolean;
};

const COMPONENTS = {
  hook: Hook,
  observe: Observe,
  cards: Cards,
  mirror: MirrorScene,
  verdict: Verdict,
  score: ScoreScene,
  desk: DeskScene,
  cta: Cta,
} as const;

export function BlinkAd({ lang, silent = false }: AdProps) {
  const copy = COPY[lang];

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <WhipPan>
        {SCENES.map((scene) => {
          const Scene = COMPONENTS[scene.id];
          return (
            <Sequence
              key={scene.id}
              from={scene.from}
              durationInFrames={scene.duration}
              name={scene.id}
            >
              <Absolute by={scene.from}>
                <Scene copy={copy} />
              </Absolute>
            </Sequence>
          );
        })}
      </WhipPan>

      {/* Two frames of white on the stamp, and on the crack. Punctuation, not
          decoration — the film has exactly two of them. */}
      <Strike at={at("mirror") + 50} color={C.white} peak={0.34} />
      <Strike at={at("verdict") + 22} color={C.ink} peak={0.3} />

      {!silent && <Track />}
    </AbsoluteFill>
  );
}

/**
 * The whip pan into the mirror.
 *
 * The whole frame is thrown sideways and the next scene arrives from the far
 * side. Motion blur along the direction of travel is what sells it: a whip
 * without it is a fast slide, and a fast slide is a transition nobody
 * believes.
 */
function WhipPan({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [WHIP, WHIP + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (t <= 0 || t >= 1) return <>{children}</>;

  /* Never a whole frame width. Thrown the full 1080 the pan passes through a
     frame with nothing on it at all — a black hole in the middle of the
     transition — because the outgoing scene has left and the incoming one has
     not arrived. Capped at 0.78 there is always something smearing past. */
  const travel = (t < 0.5 ? Math.pow(t * 2, 3) : Math.pow((1 - t) * 2, 3)) * 0.78;
  const dir = t < 0.5 ? -1 : 1;
  const blur = Math.sin(t * Math.PI) * 36;

  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${dir * travel * WIDTH}px)`,
        filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/** A single flash on an impact. One frame at full, gone over three. */
function Strike({
  at: on,
  color,
  peak = 0.3,
}: {
  at: number;
  color: string;
  peak?: number;
}) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [on, on + 1, on + 4], [0, peak, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (o <= 0.001) return null;
  return <AbsoluteFill style={{ background: color, opacity: o, zIndex: 70 }} />;
}

/**
 * Undo a `Sequence`'s frame offset.
 *
 * Scenes read absolute frames off the edit, so `TAG_BEATS = [120, 130, 140]`
 * means those frames of the film and not those frames of whichever scene
 * happens to contain them.
 */
function Absolute({ by, children }: { by: number; children: ReactNode }) {
  return (
    <Sequence from={-by} durationInFrames={DURATION + by} layout="none">
      {children}
    </Sequence>
  );
}
