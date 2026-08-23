# The Blink ad

A twenty-five-second vertical film, 1080×1920, built with Remotion. It plays on
the landing page between "How It Works" and the leaderboard, and renders to MP4
for TikTok and Reels.

```
npm run video:studio     # the Remotion studio — scrub, edit, watch
npm run video:render     # both languages: masters + web cuts + posters
npm run video:stills     # every named beat, as PNGs and contact sheets
npm run video:audio      # regenerate the SFX kit and the music bed
```

## The idea

There is no voice-over, so the explanation has to be carried by objects. Every
scene is a real thing on a lit desk, and each one stands for one step of what
Blink does — a profile is a photo print you can pick up, looking at it is a
watchmaker's loupe, reading it is index cards pulled out of it, the gap between
self-image and perception is a mirror that breaks, the conclusion is an ink
stamp, the score is a slide thrown by a projector.

Nothing on screen is a dashboard, a hologram, a neural net or a glowing orb.
The objects are the argument.

## The cut

Eight scenes, 750 frames, thirty a second. Every timing is in `timeline.ts` —
a scene component never contains a timing decision.

| | | |
| --- | --- | --- |
| **Hook** | 0–3s | The print falls into frame and lands. The claim strikes it in three blocks, then the interrupt strikes harder, bigger, over a slab. |
| **Observe** | 3–6s | A loupe slides in and crosses the print. What is under the glass is genuinely magnified — the bio is a smudge at 1× and readable at 2× — and each thing it finds is named on a gummed label under the lens. |
| **Cards** | 6–9s | The print comes apart tile by tile as four index cards are pulled out of it, each one starting at the tile it came from. |
| **Mirror** | 9–12s | A whip pan onto a mirror showing the polished version. It fractures, the shards fall out, and what was behind the glass all along is what other people actually read. |
| **Verdict** | 12–15s | A stamp lifts, hangs, and hits. Deep red, rough ink, one word. |
| **Score** | 15–18s | The camera drives into the red of that word until the ink is the frame — a match cut, not a transition — and a slide projector switches on inside it and counts the score in tenths. |
| **Desk** | 18–22s | The camera pulls all the way out from inside the slide to the whole desk, so the process is understood retrospectively, and the four verbs land on labels. |
| **CTA** | 22–25s | The literal product: a field, a handle typed a character every two frames, a button pressed. Then the line, then the ask. |

## Rules the code enforces

- **Nothing fades in.** `Crash` throws a word at the camera and lets the spring
  settle it. Opacity is used for two frames on a pop-in and nowhere else.
  Transitions are whip pans, match cuts, object wipes and camera moves — each
  one has a reason in the picture.
- **The frame is never static.** `Camera` has a `drift` that is on by default:
  a continuous creep to about 1.05 across every scene, too slow to notice and
  the difference between a video and a slide.
- **Springs are the brief's:** stiffness 300, damping 20. `peakOf()` derives
  how far each preset overshoots, and anything sizing type to a column divides
  by it — the frame does not care that the extra width lasts three frames.
- **Type is fitted, not sized.** `fitSize` measures the string in caps-aware
  advance widths; `fitBlock` gives a multi-line statement one size, because a
  block sized line by line reads as unrelated captions.
- **Type is sized for a phone.** The landing serves this 1080-wide frame into a
  ~330px column, so a 34px label arrives as ten pixels. Labels start at 38.
- **Colours go through `a()`.** Appending hex alpha to an `hsl()` string makes
  `hsl(208 95% 60%)44`, which is not a colour — browsers drop it silently. Nine
  glows rendered as nothing before this existed, and a test now guards it.
- **Beats are declared.** `BEATS` lists every visual event in the film and a
  test asserts no gap exceeds 1.2s, so the rhythm is checkable rather than felt.

## Sound

Twenty-three effects and a music bed, synthesised by `scripts/make-sfx.mjs` and
`scripts/make-music.mjs` and committed as MP3 — versioned as code, tunable by
changing a number. Paper, card, glass, a crack, a stamp, a projector: with no
narration the sound has to carry part of the story, so it is written per beat
rather than laid under the film as a loop.

Cues are frames imported from `timeline.ts`, so moving a beat moves its sound.
The bed is written *against* the cut: it drops out under the crack and returns
for the score.

## Changing it

- **Different words** — `copy.ts`, both languages. The timeline is built from
  durations, so French and English are cut identically and only the setting
  differs.
- **A different beat** — `timeline.ts`. Picture and sound both read it.
- **A different scene order** — reorder `SCENES`. Positions are derived.
- **A different object** — `objects/`. Each one is self-contained SVG and CSS
  with no external assets, and takes its state as props.

## Rendering in this container

Two things are not default:

- Remotion downloads its own Chrome Headless Shell and egress blocks that host,
  so the render scripts point at Playwright's `chrome-headless-shell`. Override
  with `REMOTION_CHROME`.
- The `ffmpeg` on `PATH` is Playwright's, built `--disable-everything`; it
  cannot read a WAV. The full build ships with Remotion's compositor, which is
  what `make-sfx.mjs` uses.

## Reviewing it

**Render stills and look at them.**

```
npm run video:stills && node qa/film-sheets.mjs qa/sheets
```

`src/test/video.test.ts` covers the arithmetic — the scenes tile the timeline,
the beats land on the frames the brief names, no two events are more than 1.2s
apart, cues sit inside the film, the type fitter charges more for capitals.
None of that can tell you that the loupe is magnifying flat colour, that the
mirror never actually reveals what is behind it, that the stamp stops 130px
short of the paper it is supposedly hitting, or that the film opens on an empty
desk for eight frames. All four shipped past a green build here, and all four
were found by looking at a contact sheet.
