/**
 * Generates the film's music bed.
 *
 * ## The brief it is written to
 *
 * Never compete with the SFX or a future voice-over. That is a composition
 * constraint before it is a mixing one: the bed is a pulse and a low pad, with
 * almost nothing in the 1–4 kHz band where speech and transients live. It has
 * no melody, because a melody is something the ear follows instead of the
 * words.
 *
 * It is also written *against the edit*: the tempo is chosen so that bars land
 * on the act boundaries, and the arrangement drops out under the interrupt and
 * comes back for the score. A bed that ignores the cut is what makes an ad
 * feel like a video with music playing near it.
 *
 *   node scripts/make-music.mjs
 */

import fs from "node:fs";
import path from "node:path";

const RATE = 48000;
const FPS = 30;
/* 750 frames = 25s, plus a little tail so the last chime is not cut off. */
const FRAMES = 750;
const SECONDS = FRAMES / FPS + 0.6;

/* 120 bpm at 30fps is exactly 15 frames a beat and 60 a bar, so every bar
   lands on a whole frame and the act boundaries in `timeline.ts` fall on
   musical divisions rather than near them. */
const BPM = 120;
const BEAT = 60 / BPM;

const n = Math.ceil(RATE * SECONDS);
const L = new Float32Array(n);
const R = new Float32Array(n);

let seed = 0x9e3779b9;
const rand = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 0xffffffff) * 2 - 1;
};

const at = (sec) => Math.floor(sec * RATE);

/**
 * Where the arrangement changes, in seconds, derived from the edit.
 *
 * These mirror `src/remotion/timeline.ts`. The bed is written *against* the
 * cut rather than laid under it: it thins out where the picture goes quiet
 * and stops dead under the two moments that need silence to land.
 */
const OBSERVE = 90 / FPS;
const CARDS = 180 / FPS;
const MIRROR = 270 / FPS;
const CRACK = 320 / FPS;
const STAMP = 360 / FPS;
const SCORE = 450 / FPS;
const DESK = 540 / FPS;
const CTA = 660 / FPS;

/** Level of the bed at a moment — this is the arrangement. */
function bedLevel(t) {
  if (t < 0.2) return t / 0.2;          // in
  if (t < OBSERVE) return 0.75;         // hook: restrained, so the impacts hit
  if (t < CARDS) return 0.55;           // observation: quiet, the loupe leads
  if (t < MIRROR) return 0.9;           // the cards: building
  if (t < CRACK) return 1;              // the mirror: full
  if (t < STAMP) return 0.08;           // the crack: everything stops
  if (t < SCORE) return 0.45;           // the verdict: sparse under the stamp
  if (t < DESK) return 0.95;            // the score: back
  if (t < CTA) return 1;                // the desk: the widest moment
  return Math.max(0, 0.95 * (1 - Math.pow((t - CTA) / (SECONDS - CTA), 2)));
}

/* ── the pulse ─────────────────────────────────────────────────────────
   A muted low tick on every beat and a softer one on the offbeat. It is the
   only thing carrying tempo, and it sits at 60–90 Hz where nothing else in
   the mix lives. */
for (let b = 0; b * BEAT < SECONDS; b += 1) {
  const t = b * BEAT;
  const lvl = bedLevel(t);
  if (lvl < 0.12) continue;

  const strong = b % 2 === 0;
  const start = at(t);
  const dur = at(strong ? 0.16 : 0.1);
  const f0 = strong ? 88 : 132;

  let phase = 0;
  for (let i = 0; i < dur && start + i < n; i += 1) {
    const p = i / dur;
    const f = f0 * Math.pow(0.55, p);
    phase += (2 * Math.PI * f) / RATE;
    const a = Math.exp(-p * 5) * (strong ? 0.3 : 0.13) * lvl;
    const v = Math.sin(phase) * a;
    L[start + i] += v;
    R[start + i] += v;
  }
}

/* ── the pad ───────────────────────────────────────────────────────────
   Two detuned sines a fifth apart, moving between three chords. Detuned by a
   couple of cents and panned apart so it has width without any stereo effect
   that would collapse to mono on a phone speaker. */
const CHORDS = [
  [110, 164.81, 220],       // A
  [98, 146.83, 196],        // G
  [123.47, 185, 246.94],    // B
  [110, 164.81, 220],
];
const CHORD_BARS = 4;

for (let i = 0; i < n; i += 1) {
  const t = i / RATE;
  const lvl = bedLevel(t);
  if (lvl < 0.05) continue;

  const bar = Math.floor(t / (BEAT * 4));
  const chord = CHORDS[Math.floor(bar / CHORD_BARS) % CHORDS.length];

  let l = 0;
  let r = 0;
  for (let v = 0; v < chord.length; v += 1) {
    const f = chord[v];
    // Cents of detune, opposite directions per channel.
    l += Math.sin(2 * Math.PI * f * 0.9985 * t) * (0.055 / (v + 1));
    r += Math.sin(2 * Math.PI * f * 1.0015 * t) * (0.055 / (v + 1));
  }

  // Very slow breathing, so a twenty-one second bed does not feel looped.
  const breathe = 0.85 + 0.15 * Math.sin(2 * Math.PI * t * 0.07);

  L[i] += l * lvl * breathe;
  R[i] += r * lvl * breathe;
}

/* ── air ───────────────────────────────────────────────────────────────
   A whisper of filtered noise. Without it the bed sounds synthetic; with it
   there is a room. Low-passed hard so it never reaches the speech band. */
let lp = 0;
for (let i = 0; i < n; i += 1) {
  const t = i / RATE;
  lp += (rand() - lp) * 0.02;
  const a = 0.02 * bedLevel(t);
  L[i] += lp * a;
  R[i] += lp * a * 0.9;
}

/* ── write ─────────────────────────────────────────────────────────────
   Peak-normalised low, because this is a bed. The SFX are mixed at roughly
   three times this level, which is the ratio the brief asks for. */
let max = 0;
for (let i = 0; i < n; i += 1) max = Math.max(max, Math.abs(L[i]), Math.abs(R[i]));
const k = max > 0 ? 0.34 / max : 1;

const data = Buffer.alloc(n * 4);
for (let i = 0; i < n; i += 1) {
  const fade = Math.min(1, i / (RATE * 0.05), (n - i) / (RATE * 0.4));
  const cl = Math.max(-1, Math.min(1, L[i] * k * fade));
  const cr = Math.max(-1, Math.min(1, R[i] * k * fade));
  data.writeInt16LE(Math.round(cl * 32767), i * 4);
  data.writeInt16LE(Math.round(cr * 32767), i * 4 + 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

const out = path.join(process.cwd(), "public", "sfx", "bed.wav");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, data]));
console.log(`bed.wav  ${(data.length / 1024 / 1024).toFixed(2)} MB  (${SECONDS.toFixed(1)}s)`);
