/**
 * Band levels of a finished mix, in dBFS.
 *
 * `sfx-profile.mjs` says what a single sound is shaped like; this says whether
 * the finished master has anything in the range a phone speaker can actually
 * reproduce. It is the check that caught the film's mix sitting sixteen
 * decibels under its reference between 800 Hz and 2 kHz while its sub matched
 * to within one — measurably not "dark" but hollow.
 *
 * Takes a 16-bit mono WAV. To measure a render:
 *
 *   ffmpeg -i video/blink-ad-fr.mp4 -ac 1 -ar 44100 -c:a pcm_s16le mix.wav
 *   node qa/mix-bands.mjs mix.wav
 *
 * The ffmpeg on PATH here is Playwright's and cannot read audio; use the one
 * in node_modules/@remotion/compositor-linux-x64-gnu with LD_LIBRARY_PATH set
 * to the same directory.
 */
import fs from "node:fs";
function fft(re, im) {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) { let b = N >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= N; len <<= 1) for (let i = 0; i < N; i += len) for (let k = 0; k < len / 2; k++) {
    const w = (-2 * Math.PI * k) / len, c = Math.cos(w), s = Math.sin(w);
    const ur = re[i + k], ui = im[i + k];
    const vr = re[i + k + len / 2] * c - im[i + k + len / 2] * s;
    const vi = re[i + k + len / 2] * s + im[i + k + len / 2] * c;
    re[i + k] = ur + vr; im[i + k] = ui + vi;
    re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
  }
}
const b = fs.readFileSync(process.argv[2]);
const rate = b.readUInt32LE(24), n = (b.length - 44) / 2;
const x = new Float32Array(n);
for (let i = 0; i < n; i++) x[i] = b.readInt16LE(44 + i * 2) / 32768;
const N = 4096, bands = [[20,120],[120,300],[300,800],[800,2000],[2000,6000],[6000,16000]];
const acc = bands.map(() => 0); let fr = 0;
for (let off = 0; off + N <= n; off += N) {
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = x[off + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  fft(re, im); fr++;
  for (let bi = 0; bi < bands.length; bi++) { const [lo, hi] = bands[bi];
    for (let k = Math.ceil(lo * N / rate); k < hi * N / rate && k < N / 2; k++) acc[bi] += (re[k] ** 2 + im[k] ** 2); }
}
console.log(process.argv[2].split("/").pop());
bands.forEach(([lo, hi], i) => {
  const rms = Math.sqrt(acc[i] / fr) / N;
  console.log(`  ${String(lo).padStart(5)}–${String(hi).padEnd(5)}Hz  ${(20 * Math.log10(rms + 1e-12)).toFixed(1).padStart(7)} dBFS`);
});
