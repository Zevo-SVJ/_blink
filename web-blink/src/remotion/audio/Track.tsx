/**
 * The film's audio, as Remotion sequences.
 *
 * Each cue is an `<Audio>` inside a `<Sequence>` starting on its frame, which
 * is how Remotion muxes sound into the render: the cue list is not played back
 * by anything, it is *scheduled*, and the encoder resolves it sample-accurately
 * rather than as fast as a browser happened to fire it.
 *
 * The bed sits under everything at a level chosen so that the loudest SFX is
 * roughly three times it — the brief's voice-over-SFX-over-music ordering, with
 * the voice slot still empty. Adding narration later means one more `<Audio>`
 * and lowering `BED_GAIN`; nothing about the picture or the cues moves.
 */

import { Audio, Sequence } from "remotion";

import { BED, CUES, type SfxName } from "./cues";

import bassHit from "./bass-hit.mp3";
import bed from "./bed.mp3";
import blip from "./blip.mp3";
import chime from "./chime.mp3";
import click from "./click.mp3";
import confirm from "./confirm.mp3";
import impact from "./impact.mp3";
import key from "./key.mp3";
import land from "./land.mp3";
import lock from "./lock.mp3";
import pop from "./pop.mp3";
import riser from "./riser.mp3";
import scan from "./scan.mp3";
import whoosh from "./whoosh.mp3";
import whooshShort from "./whoosh-short.mp3";

const FILES: Record<SfxName, string> = {
  impact,
  "bass-hit": bassHit,
  whoosh,
  "whoosh-short": whooshShort,
  pop,
  click,
  key,
  blip,
  scan,
  riser,
  confirm,
  chime,
  land,
  lock,
};

/** The bed's level. Everything else is mixed against this. */
const BED_GAIN = 0.34;

export function Track({ muted = false }: { muted?: boolean }) {
  if (muted) return null;

  return (
    <>
      <Sequence from={BED.from} durationInFrames={BED.to - BED.from}>
        <Audio src={bed} volume={BED_GAIN} />
      </Sequence>

      {CUES.map((cue, i) => (
        <Sequence
          // Two cues can share a frame — a whoosh and an impact on the same
          // cut is a deliberate layering — so the index is part of the key.
          key={`${cue.sfx}-${cue.frame}-${i}`}
          from={cue.frame}
          // Long enough for the longest sound in the kit to ring out; Remotion
          // stops it at the end of the composition regardless.
          durationInFrames={60}
        >
          <Audio src={FILES[cue.sfx]} volume={cue.gain ?? 0.7} trimBefore={cue.trim} />
        </Sequence>
      ))}
    </>
  );
}
