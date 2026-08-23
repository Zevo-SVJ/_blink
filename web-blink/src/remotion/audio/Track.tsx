/**
 * The film's audio, as Remotion sequences.
 *
 * Each cue is an `<Audio>` inside a `<Sequence>` starting on its frame, which
 * is how Remotion muxes sound into the render: the cue list is not played back
 * by anything, it is *scheduled*, and the encoder resolves it sample-accurately
 * rather than as fast as a browser happened to fire it.
 *
 * ## Why `staticFile` and not an import
 *
 * The five sounds are placeholders, written by `scripts/make-sfx.mjs` into
 * `public/audio/`. Resolving them through `staticFile()` means replacing one
 * with a sourced recording is a matter of dropping a file of the same name
 * into that folder — no import to edit, no bundler involved, nothing in this
 * file to touch.
 *
 * The bed is different: it is bundled, because it is the one piece of audio
 * that is not meant to be swapped.
 *
 * Cues are long enough to ring into each other on purpose. A swoosh still
 * decaying under the pop that follows it is what makes the mix continuous
 * rather than a row of separate noises.
 */

import { Audio, Sequence, staticFile } from "remotion";

import { BED, CUES } from "./cues";

import bed from "./bed.mp3";

/**
 * The bed's level. Everything else is mixed against this.
 *
 * Raised from 0.3 after measuring the finished master against the reference:
 * the sub matched it to within a decibel and every band above 120 Hz was
 * between seven and forty decibels quieter. The effects are deliberately dark,
 * so the bed is the only thing that can carry the middle of the spectrum —
 * and the sub pulses are trimmed at source in `cues.ts` for the same reason.
 */
const BED_GAIN = 0.55;

/**
 * How long a cue is allowed to ring.
 *
 * Two seconds: longer than the longest sound in the kit, so nothing is cut
 * off mid-decay. Remotion stops everything at the end of the composition
 * regardless.
 */
const RING = 60;

export function Track({ muted = false }: { muted?: boolean }) {
  if (muted) return null;

  return (
    <>
      <Sequence from={BED.from} durationInFrames={BED.to - BED.from}>
        <Audio src={bed} volume={BED_GAIN} />
      </Sequence>

      {CUES.map((cue, i) => (
        <Sequence
          // Several cues share a frame — a swoosh, a sub and a pop on the
          // same impact is a deliberate layering — so the index is part of
          // the key.
          key={`${cue.sfx}-${cue.frame}-${i}`}
          from={cue.frame}
          durationInFrames={RING}
        >
          <Audio src={staticFile(`audio/${cue.sfx}.wav`)} volume={cue.gain ?? 0.4} />
        </Sequence>
      ))}
    </>
  );
}
