# The Blink ad

A twelve-second vertical film, 1080×1920, built with Remotion. It plays on the
landing page and renders to MP4 for TikTok and Reels.

```
npm run video:studio     # the Remotion studio — scrub, edit, watch
npm run video:render     # both languages: masters + web cuts + posters
npm run video:stills     # every named beat, as PNGs and contact sheets
npm run video:audio      # regenerate the SFX kit and the music bed
```

## The cut

Six scenes, twelve seconds, thirty frames a second. Every timing is in
`timeline.ts` — a scene component never contains a timing decision.

| | | |
| --- | --- | --- |
| **Hook** | 0.0–2.0s | Four blocks of type crash in on frames 0, 15, 30, 45. Nothing else on screen. |
| **Illusion** | 2.0–3.5s | Whip pan onto the profile as its owner sees it. It springs up from below the frame. |
| **Scan** | 3.5–6.0s | The eye slams over it, a laser passes down the grid, and where it passes the photos are gone and personality tags are there instead. |
| **Flag** | 6.0–8.0s | A chromatic-aberration tear, the background goes warm, and the read nobody asks for lands. |
| **Score** | 8.0–10.0s | The gauge fills in fifteen frames. Not slowly — a meter that fills slowly is a loading indicator. |
| **CTA** | 10.0–12.0s | The product used: a handle typed, a button pressed. Then the line. |

## Rules the code enforces

- **Nothing fades in.** `Crash` throws a word at the camera from 3× and lets
  the spring settle it. Opacity is used for two frames on a pop-in and nowhere
  else.
- **The frame is never static.** `Camera` has a `drift` that is on by default:
  a continuous creep to about 1.05 across every scene, too slow to notice and
  the difference between a video and a slide.
- **Springs are the brief's:** stiffness 300, damping 20. `peakOf()` derives
  how far each preset overshoots, and anything sizing type to a column divides
  by it — the frame does not care that the extra width lasts three frames.
- **Type is fitted, not sized.** `fitSize` measures the string in caps-aware
  advance widths. Every clipping bug this film has had came from skipping that.
- **Colours go through `a()`.** Appending hex alpha to an `hsl()` string makes
  `hsl(208 95% 60%)44`, which is not a colour — browsers drop it silently. Nine
  glows rendered as nothing before this existed, and a test now guards it.
- **The glitch fires once.** A film that glitches on every cut has no cuts.

## Sound

Sixteen effects and a music bed, synthesised by `scripts/make-audio.mjs` and
committed as MP3 — versioned as code, tunable by changing a number.

Cues are frames imported from `timeline.ts`, so moving a beat moves its sound.
The bed is written *against* the cut: it drops out under the interrupt and
returns for the score. Mixed for voice over SFX over music, with the voice slot
still empty — narration is one more `<Audio>` and a lower `BED_GAIN`.

## Changing it

- **A different hook** — `copy.hook` is four blocks and `HOOK_BEATS` is four
  frames. Change the words; nothing downstream refers to them.
- **A different beat** — `timeline.ts`. Picture and sound both read it.
- **A different scene order** — reorder `SCENES`. Positions are derived.

## Rendering in this container

Two things are not default:

- Remotion downloads its own Chrome Headless Shell and egress blocks that host,
  so the render scripts point at Playwright's `chrome-headless-shell`. Override
  with `REMOTION_CHROME`.
- The `ffmpeg` on `PATH` is Playwright's, built `--disable-everything`; it
  cannot read a WAV. The full build ships with Remotion's compositor, which is
  what `make-sfx.mjs` uses.

## Reviewing it

**Render stills and look at them.** `src/test/video.test.ts` covers the
arithmetic — the scenes tile the timeline, the beats land on the frames the
brief names, the gauge fills in fifteen, cues sit inside the film, the type
fitter charges more for capitals. None of that can tell you a word is touching
the edge of frame, that a label is sitting inside the logo, or that every glow
in the film is silently missing. All three shipped past a green build here.
