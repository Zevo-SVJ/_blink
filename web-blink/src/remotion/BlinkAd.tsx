/**
 * The film.
 *
 * Eight scenes, twenty-five seconds. Each one is mounted only while it is on
 * screen, so nothing lingers invisible on the timeline and a scene can never
 * bleed into the one after it by accident.
 *
 * Scenes address absolute frames, because the beats they animate are named in
 * `timeline.ts` in absolute terms. A `Sequence` restarts the clock at zero for
 * its children, so each one is wrapped in a negative-offset `Sequence` that
 * hands the absolute frame back — otherwise every scene would be doing
 * arithmetic against its own start, and a beat would land on the wrong frame
 * the moment someone lengthened the scene before it.
 *
 * ## Seams
 *
 * Scenes overlap. A scene mounts `OVERLAP` frames before its own slot and
 * arrives *over* the one it is replacing, which is still moving — so there is
 * no frame anywhere in the film where one thing has finished and the next has
 * not started, and a scene's first beats fire during the handover rather than
 * after it. `timeline.ts` says which way each seam throws.
 *
 * Two seams are deliberately cuts, because the picture already carries them:
 * the camera drives into the red of the stamp until the ink is the frame, and
 * it pulls back out of the projector's slide in one continuous move. A whip
 * over either would be a transition fighting a camera move.
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
import { C, HEIGHT, WIDTH } from "./theme";
import {
  DURATION,
  OVERLAP,
  SCENES,
  SEAM,
  type SceneId,
  type Seam,
  at,
  end,
  mounts,
} from "./timeline";

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
      <Creep>
        {SCENES.map((scene, i) => {
          const Scene = COMPONENTS[scene.id];
          const from = mounts(scene.id);
          const next = SCENES[i + 1];
          return (
            <Sequence
              key={scene.id}
              from={from}
              durationInFrames={end(scene.id) - from}
              name={scene.id}
            >
              <Absolute by={from}>
                <Shot
                  id={scene.id}
                  /* A scene's exit is the next scene's entrance: one seam,
                     moving both of them the same way at the same time. */
                  exit={next ? SEAM[next.id] : "cut"}
                  exitAt={end(scene.id)}
                >
                  <Scene copy={copy} />
                </Shot>
              </Absolute>
            </Sequence>
          );
        })}
      </Creep>

      {/* Two frames of white on the crack, and of ink on the stamp.
          Punctuation, not decoration — the film has exactly two. */}
      <Strike at={at("mirror") + 30} color={C.white} peak={0.34} />
      <Strike at={at("verdict") + 12} color={C.ink} peak={0.3} />

      {!silent && <Track />}
    </AbsoluteFill>
  );
}

/**
 * A continuous, barely perceptible push across the whole film.
 *
 * Five percent over twenty-five seconds — around two thousandths of a percent
 * per frame. Nobody sees it happening and everybody sees the difference: with
 * it there is no moment in the film where the image is truly still, not even
 * in the quarter-second after a scene has landed. Per-scene camera drift sits
 * on top of this.
 */
function Creep({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${1 + (frame / DURATION) * 0.05})`,
        transformOrigin: "50% 50%",
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/** How far into a seam we are, 0 → 1, across the frames leading up to it. */
function seamAt(frame: number, mark: number): number {
  return interpolate(frame, [mark - OVERLAP, mark], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/**
 * One scene, arriving over the last one and leaving under the next.
 *
 * The incoming half decelerates into place while the outgoing half
 * accelerates away, so the pair reads as a snap rather than as two slides
 * crossing. Both travel the same direction at the same time, and at the
 * midpoint both are on screen — which is why none of these transitions passes
 * through an empty frame.
 */
function Shot({
  id,
  exit,
  exitAt,
  children,
}: {
  id: SceneId;
  exit: Seam;
  exitAt: number;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();

  const enter = SEAM[id];
  const inT = enter === "cut" ? 1 : seamAt(frame, at(id));
  const outT = exit === "cut" ? 0 : seamAt(frame, exitAt);

  const arriving = 1 - Math.pow(1 - inT, 3);
  const leaving = Math.pow(outT, 3);

  let x = 0;
  let y = 0;
  let scale = 1;
  let opacity = 1;

  if (inT < 1) {
    if (enter === "left") x = (1 - arriving) * WIDTH;
    if (enter === "right") x = -(1 - arriving) * WIDTH;
    if (enter === "up") y = (1 - arriving) * HEIGHT;
    if (enter === "in") {
      scale = 1 + (1 - arriving) * 0.55;
      /*
        A push has to be see-through, unlike a whip.

        A scene sliding in from the side leaves the old one visible beside it,
        so the frame is never empty. A scene pushing through the middle covers
        it completely — and every scene here paints an opaque background — so
        without this the seam played as four frames of flat colour with the
        outgoing scene already gone and the incoming one not yet drawn.
      */
      opacity = arriving;
    }
  }
  if (outT > 0) {
    if (exit === "left") x -= leaving * WIDTH;
    if (exit === "right") x += leaving * WIDTH;
    if (exit === "up") y -= leaving * HEIGHT;
    // The scene being pushed through recedes rather than sliding out.
    if (exit === "in") scale *= 1 - leaving * 0.16;
  }

  /* Blur only while something is actually travelling. A whip without it is a
     fast slide, and a fast slide is a transition nobody believes. */
  const speed = Math.max(
    inT > 0 && inT < 1 ? Math.sin(inT * Math.PI) : 0,
    outT > 0 && outT < 1 ? Math.sin(outT * Math.PI) : 0,
  );
  const blur = speed * 26;

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        opacity,
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
 * Scenes read absolute frames off the edit, so `CARD_BEATS = [180, 196, …]`
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
