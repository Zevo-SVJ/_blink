#!/usr/bin/env node
/**
 * PLAN DE VOIX OFF
 *
 * Imprime le script prêt à enregistrer, vérifie que chaque réplique tient avant
 * la suivante, et signale quels fichiers manquent encore dans `public/vo/`.
 *
 * Pourquoi un script plutôt qu'un document : les positions des répliques sont
 * **dérivées du manifeste**, pas écrites à la main. Allonger un plan de dix
 * frames décale automatiquement tous les timecodes imprimés ici, donc le plan
 * d'enregistrement ne peut jamais être en retard sur le montage.
 *
 * Usage :
 *   node scripts/vo/index.mjs            plan complet + état des fichiers
 *   node scripts/vo/index.mjs --srt      exporte un .srt pour caler à l'oreille
 */

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const ROOT = process.cwd();
const FPS = 60;
const VO_DIR = join(ROOT, 'public', 'vo');

// Le manifeste et la partition vocale sont du TypeScript : plutôt que d'ajouter
// un transpileur pour deux tableaux, on les lit tels quels. C'est fragile si la
// forme change, donc l'extraction est explicite et échoue bruyamment.
const readSource = (path) => readFileSync(join(ROOT, path), 'utf8');

const parseSpans = () => {
	const src = readSource('src/compositions/blink/manifest.ts');
	const block = src.slice(src.indexOf('BLINK_SPANS = {'), src.indexOf('} as const;'));
	const spans = [];
	for (const match of block.matchAll(/^\t(\w+):\s*(\d+),/gm)) {
		spans.push([match[1], Number(match[2])]);
	}
	if (spans.length === 0) throw new Error('BLINK_SPANS introuvable.');
	return spans;
};

