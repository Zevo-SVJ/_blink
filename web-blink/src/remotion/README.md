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
| **Hook** | 0–3s | The print falls into frame and lands. The claim strikes it in three blocks eight frames apart, then the interrupt strikes harder, bigger, over a slab. |
| **Observe** | 3–6s | A loupe slides in and crosses the print. What is under the glass is genuinely magnified — the bio is a smudge at 1× and readable at 2× — and each thing it finds is named on a gummed label under the lens. |
| **Cards** | 6–9s | The print comes apart tile by tile as four index cards are pulled out of it, each one starting at the tile it came from. |
| **Mirror** | 9–12s | A whip pan onto a mirror showing the polished version. It fractures, the shards fall out, and what was behind the glass all along is what other people actually read. |
| **Verdict** | 12–15s | A stamp lifts, hangs, and hits. Deep red, rough ink, one word. |
| **Score** | 15–18s | The camera drives into the red of that word until the ink is the frame — a match cut, not a transition — and a slide projector switches on inside it and counts the score in tenths. |
| **Desk** | 18–22s | The camera pulls all the way out from inside the slide to the whole desk, so the process is understood retrospectively, and the four verbs land on labels. |
| **CTA** | 22–25s | The literal product: a field, a handle typed a character every two frames, a button pressed. Then the line, then the ask. |

## Rhythm

Nothing waits for anything else.

A scene mounts `OVERLAP` frames before its own slot and arrives over the one
it is replacing, which is still moving — so its first beats fire *during* the
handover rather than after it, and there is no frame in the film where one
thing has finished and the next has not started. Inside a scene, beats are
spaced closer than the springs take to settle: `crash` is inside nine frames
and the hook's three lines are eight apart.

Two seams are deliberately cuts, because the picture already carries them.
The push into the red of the stamp starts inside the verdict and the score
picks it up at exactly the scale and tilt it left off at, so the match cut
lands mid-move. The pull-back out of the projector's slide is one continuous
camera move for the same reason.

Measured: sixty visual beats, a median gap of 0.43s and nothing longer than
0.6s anywhere in twenty-five seconds. A test asserts the ceiling and the
median, so this is checkable rather than a claim.

## Rules the code enforces

- **Nothing fades in.** `Crash` throws a word at the camera and lets the spring
  settle it. Opacity is used for two frames on a pop-in and nowhere else.
  Transitions are whip pans, match cuts, object wipes and camera moves — each
  one has a reason in the picture.
- **The frame is never static.** Two creeps, one on top of the other: `Camera`
  drifts about 5% within every scene, and `Creep` in `BlinkAd.tsx` pushes the
  whole film 5% across its twenty-five seconds. Neither is visible; together
  they mean there is no still frame anywhere, not even in the quarter-second
  after a beat has landed.
- **Springs are nervy.** `crash` settles inside nine frames — at the original
  300/20 it took twelve, which is long enough that the next beat had to wait
  for it. It still overshoots: `peakOf()` derives how far, and anything sizing
  type to a column divides by it, because the frame does not care that the
  extra width lasts three frames.
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

Five sounds and a music bed.

The palette is deliberately tiny and used densely — 108 cues in twenty-five
seconds, a median of seven frames apart — because that is how the reference it
was designed against works: 8.7 seconds carrying 23 audible events out of a
handful of textures at different pitches and levels. Variety comes from
placement and gain, not from a library of one-shots.

| file | what it is | for |
| --- | --- | --- |
| `deep_sub_bass_pulse.wav` | a swell into a low resonance, 10ms attack | the hook, the crack, the stamp, the ink |
| `ui_soft_pop_bubble.wav` | a water drop — pitch bending *up*, as a real bubble does | every word, label and card that arrives |
| `soft_air_swoosh.wav` | heavy fabric passing: the band opens and closes, and the level swells and falls rather than decaying | every seam, and the dive |
| `asmr_muffled_clicks.wav` | a thock — two low resonances struck softly, nothing above 2 kHz | typing, and the button |
| `glass_slide_friction.wav` | sustained friction with two unrelated rates of movement | the loupe crossing the print |

None of them is a waveform with an envelope drawn over it. The drop and the
thock are struck resonators, because that is what gives a body its pitch and
its ring — and the excitation is spread over a few milliseconds, because a
resonator hit with a single-sample impulse has a perfectly instantaneous front
edge, which is the definition of the click this kit exists to avoid.

The aesthetic was measured off that reference rather than guessed at: 71% of
its energy sits below 250 Hz, its spectral centroid is 1.8 kHz, almost nothing
is above 2 kHz, and its transients rise over about 20 ms — soft-knee, an order
of magnitude slower than a click. So there are no bright transients anywhere in
the kit, no chimes and no sweeps. `node qa/sfx-profile.mjs` reports the same
three figures for whatever is in `public/audio/`, so a replacement can be held
to the profile instead of to an opinion.

Measuring the *finished master* the same way is what keeps catching mistakes.
It caught the mix being hollow rather than dark: the sub matched the reference to within a decibel and
every band above 120 Hz was between seven and forty decibels quieter, which on
a phone speaker — which reproduces almost nothing under 200 Hz — would have
been close to silence. The pops carry an upper voice now, the sub pulses are
trimmed at source, and the bed carries the body. `node qa/mix-bands.mjs` is
that check.

It also caught the opposite, later: giving the sub pulse a long resonant tail
made that one file twelve decibels hotter than everything else in the kit in
average terms — every file is peak-normalised, so a longer ring does not add
depth, it raises the average — and pushed the master three decibels past the
reference's sub while the rest of the mix stayed put. The number to watch is
the gap between the 20–120 Hz band and everything above it. The reference
keeps its body *louder* than its sub; anything much past eight decibels the
other way is a boomy mix.

What remains is a difference in content, not a defect: the reference is a full
music track and this bed is a pad, so it still sits about twelve decibels under
it above 800 Hz. Sourced recordings dropped into `public/audio/` will close
that on their own.

The files shipped are placeholders written by `scripts/make-sfx.mjs`.
**Replacing one is a matter of dropping a file of the same name into
`public/audio/`** — `Track.tsx` resolves them through `staticFile()`, so there
is no import to edit and no code to change.

### Sync

Frame-exact, and enforced rather than intended.

`timeline.ts` exports three lists, and the scenes and the cues all read them:

- `SPRINGS` — every frame something visually *arrives* on. 43 of them.
- `MOVES` — every frame the *camera* starts moving. 22. A different list: a
  whip has nothing arriving on it, and the pull-back is forty frames of travel
  with nothing appearing at all.
- `ANIMATIONS` — every start that is neither. 18. A card flying out of frame,
  glass falling out of a mirror, ink flooding a shot. This is the list that
  found the holes the other two could not see: four of those were either
  silent or a frame or two off from their sound.

A test asserts all 83 carry a cue **on their own frame**, not near it — a
sound placed a frame or two after an arrival is heard as a separate event
rather than as the arrival itself. Another asserts every file the cues name
actually exists in `public/audio/`, because a missing placeholder otherwise
fails at render time and nowhere earlier.

Cues are allowed to ring into each other: a swoosh still decaying under the
drop that follows it is what makes the mix continuous rather than a row of
separate noises. The bed is written *against* the cut — it drops out under the
crack and returns for the score.

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
short of the paper it is supposedly hitting, that the film opens on an empty
desk for eight frames, or that the push-through seam renders four frames of
flat colour because every scene paints an opaque background. All five shipped
past a green build here, and all five were found by looking at a contact
sheet.
