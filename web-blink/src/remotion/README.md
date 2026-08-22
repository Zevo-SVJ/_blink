# The Blink ad

A twenty-one second vertical film, 1080×1920, built with Remotion. It plays on
the landing page and renders to MP4 for TikTok and Reels.

```
npm run video:studio     # the Remotion studio — scrub, edit, watch
npm run video:render     # both languages: masters + web cuts + posters
npm run video:stills     # every moment, as PNGs and contact sheets
npm run video:audio      # regenerate the SFX kit and the music bed
```

## The cut

Twenty-five moments across five acts, averaging under a second each. That
cadence is the retention mechanism, not a style: a vertical ad competes with a
thumb, and the previous version's seven scenes across twenty-three seconds read
as a slideshow.

| Act | What it has to do |
| --- | --- |
| **Hook** (0–3s) | A profile is on screen at frame zero. Three words, three impacts. A reticle locks onto the avatar. The camera drives into it. |
| **Analysis** (3–7s) | The avatar *is* the iris — that is the match cut. The profile travels through the aperture, a scan passes down it, and four signals are thrown out of the eye. |
| **Perceptions** (7–13s) | Four adjectives land huge and demote themselves into a stack. Then two frames of black and the interrupt. |
| **Score** (13–15s) | The number is the composition. The tags return to orbit it as evidence. |
| **CTA** (15–21s) | The product, used: a handle typed, a button pressed, a result. Then the line and the ask. |

`timeline.ts` is the whole edit. Moments are names and durations; positions are
derived, so lengthening one moves everything after it — including its sound.

## Rules the code enforces

- **Nothing fades in.** Words arrive from a direction, past their mark, and
  back; or a mask uncovers them. Opacity only takes the edge off the first two
  frames of an arrival. A film built on opacity is a slideshow.
- **Transitions are objects moving.** A bar crosses the frame and the next shot
  is behind it. The frame whips sideways. A circle grows out of a point. Never
  a cross-dissolve.
- **Type is fitted, not sized.** `fitSize` measures the string against the
  column it has, in caps-aware advance widths, with headroom for the spring's
  overshoot. Every clipping bug in this film's history came from skipping one
  of those three.
- **The eye is the landing page's eye.** `elements/Eye.tsx` imports
  `components/blink/eye-geometry`, so the film and the site cannot drift.

## Sound

Fourteen effects and a music bed, synthesised by `scripts/make-audio.mjs` and
committed as MP3. Generated rather than licensed so the kit is versioned as
code and tunable by changing a number.

Cues are frames, derived from `timeline.ts`, so moving a beat moves its sound.
The bed is written *against the edit* — it drops out under the interrupt and
returns for the score. Mixed for voice over SFX over music, with the voice slot
still empty: adding narration is one more `<Audio>` and a lower `BED_GAIN`.

## A/B testing the hook

Three hooks are written, in both languages. `ACTIVE_HOOK` in `copy.ts` picks
one. Every variant is three impacts on the same frames and nothing downstream
refers to the words, so swapping it replaces the opening without touching the
edit, the sound, or any other moment.

## Rendering in this container

Two things are not default:

- Remotion downloads its own Chrome Headless Shell, and egress blocks that
  host. The render scripts point at Playwright's `chrome-headless-shell`
  instead. Override with `REMOTION_CHROME`.
- The `ffmpeg` on `PATH` is Playwright's, built `--disable-everything`; it
  cannot read a WAV. The full build ships with Remotion's compositor, which is
  what `make-sfx.mjs` uses to encode.

## Reviewing it

**Render stills and look at them.** The unit tests in `src/test/video.test.ts`
cover the arithmetic — no gaps in the edit, cues inside the film, both
languages cut identically, the type fitter charging more for capitals. They
cannot tell you a word is touching the edge of frame or that a tag is sitting
on an arc. Both shipped past a green build here.