const parseVoice = () => {
	const src = readSource('src/audio/voice.ts');
	const block = src.slice(src.indexOf('export const voice: VoiceLine[] = ['));
	const lines = [];
	const re =
		/scene:\s*'(\w+)',\s*\n\s*at:\s*(\d+),\s*\n\s*file:\s*'([^']+)',\s*\n\s*line:\s*'((?:[^'\\]|\\.)*)'/g;
	for (const match of block.matchAll(re)) {
		lines.push({
			scene: match[1],
			at: Number(match[2]),
			file: match[3],
			line: match[4].replace(/\\'/g, "'"),
		});
	}
	if (lines.length === 0) throw new Error('Partition vocale introuvable.');
	return lines;
};

const parseSegments = () => {
  const src = readSource('src/audio/voice.ts');
  const start = src.indexOf('export const voiceSegments: VoiceSegment[] = [');
  if (start === -1) return [];
  const block = src.slice(start, src.indexOf('];', start));
  const re =
    /from:\s*([\d.]+),\s*\n\s*to:\s*([\d.]+),\s*\n\s*at:\s*([\d.]+),\s*\n\s*said:\s*'((?:[^'\\]|\\.)*)'/g;
  const out = [];
  for (const m of block.matchAll(re)) {
    out.push({
      from: Number(m[1]),
      to: Number(m[2]),
      at: Number(m[3]),
      said: m[4].replace(/\\'/g, "'"),
    });
  }
  return out;
};

const starts = () => {
	const map = {};
	let cursor = 0;
	for (const [id, span] of parseSpans()) {
		map[id] = cursor;
		cursor += span;
	}
	return {map, total: cursor};
};

const timecode = (frames) => {
	const seconds = frames / FPS;
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	const cs = Math.round((seconds % 1) * 100);
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};

const srtStamp = (frames) => {
	const total = frames / FPS;
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = Math.floor(total % 60);
	const ms = Math.round((total % 1) * 1000);
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};

const WORDS_PER_SECOND = 2.5;
const spoken = (line) => Math.ceil((line.trim().split(/\s+/).length / WORDS_PER_SECOND) * FPS);

const main = () => {
	const {map, total} = starts();
	const lines = parseVoice()
		.map((item) => ({...item, start: map[item.scene] + item.at}))
		.sort((a, b) => a.start - b.start);

	console.log('\n  PLAN DE VOIX OFF — Blink');
	console.log(`  ${lines.length} répliques · film de ${timecode(total)} (${total} frames à ${FPS} fps)\n`);
	console.log('  ┌ profil de voix ────────────────────────────────────────────────');
	console.log('  │ Français natif · homme 25-30 ans');
	console.log('  │ Ton : direct, conversationnel, sûr de lui. Pas publicitaire.');
	console.log('  │ Débit : rapide mais entièrement articulé.');
	console.log('  │ ElevenLabs · Stability 0.45 · Similarity 0.80 · Style 0.10');
	console.log('  └────────────────────────────────────────────────────────────────\n');

	let failures = 0;
	let missing = 0;

	lines.forEach((item, index) => {
		const length = spoken(item.line);
		const next = lines[index + 1];
		const room = (next ? next.start : total) - item.start;
		const fits = length + 4 <= room;
		if (!fits) failures += 1;

		const present = existsSync(join(VO_DIR, item.file.replace(/^vo\//, '')));
		if (!present) missing += 1;

		console.log(`  ${String(index + 1).padStart(2, '0')}. ${timecode(item.start)}  ${item.scene}`);
		console.log(`      « ${item.line} »`);
		console.log(
			`      ${item.file}  ·  ~${(length / FPS).toFixed(1)} s parlées / ${(room / FPS).toFixed(1)} s disponibles  ${
				fits ? '✓' : '✗ TROP LONGUE'
			}${present ? '  · fichier présent' : '  · fichier manquant'}`,
		);
		console.log('');
	});

	if (process.argv.includes('--srt')) {
		mkdirSync(VO_DIR, {recursive: true});
		const srt = lines
			.map((item, index) => {
				const end = item.start + spoken(item.line);
				return `${index + 1}\n${srtStamp(item.start)} --> ${srtStamp(end)}\n${item.line}\n`;
			})
			.join('\n');
		const out = join(VO_DIR, 'script.srt');
		writeFileSync(out, srt);
		console.log(`  → ${out}\n`);
	}

	const segments = parseSegments();
	if (segments.length > 0) {
		console.log('  ┌ CALAGE EN SERVICE — mode « segments » ──────────────────────────');
		console.log('  │ Le fichier unique est lu par tranches : trimBefore / trimAfter');
		console.log('  │ délimitent l\'intervalle, <Sequence from> décide où il tombe.');
		console.log('  └────────────────────────────────────────────────────────────────\n');
		console.log('  #   dans le fichier   →   dans le film      durée');
		let clash = 0;
		segments.forEach((seg, i) => {
			const length = seg.to - seg.from;
			const end = seg.at + length;
			const next = segments[i + 1];
			const limit = next ? next.at : total / FPS;
			const ok = end <= limit + 0.001;
			if (!ok) clash += 1;
			console.log(
				`  ${String(i + 1).padStart(2, '0')}  ${seg.from.toFixed(2).padStart(6)} → ${seg.to
					.toFixed(2)
					.padStart(6)}   →   ${seg.at.toFixed(2).padStart(6)} → ${end
					.toFixed(2)
					.padStart(6)}   ${length.toFixed(2).padStart(5)} s  ${ok ? '✓' : '✗ CHEVAUCHE'}`,
			);
			console.log(`      « ${seg.said} »\n`);
		});
		const last = segments[segments.length - 1];
		const covered = segments.reduce((sum, seg) => sum + (seg.to - seg.from), 0);
		console.log(
			`  narration de ${segments[0].at.toFixed(2)} s à ${(last.at + (last.to - last.from)).toFixed(2)} s` +
				` · ${covered.toFixed(2)} s de parole sur ${(total / FPS).toFixed(2)} s de film`,
		);
		console.log(
			clash === 0
				? '  ✓ Aucune tranche n\'en recouvre une autre.\n'
				: `  ✗ ${clash} chevauchement(s) — corriger la table dans src/audio/voice.ts.\n`,
		);
		if (clash > 0) process.exitCode = 1;
	}

	console.log(
		failures === 0
			? '  ✓ Toutes les répliques tiennent dans leur fenêtre.'
			: `  ✗ ${failures} réplique(s) trop longue(s) — raccourcir avant d'enregistrer.`,
	);
	console.log(
		missing === 0
			? '  ✓ Tous les fichiers sont là. Passer VOICE_ENABLED à true dans src/audio/voice.ts.'
			: `  · ${missing} fichier(s) à déposer dans public/vo/ (mode « lines »),\n    ou un seul public/vo/voiceover.mp3 (mode « single », celui par défaut).`,
	);
	console.log('');

	if (failures > 0) process.exitCode = 1;
};

main();
