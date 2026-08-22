/**
 * The film.
 *
 * Six `Sequence`s, twelve seconds, hard cuts. Each scene is mounted only while
 * it is on screen — nothing lingers on the timeline invisible, so a frame
 * costs what it looks like it costs and a scene can never bleed into the one
 * after it by accident.
 *
 * Scenes address absolute frames, because the beats they animate are specified
 * in `timeline.ts` in absolute terms. A `Sequence` restarts the clock at zero
 * for its children, so each one is wrapped in a negative-offset `Sequence`
 * that hands the absolute frame back. The alternative — every scene doing
 * arithmetic against its own start — is how a beat ends up on the wrong frame
 * after someone lengthens the scene before it.
 *
 * Transitions live here rather than in either scene, because a transition
 * belongs to the seam.
 */

import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";

import { Track } from "./audio/Track";
import { COPY, type Lang } from "./copy";
import { Glitch } from "./motion/Glitch";
import { Cta } from "./scenes/Cta";
import { Flag } from "./scenes/Flag";
import { Hook } from "./scenes/Hook";
import { Illusion } from "./scenes/Illusion";
import { Scan } from "./scenes/Scan";
import { Score } from "./scenes/Score";
import { C, WIDTH } from "./theme";
import { at, DURATION, GLITCH, len, SCENES, WHIP } from "./timeline";

export type AdProps = {
  lang: Lang;
  /** Rendering silent is useful for stills and for a muted web build. */
  silent?: boolean;
};

const COMPONENTS = {
  hook: Hook,
  illusion: Illusion,
  scan: Scan,
  flag: Flag,
  score: Score,
  cta: Cta,
} as const;

export function BlinkAd({ lang, silent = false }: AdProps) {
  const copy = COPY[lang];

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* The one glitch in the film wraps the picture, so the tear happens to
          everything at once rather than to a layer inside one scene. */}
      <Glitch at={GLITCH} duration={8} amount={30}>
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
      </Glitch>

      {!silent && <Track />}
    </AbsoluteFill>
  );
}

/**
 * The whip pan out of the hook.
 *
 * The entire frame is thrown sideways and the next scene arrives from the far
 * side. Motion blur along the direction of travel is what sells it — a whip
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

  // Out and back: the outgoing shot leaves left, the incoming arrives from
  // the right, and the swap happens at the midpoint where blur is highest.
  const travel = t < 0.5 ? Math.pow(t * 2, 3) : Math.pow((1 - t) * 2, 3);
  const dir = t < 0.5 ? -1 : 1;
  const blur = Math.sin(t * Math.PI) * 34;

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

/**
 * Undo a `Sequence`'s frame offset.
 *
 * Scenes read absolute frames off the edit. Nesting a negative offset hands
 * that back, so `TAG_BEATS = [120, 130, 140]` means those frames of the film
 * and not those frames of whichever scene happens to contain them.
 */
function Absolute({ by, children }: { by: number; children: ReactNode }) {
  return (
    <Sequence from={-by} durationInFrames={DURATION + by} layout="none">
      {children}
    </Sequence>
  );
}
