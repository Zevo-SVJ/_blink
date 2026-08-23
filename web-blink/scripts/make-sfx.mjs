/**
 * Generates the film's sound kit as WAV files.
 *
 * ## Five sounds, used densely
 *
 * The kit is deliberately tiny. The reference this was designed against is
 * 8.7 seconds long and carries 23 audible events — a median of a quarter of a
 * second apart — built from a handful of textures repeated at different
 * pitches and levels. Density comes from how often they are placed, not from
 * how many different sounds there are.
 *
 * ## What it is trying to sound like
 *
 * Measured off that reference rather than guessed at: 71% of its energy sits
 * below 250 Hz, its spectral centroid is 1.8 kHz, and only 1.5% of the energy
 * is above 2 kHz. Its transients rise over about 20 ms — soft-knee, an order
 * of magnitude slower than a click.
 *
 * So: no bright transients, no chimes, no sweeps, nothing above 4 kHz worth
 * speaking of. Impacts are sub-bass with a slow attack. Interface sounds are
 * bubbles, not clicks. Whooshes are cottony rather than airy. The sound should
 * sit under the picture and be felt more than heard.
 *
 * ## Placeholders, on purpose
 *
 * These are written to `public/audio/` under the exact filenames the film
 * asks for, so the picture can be cut and rendered against real audio today.
 * Replacing any of them means dropping a file of the same name into that
 * folder — no code change, no import to edit, no re-run of this script.
 *
 *   node scripts/make-sfx.mjs
 */

import fs from "node:fs";
import path from "node:path";

const RATE = 48000;
/*
  Written where the film reads them from, not to a scratch folder.

  `staticFile()` resolves against `public/`, which is the whole point: anyone
  swapping a placeholder for a sourced recording drops it in beside these and
  re-renders. Nothing imports them by path, so nothing has to be edited.
*/
const OUT = path.join(process.cwd(), "public", "audio");

// ── helpers ────────────────────────────────────────────────────────────

const buf = (seconds) => new Float32Array(Math.ceil(RATE * seconds));

/** Exponential decay envelope with a short attack, in samples. */
function env(n, i, { attack = 0.002, decay = 0.2, curve = 1 } = {}) {
  const t = i / RATE;
  const a = attack > 0 ? Math.min(1, t / attack) : 1;
  const d = Math.exp(-Math.pow(t / decay, curve) * 4);
  return a * d;
}

function sine(out, { freq, to, gain = 1, decay = 0.2, attack = 0.002, curve = 1 }) {
  let phase = 0;
  for (let i = 0; i < out.length; i += 1) {
    const t = i / RATE;
    const f = to === undefined ? freq : freq * Math.pow(to / freq, Math.min(1, t / decay));
    phase += (2 * Math.PI * f) / RATE;
    out[i] += Math.sin(phase) * env(out.length, i, { attack, decay, curve }) * gain;
  }
  return out;
}

function tri(out, { freq, to, gain = 1, decay = 0.2, attack = 0.002 }) {
  let phase = 0;
  for (let i = 0; i < out.length; i += 1) {
    const t = i / RATE;
    const f = to === undefined ? freq : freq * Math.pow(to / freq, Math.min(1, t / decay));
    phase += f / RATE;
    const x = 2 * Math.abs(2 * (phase % 1) - 1) - 1;
    out[i] += x * env(out.length, i, { attack, decay }) * gain;
  }
  return out;
}

/** Deterministic noise — the same kit every time the script runs. */
let seed = 0x2f6e2b1;
function rand() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 0xffffffff) * 2 - 1;
}

/** One-pole band-pass sweep over noise. */
function noise(out, { from, to, q = 1, gain = 1, decay = 0.2, attack = 0.004 }) {
  let lp = 0;
  let bp = 0;
  for (let i = 0; i < out.length; i += 1) {
    const t = Math.min(1, i / RATE / decay);
    const f = from * Math.pow(to / from, t);
    const w = (2 * Math.PI * f) / RATE;
    const g = Math.min(0.9, w);
    const damp = Math.min(0.9, 1 / q);
    const input = rand();
    const hp = input - lp - damp * bp;
    bp += g * hp;
    lp += g * bp;
    out[i] += bp * env(out.length, i, { attack, decay }) * gain;
  }
  return out;
}

/**
 * Cascaded one-pole low-pass, in place.
 *
 * The band-pass above is a one-pole design and it leaks: measured, its
 * "cottony" swoosh came back with a spectral centroid of 4.7 kHz against a
 * reference of 1.8, which is the opposite of cottony. Two or three poles of
 * plain low-pass after the fact is what actually removes the top.
 */
function lowpass(out, hz, poles = 2) {
  const a = 1 - Math.exp((-2 * Math.PI * hz) / RATE);
  for (let p = 0; p < poles; p += 1) {
    let z = 0;
    for (let i = 0; i < out.length; i += 1) {
      z += a * (out[i] - z);
      out[i] = z;
    }
  }
  return out;
}

