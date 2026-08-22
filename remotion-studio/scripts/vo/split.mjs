#!/usr/bin/env node
/**
 * DÉCOUPE D'UNE PRISE CONTINUE EN RÉPLIQUES PLACÉES
 *
 * Une voix off livrée en un seul fichier ne peut être synchrone que si les
 * silences enregistrés correspondent exactement aux temps morts du montage.
 * Dès que le débit du comédien diffère de l'estimation — ce qui est la règle,
 * pas l'exception — la piste dérive, et la dérive s'accumule : sur la prise
 * livrée, la treizième réplique arrivait 21,6 s trop tôt.
 *
 * Ce script coupe la prise en autant de morceaux qu'il y a de répliques et les
 * écrit sous les noms attendus par le mode `lines`. Chaque morceau est ensuite
 * posé par Remotion à **sa** frame : la dérive ne peut plus s'accumuler puisque
 * chaque réplique repart de sa propre marque.
 *
 * MÉTHODE
 *
 * Découper au silence seul ne suffit pas : un comédien qui enchaîne deux
 * répliques sans respirer ne laisse aucun silence à trouver. On procède donc en
 * deux temps :
 *
 *   1. **estimation proportionnelle** — la frontière entre deux répliques est
 *      d'abord placée au prorata du nombre de mots. C'est grossier mais jamais
 *      absurde, et surtout ça ne peut pas produire d'inversion ;
 *   2. **accrochage au creux d'énergie** — on cherche ensuite, dans une fenêtre
 *      de ±0,4 s autour de cette estimation, la tranche de 60 ms la plus faible
 *      en énergie, et on coupe là. Une vraie respiration est toujours le point
 *      le plus bas de son voisinage, donc la coupe tombe dessus quand elle
 *      existe, et sur l'inter-mot le plus creux quand elle n'existe pas.
 *
 * Usage :
 *   node scripts/vo/split.mjs [--dry]
 */

import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';

const ROOT = process.cwd();
const VO_DIR = join(ROOT, 'public', 'vo');
const SOURCE = join(VO_DIR, 'voiceover.mp3');
const TMP = join(ROOT, 'node_modules', '.cache', 'vo');
const SR = 16000;
const STEP = 0.01;
const DRY = process.argv.includes('--dry');

const ffmpeg = () => {
  const candidates = [
    join(ROOT, 'node_modules', '@remotion', 'compositor-linux-x64-gnu', 'ffmpeg'),
    join(ROOT, 'node_modules', '@remotion', 'compositor-darwin-arm64', 'ffmpeg'),
    join(ROOT, 'node_modules', '@remotion', 'compositor-darwin-x64', 'ffmpeg'),
    'ffmpeg',
  ];
  for (const c of candidates) if (c === 'ffmpeg' || existsSync(c)) return c;
  throw new Error('ffmpeg introuvable');
};

/** Les répliques, lues depuis la source de vérité. */
const parseVoice = () => {
  const src = readFileSync(join(ROOT, 'src/audio/voice.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const voice: VoiceLine[] = ['));
  const re =
    /at:\s*(\d+),\s*\n\s*file:\s*'([^']+)',\s*\n\s*line:\s*'((?:[^'\\]|\\.)*)'/g;
  const out = [];
  for (const m of block.matchAll(re)) {
    out.push({file: m[2], line: m[3].replace(/\\'/g, "'")});
  }
  if (out.length === 0) throw new Error('Partition vocale introuvable.');
  return out;
};

const envelope = (bin) => {
  const i = bin.indexOf('data');
  const size = bin.readUInt32LE(i + 4);
  const raw = bin.subarray(i + 8, i + 8 + size);
  const n = Math.floor(raw.length / 2);
  const win = Math.round(SR * STEP);
  const env = [];
  for (let k = 0; k + win <= n; k += win) {
    let sum = 0;
    for (let j = 0; j < win; j++) {
      const v = raw.readInt16LE((k + j) * 2);
      sum += v * v;
    }
    env.push(Math.sqrt(sum / win));
  }
  return {env, duration: n / SR};
};

/** Cherche le creux d'énergie le plus profond autour d'une estimation. */
const snap = (env, guess, radius = 0.4, width = 0.06) => {
  const w = Math.max(1, Math.round(width / STEP));
  const from = Math.max(0, Math.round((guess - radius) / STEP));
  const to = Math.min(env.length - w, Math.round((guess + radius) / STEP));
  let best = null;
  let bestScore = Infinity;
  for (let k = from; k <= to; k++) {
    let sum = 0;
    for (let j = 0; j < w; j++) sum += env[k + j];
    if (sum < bestScore) {
      bestScore = sum;
      best = k;
    }
  }
  return best === null ? guess : (best + w / 2) * STEP;
};

const main = () => {
  if (!existsSync(SOURCE)) {
    console.error(`  ✗ ${SOURCE} introuvable.`);
    process.exitCode = 1;
    return;
  }

  const bin = ffmpeg();
  mkdirSync(TMP, {recursive: true});
  const wav = join(TMP, 'vo.wav');
  execFileSync(bin, ['-y', '-v', 'error', '-i', SOURCE, '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', wav]);

  const {env, duration} = envelope(readFileSync(wav));
  const lines = parseVoice();
  const words = lines.map((l) => l.line.trim().split(/\s+/).length);
  const total = words.reduce((a, b) => a + b, 0);

  // Frontières proportionnelles, puis accrochées au creux le plus proche.
  const cuts = [0];
  let cumulative = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    cumulative += words[i];
    cuts.push(snap(env, (cumulative / total) * duration));
  }
  cuts.push(duration);

  console.log(`\n  Source : ${duration.toFixed(2)} s · ${total} mots · ${(total / duration).toFixed(1)} mots/s\n`);
  console.log('  #   début     fin    durée   mots   attendu   réplique');

  const jobs = [];
  lines.forEach((item, i) => {
    const start = cuts[i];
    const end = cuts[i + 1];
    const expected = (words[i] / total) * duration;
    const name = item.file.replace(/^vo\//, '');
    console.log(
      `  ${String(i + 1).padStart(2, '0')}  ${start.toFixed(2).padStart(6)}  ${end
        .toFixed(2)
        .padStart(6)}  ${(end - start).toFixed(2).padStart(6)}  ${String(words[i]).padStart(4)}   ${expected
        .toFixed(2)
        .padStart(6)}   « ${item.line} »`,
    );
    jobs.push({name, start, end});
  });

  if (DRY) {
    console.log('\n  (--dry : aucun fichier écrit)\n');
    return;
  }

  for (const job of jobs) {
    execFileSync(bin, [
      '-y', '-v', 'error',
      '-ss', job.start.toFixed(3),
      '-to', job.end.toFixed(3),
      '-i', SOURCE,
      '-codec:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-ac', '1',
      join(VO_DIR, job.name),
    ]);
  }

  rmSync(TMP, {recursive: true, force: true});
  console.log(`\n  ✓ ${jobs.length} fichiers écrits dans public/vo/`);
  console.log("  → passer VOICE_MODE à 'lines' dans src/audio/voice.ts\n");
};

main();
