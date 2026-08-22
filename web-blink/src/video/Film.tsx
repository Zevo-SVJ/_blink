/**
 * Blink — the film.
 *
 * Renders whatever is on screen at an absolute frame. Scenes receive a *local*
 * frame and know nothing about where they sit in the edit, which is what lets
 * the timeline reorder, lengthen or replace them without any of them changing.
 *
 * Only the scenes that are actually visible are mounted. With hard cuts there
 * is normally exactly one, so a twenty-three second film costs about as much
 * to render as its busiest three seconds.
 */

import type { ReactElement } from "react";

import type { Lang } from "@/lib/i18n";

import { Analysis } from "@/video/scenes/Analysis";
import { Hook } from "@/video/scenes/Hook";
import { Outro } from "@/video/scenes/Outro";
import { Perceptions } from "@/video/scenes/Perceptions";
import { Profile } from "@/video/scenes/Profile";
import { Score } from "@/video/scenes/Score";
import { Turn } from "@/video/scenes/Turn";
import { Atmosphere } from "@/video/Atmosphere";
import { FILM_COPY } from "@/video/copy";
import { FilmCopyProvider } from "@/video/copy-context";
import { Layer, Stage, ink } from "@/video/Stage";
import { DURATION, SHOTS, type SceneId } from "@/video/timeline";

const SCENES: Record<SceneId, (p: { frame: number }) => ReactElement> = {
  hook: Hook,
  profile: Profile,
  analysis: Analysis,
  perceptions: Perceptions,
  turn: Turn,
  score: Score,
  outro: Outro,
};

/** The picture at one frame, without the frame itself. */
/**
 * How present the air is under each scene.
 *
 * The turn is nearly bare on purpose: after four fast reveals, taking the
 * atmosphere away is what makes the silence land. Filling every scene equally
 * is how a film ends up with no dynamics at all.
 */
const AIR: Record<SceneId, number> = {
  hook: 0.55,
  profile: 0.4,
  analysis: 0.9,
  perceptions: 1,
  turn: 0.22,
  score: 0.7,
  outro: 1.15,
};

export function FilmFrame({ frame }: { frame: number }) {
  const live = SHOTS.filter((s) => frame >= s.from && frame < s.from + s.duration);
  const air = live.length ? AIR[live[live.length - 1].id] : 0.5;

  return (
    <>
      {/* A floor under every scene, so a cut can never show through to the
          page behind it. */}
      <Layer style={{ background: ink.bg }} />
      <Atmosphere frame={frame} duration={DURATION} intensity={air} />
      {live.map((shot) => {
        const Scene = SCENES[shot.id];
        return <Scene key={shot.id} frame={frame - shot.from} />;
      })}
    </>
  );
}

/**
 * The film, framed and in a language.
 *
 * `lang` defaults to English so the film renders on its own — in the dev
 * scrubber, or handed to an offline renderer with no app around it.
 */
export function Film({ frame, lang = "en" }: { frame: number; lang?: Lang }) {
  return (
    <FilmCopyProvider copy={FILM_COPY[lang]}>
      <Stage>
        <FilmFrame frame={frame} />
      </Stage>
    </FilmCopyProvider>
  );
}