function write(name, samples, peak = 0.9) {
  let max = 0;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  const k = max > 0 ? peak / max : 1;

  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    // A short fade at both ends: a WAV that starts mid-cycle clicks, and a
    // click at the head of every sound effect is how a mix ends up crunchy.
    const fade = Math.min(1, i / 64, (samples.length - i) / 256);
    const v = Math.max(-1, Math.min(1, samples[i] * k * fade));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);

  fs.writeFileSync(path.join(OUT, `${name}.wav`), Buffer.concat([header, data]));
  console.log(`  ${name}.wav  ${(data.length / 1024).toFixed(0)} KB`);
}

// ── the kit ────────────────────────────────────────────────────────────

fs.mkdirSync(OUT, { recursive: true });
console.log("Writing the kit to public/audio …");

/*
  A deep sub-bass pulse.

  For the hook and for every heavy reveal. The fundamental sits at 52 Hz and
  falls to 28, which is below what a phone speaker can reproduce at all — so a
  second body an octave up carries the shape where the sub cannot, and a
  little second-harmonic content makes it translate rather than vanish. The
  attack is 22 ms: a sub with a 2 ms attack is a kick drum, and this is meant
  to be felt swelling rather than struck.
*/
{
  const s = buf(1.7);
  sine(s, { freq: 52, to: 28, gain: 1, decay: 1.1, attack: 0.022, curve: 0.7 });
  sine(s, { freq: 104, to: 56, gain: 0.3, decay: 0.55, attack: 0.026, curve: 0.8 });
  // Enough upper body to survive a laptop speaker, nowhere near enough to
  // read as a click.
  sine(s, { freq: 168, to: 92, gain: 0.11, decay: 0.2, attack: 0.03 });
  write("deep_sub_bass_pulse", s);
}

/*
  A soft pop, for a word or a label arriving.

  A bubble is a fast downward pitch bend with no edge on it. The 20 ms attack
  is doing most of the work — the same shape at 2 ms is a UI blip, which is
  the sound this kit exists to avoid.
*/
{
  const s = buf(0.26);
  sine(s, { freq: 640, to: 250, gain: 0.85, decay: 0.11, attack: 0.019, curve: 0.9 });
  sine(s, { freq: 320, to: 150, gain: 0.4, decay: 0.14, attack: 0.022 });
  /* An upper voice, quiet and with the same slow attack as everything else.

     Without it the finished mix measured 16 dB below the reference between 800
     Hz and 2 kHz and 28 dB below it above that — which is not "dark", it is
     hollow, and on a phone speaker (which reproduces almost nothing under 200
     Hz) it would have been close to inaudible. This is the band a small
     speaker actually has. */
  sine(s, { freq: 1500, to: 720, gain: 0.17, decay: 0.05, attack: 0.018 });
  // A breath of body underneath so it has somewhere to sit in the mix.
  sine(s, { freq: 120, to: 78, gain: 0.22, decay: 0.16, attack: 0.02 });
  write("ui_soft_pop_bubble", s, 0.8);
}

/*
  A soft air swoosh, for whips and transitions.

  Filtered downward rather than the usual bright rush: the band starts at
  900 Hz and lands at 220, so it reads as air moving past rather than as a
  transition effect. A 60 ms attack keeps it from having a front edge.
*/
{
  const s = buf(0.72);
  noise(s, { from: 900, to: 220, q: 1.5, gain: 0.9, decay: 0.34, attack: 0.06 });
  noise(s, { from: 420, to: 140, q: 2.4, gain: 0.5, decay: 0.42, attack: 0.09 });
  // The pressure behind it. Below the noise, and mostly felt.
  sine(s, { freq: 90, to: 46, gain: 0.35, decay: 0.36, attack: 0.05 });
  lowpass(s, 2400, 2);
  write("soft_air_swoosh", s, 0.72);
}

/*
  A muffled click, for typing.

  Ninety milliseconds, everything above 800 Hz filtered away, and a 6 ms
  attack — present enough to be a keystroke, blunt enough that thirty of them
  in a row do not become a machine gun.
*/
{
  const s = buf(0.1);
  noise(s, { from: 1600, to: 380, q: 1.1, gain: 0.55, decay: 0.028, attack: 0.006 });
  tri(s, { freq: 180, to: 96, gain: 0.75, decay: 0.045, attack: 0.005 });
  lowpass(s, 2600, 2);
  write("asmr_muffled_clicks", s, 0.6);
}

/*
  Glass sliding on paper, for the loupe crossing the print.

  Sustained rather than transient: a narrow band around 300–600 Hz with slow
  movement through it, a 120 ms attack and a long tail, so it can be laid
  under the whole pass and duck the rest of the mix rather than punctuating
  it. The wobble is what stops it reading as a synth pad.
*/
{
  const s = buf(1.25);
  noise(s, { from: 320, to: 560, q: 3.2, gain: 0.7, decay: 0.85, attack: 0.12 });
  noise(s, { from: 620, to: 300, q: 4.5, gain: 0.4, decay: 0.7, attack: 0.16 });
  // Slow amplitude movement — friction is never even.
  for (let i = 0; i < s.length; i += 1) {
    const t = i / RATE;
    s[i] *= 0.72 + 0.28 * Math.sin(2 * Math.PI * 3.1 * t + Math.sin(2 * Math.PI * 0.7 * t));
  }
  sine(s, { freq: 78, to: 58, gain: 0.18, decay: 0.8, attack: 0.14 });
  lowpass(s, 1700, 2);
  write("glass_slide_friction", s, 0.62);
}

console.log("done.");
