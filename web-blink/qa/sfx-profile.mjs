/**
 * What the sound kit actually sounds like, in numbers.
 *
 * The kit was designed against a reference recording, and "designed against"
 * is worth nothing unless it can be checked. The reference measures 71% of its
 * energy below 250 Hz, a spectral centroid of 1.8 kHz, and transients that
 * rise over about 20 ms. This reports the same three figures for every file in
 * `public/audio/`, so a placeholder swapped for a sourced recording can be
 * held to the same profile instead of to an opinion.
 *
 *   node qa/sfx-profile.mjs [dir]
 */
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve(process.argv[2] ?? "public/audio");

function fft(re, im) {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= N; len <<= 1) {
    for (let i = 0; i < N; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const w = (-2 * Math.PI * k) / len, c = Math.cos(w), s = Math.sin(w);
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * c - im[i + k + len / 2] * s;
        const vi = re[i + k + len / 2] * s + im[i + k + len / 2] * c;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
      }
    }
  }
}

/** Reads a canonical 16-bit mono WAV — which is what `make-sfx.mjs` writes. */
function read(file) {
  const b = fs.readFileSync(file);
  const rate = b.readUInt32LE(24);
  const ch = b.readUInt16LE(22);
  const n = (b.length - 44) / 2 / ch;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = b.readInt16LE(44 + i * ch * 2) / 32768;
  return { x, rate };
}

console.log("file                        dur    <250Hz  centroid  attack");
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".wav")).sort()) {
  const { x, rate } = read(path.join(DIR, f));
  const N = 4096;
  const mag = new Float64Array(N / 2);
  let frames = 0;
  for (let off = 0; off + N <= x.length; off += N / 2) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = x[off + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
    fft(re, im);
    for (let k = 0; k < N / 2; k++) mag[k] += Math.hypot(re[k], im[k]);
    frames++;
  }
  const binHz = rate / N;
  let low = 0, tot = 0, cn = 0, cd = 0;
  for (let k = 1; k < N / 2; k++) {
    const p = mag[k] * mag[k];
    tot += p;
    if (k * binHz < 250) low += p;
    cn += k * binHz * mag[k];
    cd += mag[k];
  }

  /* Rise time to the loudest window, in 1 ms steps.

     This used to measure in 5 ms windows, which cannot resolve the front edge
     of a 120 ms sound at all: the peak lands in the first window and the
     answer is always "0 ms", whether the sound is a click or not. A
     millisecond is short enough to tell a 7 ms attack from a 1 ms one, which
     is the whole distinction this column exists to make. */
  const W = Math.max(1, Math.round(rate * 0.001));
  let peak = 0, peakAt = 0;
  for (let i = 0; i + W <= x.length; i += W) {
    let s = 0;
    for (let k = 0; k < W; k++) s += x[i + k] * x[i + k];
    if (s > peak) { peak = s; peakAt = i; }
  }
  let j = peakAt;
  while (j > 0) {
    let s = 0;
    for (let k = 0; k < W; k++) s += x[j + k] * x[j + k];
    if (s < peak * 0.01) break;
    j -= W;
  }
  const attack = Math.round(((peakAt - Math.max(0, j)) / rate) * 1000);

  console.log(
    f.padEnd(28) +
      (x.length / rate).toFixed(2).padStart(5) + "s " +
      (frames ? (100 * low / tot).toFixed(0) + "%" : "  –").padStart(7) + "  " +
      (frames ? Math.round(cn / cd) + "Hz" : "–").padStart(8) + "  " +
      (attack + "ms").padStart(6),
  );
}
console.log("\nreference: 71% below 250Hz · centroid 1822Hz · attack 6ms");
