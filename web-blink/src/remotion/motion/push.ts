/**
 * The drive into the ink, as one move.
 *
 * It crosses a scene boundary — the camera starts closing on the stamped word
 * inside the verdict and the score scene carries it the rest of the way into
 * the red — and it used to be written as two interpolations, one per scene.
 * That looked like three separate zooms:
 *
 *   frames 416–450   scale 1 → 1.35, easing `1 - (1-t)³`   decelerating to a stop
 *   frames 450–452   nothing
 *   frames 452–464   scale 1.35 → 27, easing `t^2.6`        accelerating from a stop
 *
 * The scales matched at the seam, so the *position* was continuous; the
 * velocity was not. It slowed to a halt, waited, and set off again — and two
 * full stops inside half a second is exactly what "it zooms several times"
 * describes.
 *
 * So it is one function of the absolute frame, sampled by both scenes, and
 * its velocity only ever increases.
 *
 * ## Why it is exponential
 *
 * A zoom feels like constant speed when the magnification *multiplies* at a
 * constant rate, not when it adds — going from 1× to 2× is the same amount of
 * travel as 10× to 20×. So the move is linear in log space, and the
 * acceleration is a power applied to the parameter rather than to the scale.
 */

import { INK, VERDICT_PUSH } from "../timeline";

/** Where the sheet ends up: the word fills the frame several times over. */
const MAGNIFY = 27.35;

/**
 * How hard it accelerates.
 *
 * Solved rather than dialled: five puts the move at about 1.8× by the time the
 * verdict hands over, which is a camera leaning in — enough to feel deliberate,
 * far short of blowing the desk up before the cut. Everything past that is the
 * dive.
 */
const ACCELERATION = 5;

/** 0 → 1 across the whole move. */
function progress(frame: number): number {
  const t = (frame - VERDICT_PUSH) / (INK - VERDICT_PUSH);
  return Math.max(0, Math.min(1, t));
}

/** The magnification at `frame`, from 1 at the start to `MAGNIFY` at the ink. */
export function pushAt(frame: number): number {
  return Math.exp(Math.pow(progress(frame), ACCELERATION) * Math.log(MAGNIFY));
}

/**
 * How far the sheet has tipped toward the lens, in degrees.
 *
 * On the same clock as the push, for the same reason: tipped by its own
 * easing it reached its angle and held it, which put a second stationary
 * element inside a move whose whole job is to never stop.
 */
export function tipAt(frame: number): number {
  return -9 * Math.pow(progress(frame), 1.5);
}
