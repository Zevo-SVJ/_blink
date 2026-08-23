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
 * is above 2 kHz. Its transients rise over about 6 ms measured at millisecond
 * resolution — soft-knee, several times slower than a click.
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

/**
 * A damped resonance, struck once.
 *
 * The difference between a click and a *thock*, and between a blip and a
 * bloop. Both of those are a body ringing briefly at its own pitch after
 * being hit — not a waveform with an envelope drawn over it. `q` is how long
 * it rings: 20 is a plastic tap, 120 is a struck glass.
 *
 * `excite` is how hard it is hit, in seconds. A single-sample impulse gives a
 * resonator a perfectly instantaneous front edge — measured, the first thock
 * built this way had a 0 ms attack, which is the definition of the click this
 * kit exists to avoid. Spreading the excitation over a few milliseconds is
 * the difference between a key striking bare plastic and one bottoming out on
 * foam.
 */
function resonate(out, { freq, q = 40, gain = 1, at = 0, excite = 0.004 }) {
  const w = (2 * Math.PI * freq) / RATE;
  const r = Math.exp(-w / (2 * q));
  const c = 2 * r * Math.cos(w);
  const d = r * r;
  let y1 = 0;
  let y2 = 0;
  const start = Math.round(at * RATE);
  const hit = Math.max(1, Math.round(excite * RATE));
  for (let i = start; i < out.length; i += 1) {
    const k = i - start;
    // A raised cosine over `hit` samples: all the energy, none of the edge.
    const x = k < hit ? (0.5 - 0.5 * Math.cos((2 * Math.PI * k) / hit)) / hit : 0;
    const y = x + c * y1 - d * y2;
    y2 = y1;
    y1 = y;
    out[i] += y * gain * 0.02;
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
  /* A resonance under the bend — what "resonant" means as opposed to "loud":
     the note keeps ringing after the swell has gone.

     Q is 80, not the 260 this was first written with. Every file is peak-
     normalised, so a ring that long does not add depth, it raises the whole
     file's average level: at 260 this one sound measured 12 dB hotter than
     everything else in the kit and pushed the finished master 3 dB past the
     reference's sub while the rest of the mix stayed where it was. */
  resonate(s, { freq: 44, q: 80, gain: 14, excite: 0.02 });
  // Enough upper body to survive a laptop speaker, nowhere near enough to
  // read as a click.
  sine(s, { freq: 168, to: 92, gain: 0.11, decay: 0.2, attack: 0.03 });
  write("deep_sub_bass_pulse", s);
}

/*
  A water drop, for a word or a label arriving.

  A bubble's pitch *rises* as it collapses — that is the whole reason a drop
  sounds like a drop and not like a synth blip. The first cut of this bent the
  other way, 640 Hz down to 250, which is exactly the "digital" sound the brief
  rules out. Bent upward over sixty milliseconds it reads as liquid.

  Under it, a short resonance for the body of the water and a low thump for
  the impact, so it has somewhere to sit in the mix.
*/
{
  const s = buf(0.3);
  sine(s, { freq: 380, to: 980, gain: 0.72, decay: 0.06, attack: 0.006, curve: 1.4 });
  resonate(s, { freq: 620, q: 26, gain: 24, excite: 0.005 });
  resonate(s, { freq: 1480, q: 18, gain: 8, excite: 0.004 });
  // The impact under the bloop. Felt, not heard.
  sine(s, { freq: 150, to: 84, gain: 0.3, decay: 0.12, attack: 0.008 });
  lowpass(s, 3200, 1);
  write("ui_soft_pop_bubble", s, 0.8);
}

/*
  A cottony slide, for whips and transitions.

  Heavy fabric or water moving past, not wind. The distinction is the
  envelope: wind decays from a front edge, but something *passing* you swells
  and falls. So the band opens upward and closes again, and the amplitude is
  shaped as a swell rather than as a decay — which is also why there is no
  attack transient anywhere in it.
*/
{
  const s = buf(0.78);
  noise(s, { from: 260, to: 900, q: 1.6, gain: 0.9, decay: 0.5, attack: 0.1 });
  noise(s, { from: 700, to: 200, q: 2.6, gain: 0.6, decay: 0.55, attack: 0.14 });
  // The pressure behind it. Below the noise, and mostly felt.
  sine(s, { freq: 90, to: 46, gain: 0.35, decay: 0.4, attack: 0.06 });
  // Swell and fall: a raised sine over the whole length, so nothing in this
  // sound ever has a front edge.
  for (let i = 0; i < s.length; i += 1) {
    s[i] *= Math.sin((Math.PI * i) / s.length) ** 1.3;
  }
  lowpass(s, 2400, 2);
  write("soft_air_swoosh", s, 0.72);
}

/*
  A muffled thock, for typing.

  A round mechanical keyboard, not a click: two low resonances dying inside
  forty milliseconds with barely any noise on top. Noise is what makes a
  keystroke sound like a mouse button; the body is what makes it sound like a
  key bottoming out on foam.
*/
{
  const s = buf(0.12);
  resonate(s, { freq: 168, q: 22, gain: 46, excite: 0.007 });
  resonate(s, { freq: 305, q: 14, gain: 20, excite: 0.006 });
  noise(s, { from: 1400, to: 420, q: 1.2, gain: 0.16, decay: 0.014, attack: 0.003 });
  lowpass(s, 2200, 2);
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
    // Two rates of movement, not one. A single wobble is a tremolo; two at
    // unrelated speeds is a hand that is not moving perfectly evenly.
    const slow = 0.78 + 0.22 * Math.sin(2 * Math.PI * 0.9 * t);
    const fast = 0.82 + 0.18 * Math.sin(2 * Math.PI * 4.7 * t + 1.1);
    s[i] *= slow * fast;
  }
  sine(s, { freq: 78, to: 58, gain: 0.18, decay: 0.8, attack: 0.14 });
  lowpass(s, 1700, 2);
  write("glass_slide_friction", s, 0.62);
}

console.log("done.");
