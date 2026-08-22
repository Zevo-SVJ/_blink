/**
 * Generates the film's sound kit as WAV files.
 *
 * ## Why generated rather than downloaded
 *
 * Remotion renders audio from real files, so the previous cut's Web Audio
 * synth could not be used — it only existed while a browser was playing. The
 * alternatives were a commercial SFX pack (licensing, and nothing in the repo
 * to regenerate it from) or this: a script that writes the kit, so the sounds
 * are versioned as code, tunable by changing a number, and unambiguously ours.
 *
 * ## What it is trying to sound like
 *
 * Modern product-ad sound design: short, dry, mostly transient. No sci-fi
 * sweeps, no lasers, no reverb tails. An impact is a pitched-down body with a
 * click on top; a whoosh is filtered noise with a pitch envelope; a UI click
 * is four milliseconds of nothing much. If a sound draws attention to itself
 * it is wrong — it should only make the picture feel more solid.
 *
 *   node scripts/make-sfx.mjs
 */

import fs from "node:fs";
import path from "node:path";

const RATE = 48000;
const OUT = path.join(process.cwd(), "public", "sfx");

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
console.log("Writing the kit to public/sfx …");

/* A word lands. Body plus click — the click is what makes it read as an
   impact rather than a thud. */
{
  const s = buf(0.34);
  sine(s, { freq: 220, to: 48, gain: 0.9, decay: 0.24, curve: 0.8 });
  tri(s, { freq: 1300, to: 380, gain: 0.2, decay: 0.045 });
  noise(s, { from: 2600, to: 700, q: 0.9, gain: 0.18, decay: 0.05 });
  write("impact", s);
}

/* The interrupt. Same shape, an octave down and much longer — it has to feel
   like the floor moved, not like a louder version of the others. */
{
  const s = buf(0.9);
  sine(s, { freq: 150, to: 30, gain: 1, decay: 0.62, curve: 0.7 });
  sine(s, { freq: 74, to: 26, gain: 0.7, decay: 0.8, curve: 0.7 });
  tri(s, { freq: 900, to: 180, gain: 0.22, decay: 0.09 });
  noise(s, { from: 1800, to: 220, q: 0.8, gain: 0.22, decay: 0.13 });
  write("bass-hit", s);
}

/* Air moving sideways. The pitch rising through it is what makes it a whip
   rather than a hiss. */
{
  const s = buf(0.3);
  noise(s, { from: 500, to: 5200, q: 0.85, gain: 0.9, decay: 0.16, attack: 0.02 });
  noise(s, { from: 300, to: 2400, q: 1.6, gain: 0.35, decay: 0.2, attack: 0.03 });
  write("whoosh", s);
}

/* Shorter, tighter: for cuts that need air without a full pan. */
{
  const s = buf(0.18);
  noise(s, { from: 900, to: 6000, q: 0.9, gain: 0.85, decay: 0.09, attack: 0.008 });
  write("whoosh-short", s);
}

/* Something appears. Pitched up, not down — the opposite of an impact. */
{
  const s = buf(0.18);
  sine(s, { freq: 420, to: 1150, gain: 0.8, decay: 0.1 });
  tri(s, { freq: 1900, gain: 0.12, decay: 0.03 });
  write("pop", s);
}

/* A control being pressed. Almost nothing — four milliseconds of body. */
{
  const s = buf(0.07);
  tri(s, { freq: 2400, to: 1500, gain: 0.5, decay: 0.016 });
  noise(s, { from: 3400, to: 1800, q: 1.4, gain: 0.3, decay: 0.02, attack: 0.001 });
  write("click", s);
}

/* A key. Dryer and duller than a click, so a run of them reads as typing
   rather than as a machine gun. */
{
  const s = buf(0.06);
  tri(s, { freq: 1500, to: 900, gain: 0.4, decay: 0.014 });
  noise(s, { from: 2200, to: 900, q: 1.2, gain: 0.32, decay: 0.018, attack: 0.001 });
  write("key", s, 0.7);
}

/* One step of the scan. Tiny and pitched — a dozen of these fire in a row, so
   any weight at all would turn the sequence into a drum fill. */
{
  const s = buf(0.05);
  sine(s, { freq: 2100, to: 2600, gain: 0.5, decay: 0.02 });
  write("blip", s, 0.55);
}

/* The scan itself, under the blips: a slow filtered sweep, barely there. */
{
  const s = buf(1.5);
  noise(s, { from: 380, to: 3200, q: 3.4, gain: 0.6, decay: 1.3, attack: 0.15 });
  write("scan", s, 0.5);
}

/* Tension before a reveal. Rising, and it must stop dead on the impact rather
   than tailing off past it. */
{
  const s = buf(0.85);
  noise(s, { from: 260, to: 3600, q: 2.2, gain: 0.55, decay: 1.1, attack: 0.3 });
  sine(s, { freq: 110, to: 460, gain: 0.35, decay: 1.1, attack: 0.35 });
  write("riser", s, 0.62);
}

/* A short rising figure for a value settling — two notes, not a fanfare. */
{
  const s = buf(0.5);
  sine(s, { freq: 660, gain: 0.5, decay: 0.14 });
  const b = buf(0.5);
  sine(b, { freq: 990, gain: 0.45, decay: 0.3 });
  const off = Math.round(RATE * 0.07);
  for (let i = 0; i < b.length - off; i += 1) s[i + off] += b[i];
  write("confirm", s, 0.75);
}

