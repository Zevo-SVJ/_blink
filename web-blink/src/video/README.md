# The Blink film

A twenty-three second explainer, authored at 1080×1920, playing on the landing
page and renderable to a file for TikTok and Reels.

## The one rule

**Every value is a pure function of one integer.** No timers, no CSS
transitions, no `Date.now()`. Frame 315 renders the same picture whether it was
reached by playing, by dragging the scrubber, or by an offline renderer asking
for frames out of order.

That is not aesthetic tidiness. It buys three specific things:

- **Addressability.** `qa/film.mjs` photographs exact beats. An ad is judged on
  moments that last a fifth of a second, and watching it back at speed is how
  those go unexamined.
- **No drift.** Picture and sound address the same timeline rather than two
  clocks that agree at the start.
- **A file, later.** Handing `FilmFrame` to an offline renderer produces
  frame-for-frame what ships here. Nothing has to be rebuilt to export.

## Where things are

| File | What it decides |
| --- | --- |
| `frame.ts` | Motion primitives — `spring`, `interpolate`, easings. Closed-form, no state. |
| `copy.ts` | Every word in the picture, in English and French. Hook variants live here. |
| `copy-context.tsx` | Which language a scene is speaking. |
| `timeline.ts` | The edit: scene order and length, and the sound cues. No copy. |
| `Stage.tsx` | The 1080×1920 surface and the palette. Scales as one block. |
| `Atmosphere.tsx` | The air under every scene, at a per-scene intensity. |
| `Film.tsx` | Renders the scenes that are live at a frame. |
| `scenes/*.tsx` | One file per scene. Each takes a *local* frame. |
| `sfx.ts` | Synthesised sound, fired from `CUES`. Zero assets, zero dependencies. |
| `FilmPlayer.tsx` | Playing it on a page: observers, looping, sound, reduced motion. |

## Changing it

- **A different opening** — add a hook to `copy.ts` in both languages and point
  `ACTIVE_HOOK_ID` at it. Nothing downstream moves; every hook is cut to the
  same length. This is the A/B surface.
- **A different word** — `copy.ts`. Scenes size type to fit, so a longer word
  gets smaller rather than clipping.
- **A different beat** — `timeline.ts`. A cue is a frame and a kind, so moving
  a beat moves its sound with it.
- **A different scene** — one file in `scenes/`. It receives a local frame and
  knows nothing about where it sits, so it can be reordered or dropped.

## Checking it

```
node qa/film.mjs                # every beat, English, as strips per scene
LANG_=fr node qa/film.mjs       # the French cut — different words, so a
                                # different composition
node qa/film-landing.mjs        # in the page: layout shift, sizing, autoplay,
                                # pausing off screen, the loop boundary
npx vitest run src/test/film.test.ts
```

`/dev` mounts the scrubber: `?frame=315`, `?lang=fr`.

**Screenshots are the check.** The unit tests cover the arithmetic — that the
cuts have no gaps, that both languages are cut to the same frames, that the
springs overshoot when they should. They cannot tell you a word is touching
the edge of frame or that an eye is sitting on a headline. Both of those
shipped past a green build.

## Sound

Muted until the viewer asks, because a page that makes noise unprompted is a
page people leave — and browsers block it anyway. Synthesised rather than
sampled: eight cue kinds from a few oscillators, so the whole sound design is
zero bytes of assets and can fire on the frame it is asked for instead of
waiting on a fetch.

## What is deliberately absent

- **Remotion.** Not installed. The film was written to its contract — pure
  functions of a frame — so it can be adopted later without a rewrite, but
  adding it now would be a large dependency for an export nobody has asked for
  yet.
- **An MP4.** Rendered live it is vector at every density, ~8 KB gzipped, and
  the copy stays editable rather than baked into pixels.