/* The end. A major third and a fifth, struck together and left to ring —
   the only sound in the kit allowed a tail. */
{
  const s = buf(1.6);
  sine(s, { freq: 587.33, gain: 0.4, decay: 0.9, attack: 0.004 });
  sine(s, { freq: 739.99, gain: 0.3, decay: 1.0, attack: 0.006 });
  sine(s, { freq: 880, gain: 0.26, decay: 1.2, attack: 0.008 });
  sine(s, { freq: 1174.66, gain: 0.14, decay: 0.7, attack: 0.01 });
  write("chime", s, 0.72);
}

/* A profile arriving on screen. Softer than an impact, with a little air. */
{
  const s = buf(0.4);
  sine(s, { freq: 180, to: 60, gain: 0.7, decay: 0.28, curve: 0.8 });
  noise(s, { from: 1400, to: 400, q: 1.1, gain: 0.3, decay: 0.12, attack: 0.006 });
  write("land", s);
}

/* A reticle locking. Two clicks, three frames apart — mechanical, certain. */
{
  const s = buf(0.22);
  tri(s, { freq: 2000, to: 1200, gain: 0.45, decay: 0.02 });
  const b = buf(0.22);
  tri(b, { freq: 1500, to: 700, gain: 0.5, decay: 0.035 });
  noise(b, { from: 2600, to: 900, q: 1.3, gain: 0.25, decay: 0.03 });
  const off = Math.round(RATE * 0.055);
  for (let i = 0; i < b.length - off; i += 1) s[i + off] += b[i];
  write("lock", s, 0.8);
}

/* The pattern interrupt. Not a "glitch" in the music-production sense — a
   short burst of broadband noise with a hard gate, so it reads as the picture
   tearing rather than as a sound effect being played. */
{
  const s = buf(0.26);
  noise(s, { from: 900, to: 240, q: 0.5, gain: 0.9, decay: 0.1, attack: 0.001 });
  noise(s, { from: 4200, to: 6000, q: 0.7, gain: 0.4, decay: 0.05, attack: 0.001 });
  tri(s, { freq: 130, to: 44, gain: 0.5, decay: 0.16 });
  // Gate it into three fragments — a continuous burst sounds like static.
  for (let i = 0; i < s.length; i += 1) {
    const t = i / RATE;
    const on = t < 0.03 || (t > 0.055 && t < 0.085) || (t > 0.11 && t < 0.15);
    if (!on) s[i] *= 0.06;
  }
  write("glitch", s);
}

/* The weight under the red flag. A slow drop with a second harmonic — felt in
   the chest rather than heard, which is what makes an observation land as a
   verdict. */
{
  const s = buf(1.2);
  sine(s, { freq: 128, to: 27, gain: 1, decay: 0.85, curve: 0.6 });
  sine(s, { freq: 64, to: 22, gain: 0.75, decay: 1.0, curve: 0.6 });
  tri(s, { freq: 420, to: 96, gain: 0.16, decay: 0.2 });
  write("drop", s);
}

console.log("done.");

/* ── compress ──────────────────────────────────────────────────────────
   The kit is written as WAV because that is what is easy to synthesise
   correctly, then encoded to MP3 because that is what is sane to commit —
   the bed alone is four megabytes as PCM and a hundred and sixty kilobytes
   encoded, for a bed nobody will A/B against the original.

   Remotion ships a full ffmpeg with its compositor. The one on this machine's
   PATH is Playwright's, which is built `--disable-everything` and cannot read
   a WAV at all, so the path matters.
*/
import { execFileSync } from "node:child_process";

const COMPOSITOR = path.join(
  process.cwd(),
  "node_modules",
  "@remotion",
  "compositor-linux-x64-gnu",
);
const FFMPEG = path.join(COMPOSITOR, "ffmpeg");

if (fs.existsSync(FFMPEG)) {
  console.log("\nEncoding to MP3 …");
  const dest = path.join(process.cwd(), "src", "remotion", "audio");
  fs.mkdirSync(dest, { recursive: true });

  let total = 0;
  for (const file of fs.readdirSync(OUT).filter((f) => f.endsWith(".wav"))) {
    const name = path.basename(file, ".wav");
    const to = path.join(dest, `${name}.mp3`);
    execFileSync(
      FFMPEG,
      [
        "-y", "-hide_banner", "-loglevel", "error",
        "-i", path.join(OUT, file),
        "-c:a", "libmp3lame",
        // The bed is the only thing long enough for the bitrate to matter.
        "-b:a", name === "bed" ? "128k" : "192k",
        to,
      ],
      { env: { ...process.env, LD_LIBRARY_PATH: COMPOSITOR } },
    );
    total += fs.statSync(to).size;
  }

  // The WAVs were scratch. Leaving them in `public/` would ship five
  // megabytes of source audio to every visitor of the landing page.
  fs.rmSync(OUT, { recursive: true, force: true });
  console.log(`  src/remotion/audio — ${(total / 1024).toFixed(0)} KB total`);
} else {
  console.warn("\nNo Remotion compositor found; leaving WAVs in public/sfx.");
}
