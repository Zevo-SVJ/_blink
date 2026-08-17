#!/usr/bin/env node
/**
 * SYNTHÈSE DES EFFETS SONORES
 *
 * Génère les huit SFX de la piste Blink dans `public/sfx/`, sans aucune
 * dépendance et sans aucun téléchargement.
 *
 * Pourquoi synthétiser plutôt que sourcer des fichiers :
 *
 *   • **licence** — un son fabriqué ici n'a pas d'ayant droit. Un pack trouvé
 *     en ligne en a toujours un, et une vidéo produit ne peut pas s'appuyer sur
 *     un fichier dont la licence n'est pas vérifiée ;
 *   • **reproductibilité** — le générateur est déterministe (PRNG à graine
 *     fixe), donc `npm run sfx` redonne exactement les mêmes octets. Un rendu
 *     est rejouable des mois plus tard sans dépendre d'un CDN ;
 *   • **taille** — les huit fichiers pèsent ensemble moins de 100 ko, donc ils
 *     peuvent être versionnés avec le code.
 *
 * Ce sont de vrais sons, pas des silences : chacun est construit à partir de sa
 * description physique (transitoire, corps, décroissance) et joue réellement au
 * rendu. Ils restent **remplaçables un pour un** — déposer un fichier du même
 * nom dans `public/sfx/` suffit, aucun code ne change.
 *
 * Usage :
 *   node scripts/sfx/build-sfx.mjs
 */

import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';

const RATE = 48000;
const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'public', 'sfx');
const TMP_DIR = join(ROOT, 'node_modules', '.cache', 'sfx');

// ─── Boîte à outils de synthèse ──────────────────────────────────────────────

/**
 * PRNG déterministe (mulberry32).
 *
 * `Math.random()` rendrait chaque exécution différente, donc chaque rendu
 * différent — exactement le défaut qu'on interdit partout ailleurs dans ce
 * projet.
 */
const rng = (seed) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const seconds = (n) => Math.round(n * RATE);

/** Décroissance exponentielle : `k` grand = extinction rapide. */
const decay = (t, k) => Math.exp(-k * t);

/** Enveloppe attaque/extinction, en secondes. */
const env = (t, attack, k) => {
	const rise = attack <= 0 ? 1 : Math.min(1, t / attack);
	return rise * decay(Math.max(0, t - attack), k);
};

/**
 * Filtre passe-bande à variable d'état (Chamberlin).
 *
 * Un passe-bas à un pôle suffirait pour assourdir, mais pas pour donner une
 * *couleur* : le balayage de fréquence d'un whoosh n'existe que si le filtre a
 * une résonance. D'où la version à variable d'état, qui en a une.
 */
const bandpass = (input, freqAt, q = 1.4) => {
	const out = new Float64Array(input.length);
	let low = 0;
	let band = 0;
	for (let i = 0; i < input.length; i++) {
		const f = 2 * Math.sin((Math.PI * Math.min(freqAt(i / RATE), RATE / 2.2)) / RATE);
		const high = input[i] - low - (1 / q) * band;
		band += f * high;
		low += f * band;
		out[i] = band;
	}
	return out;
};

const noise = (length, random) => {
	const out = new Float64Array(length);
	for (let i = 0; i < length; i++) out[i] = random() * 2 - 1;
	return out;
};

/** Normalise puis applique un gain de crête. */
const normalize = (samples, peak = 0.9) => {
	let max = 0;
	for (const s of samples) max = Math.max(max, Math.abs(s));
	if (max === 0) return samples;
	const gain = peak / max;
	for (let i = 0; i < samples.length; i++) samples[i] *= gain;
	return samples;
};

/**
 * Saturation douce.
 *
 * `tanh` arrondit les crêtes au lieu de les écrêter carrément. Sur un
 * transitoire — un clic, un impact — c'est ce qui fait la différence entre un
 * son qui claque et un son qui grésille.
 */
const saturate = (samples, drive = 1.6) => {
	for (let i = 0; i < samples.length; i++) {
		samples[i] = Math.tanh(samples[i] * drive) / Math.tanh(drive);
	}
	return samples;
};

/** Fondu de sortie court : un buffer coupé net produit un clic parasite. */
const fadeOut = (samples, ms = 6) => {
	const n = Math.min(samples.length, seconds(ms / 1000));
	for (let i = 0; i < n; i++) {
		samples[samples.length - n + i] *= 1 - i / n;
	}
	return samples;
};

const writeWav = (path, samples) => {
	const data = Buffer.alloc(samples.length * 2);
	for (let i = 0; i < samples.length; i++) {
		const v = Math.max(-1, Math.min(1, samples[i]));
		data.writeInt16LE(Math.round(v * 32767), i * 2);
	}

	const header = Buffer.alloc(44);
	header.write('RIFF', 0);
	header.writeUInt32LE(36 + data.length, 4);
	header.write('WAVE', 8);
	header.write('fmt ', 12);
	header.writeUInt32LE(16, 16);
	header.writeUInt16LE(1, 20); // PCM
	header.writeUInt16LE(1, 22); // mono
	header.writeUInt32LE(RATE, 24);
	header.writeUInt32LE(RATE * 2, 28);
	header.writeUInt16LE(2, 32);
	header.writeUInt16LE(16, 34);
	header.write('data', 36);
	header.writeUInt32LE(data.length, 40);

	mkdirSync(dirname(path), {recursive: true});
	writeFileSync(path, Buffer.concat([header, data]));
};

// ─── Les huit sons ───────────────────────────────────────────────────────────
//
// Chacun est décrit par sa physique, pas par un preset : un transitoire (ce qui
// frappe), un corps (ce qui sonne), une extinction (ce qui reste). C'est cette
// décomposition qui rend les sons cohérents entre eux — ils partagent la même
// grammaire, donc ils appartiennent au même film.

const sounds = {
	/** Bip d'interface : deux harmoniques, extinction nette. */
	'beep.mp3': () => {
		const n = seconds(0.1);
		const out = new Float64Array(n);
		for (let i = 0; i < n; i++) {
			const t = i / RATE;
			const e = env(t, 0.002, 46);
			out[i] = (Math.sin(2 * Math.PI * 1180 * t) + 0.3 * Math.sin(2 * Math.PI * 2360 * t)) * e;
		}
		return fadeOut(normalize(out, 0.8));
	},

	/**
	 * Déclencheur d'appareil photo : deux lamelles, pas une.
	 * L'écart de 42 ms entre les deux claquements est ce qui le rend
	 * identifiable — un seul clic serait un bouton.
	 */
	'camera_shutter.mp3': () => {
		const n = seconds(0.16);
		const random = rng(11);
		const raw = noise(n, random);
		const filtered = bandpass(raw, () => 3200, 0.9);
		const out = new Float64Array(n);
		const clicks = [0, 0.042];
		for (let i = 0; i < n; i++) {
			const t = i / RATE;
			let amp = 0;
			for (const [index, at] of clicks.entries()) {
				if (t >= at) amp += decay(t - at, 190) * (index === 0 ? 1 : 0.75);
			}
			out[i] = filtered[i] * amp + Math.sin(2 * Math.PI * 160 * t) * decay(t, 120) * 0.25;
		}
		return fadeOut(saturate(normalize(out, 0.85), 1.8));
	},

	/** Clic mécanique : un transitoire large, un corps métallique bref. */
	'click_mechanic.mp3': () => {
		const n = seconds(0.07);
		const random = rng(23);
		const raw = noise(n, random);
		const filtered = bandpass(raw, () => 2600, 1.1);
		const out = new Float64Array(n);
		for (let i = 0; i < n; i++) {
			const t = i / RATE;
			out[i] =
				filtered[i] * decay(t, 240) +
				Math.sin(2 * Math.PI * 1900 * t) * decay(t, 180) * 0.4 +
				Math.sin(2 * Math.PI * 420 * t) * decay(t, 90) * 0.2;
		}
		return fadeOut(saturate(normalize(out, 0.88), 2));
	},

	/**
	 * SOUFFLE D'AIR.
	 *
	 * Remplace le whoosh de la première version, qui était trop présent : sur
	 * dix raccords, un souffle agressif devient un tic, et un tic entendu dix
	 * fois en trente-huit secondes finit par être la seule chose qu'on entend.
	 *
	 * Trois changements par rapport au whoosh, et chacun compte :
	 *
	 *   • **plus de résonance** — Q à 0,5 au lieu de 1,7. Le filtre colore sans
	 *     siffler, donc le son n'a plus de « pointe » qui accroche l'oreille ;
	 *   • **spectre bas** — le balayage plafonne à 1 100 Hz au lieu de 4 600. Ce
	 *     sont les aigus qui rendent un souffle agressif, pas son volume ;
	 *   • **attaque lente** — l'enveloppe monte en `sin³` sur 40 % de la durée.
	 *     Un souffle qui démarre net *claque* ; celui-ci arrive.
	 *
	 * Le résultat est un mouvement d'air, pas un effet. À 0,14 de volume il se
	 * sent sans se remarquer — ce qui est exactement le rôle d'un son de raccord
	 * sous une voix off.
	 */
	'soft_air_swipe.mp3': () => {
		const n = seconds(0.38);
		const random = rng(37);
		const raw = noise(n, random);
		// Balayage doux et resserré : 260 Hz → 1 100 Hz → 320 Hz.
		const sweep = (t) => 260 + Math.sin(Math.min(1, t / 0.36) * Math.PI) * 840;
		const filtered = bandpass(raw, sweep, 0.5);
		const out = new Float64Array(n);
		let low = 0;
		for (let i = 0; i < n; i++) {
			const t = i / RATE;
			// Passe-bas supplémentaire à un pôle : coupe ce qui reste au-dessus de
			// ~2,4 kHz, la bande où un souffle devient sifflant.
			low += (filtered[i] - low) * 0.28;
			const bell = Math.pow(Math.sin(Math.min(1, t / 0.38) * Math.PI), 3);
			out[i] = low * bell;
		}
		return fadeOut(normalize(out, 0.62), 30);
	},

	/**
	 * Impact grave : une sinusoïde qui **descend** en fréquence.
	 * Une note grave tenue serait une basse ; c'est la chute de hauteur qui se
	 * lit comme un choc.
	 */
	'impact_thud.mp3': () => {
		const n = seconds(0.34);
		const random = rng(53);
		const raw = noise(n, random);
		const click = bandpass(raw, () => 1800, 0.8);
		const out = new Float64Array(n);
		let phase = 0;
		for (let i = 0; i < n; i++) {
			const t = i / RATE;
			const freq = 38 + 82 * decay(t, 22);
			phase += (2 * Math.PI * freq) / RATE;
			out[i] =
				Math.sin(phase) * env(t, 0.001, 11) +
				click[i] * decay(t, 320) * 0.35 +
				Math.sin(phase * 2) * decay(t, 40) * 0.12;
		}
		return fadeOut(saturate(normalize(out, 0.95), 1.4), 25);
	},

	/**
	 * Trait de feutre : du bruit haché par une modulation dentelée.
	 * La modulation à ~62 Hz imite l'irrégularité du grain de papier ; sans
	 * elle, le son serait un simple souffle.
	 */
	'marker_scratch.mp3': () => {
		const n = seconds(0.3);
		const random = rng(71);
		const raw = noise(n, random);
		const filtered = bandpass(raw, (t) => 1500 + t * 2600, 1.2);
		const out = new Float64Array(n);
		for (let i = 0; i < n; i++) {
			const t = i / RATE;
			const grain = 0.55 + 0.45 * ((t * 62) % 1);
			out[i] = filtered[i] * grain * env(t, 0.006, 9);
		}
		return fadeOut(saturate(normalize(out, 0.82), 1.5), 18);
	},

	/** Pop de carte : une hauteur qui monte très vite, sur 70 ms. */
	'card_pop.mp3': () => {
		const n = seconds(0.08);
		const random = rng(89);
		const raw = noise(n, random);
		const air = bandpass(raw, () => 5200, 0.7);
		const out = new Float64Array(n);
		let phase = 0;
		for (let i = 0; i < n; i++) {
			const t = i / RATE;
			const freq = 380 + 620 * Math.min(1, t / 0.045);
			phase += (2 * Math.PI * freq) / RATE;
			out[i] = Math.sin(phase) * env(t, 0.001, 52) + air[i] * decay(t, 280) * 0.3;
		}
		return fadeOut(normalize(out, 0.85));
	},

	/**
	 * Rouleau de compteur : vingt-quatre micro-clics dont la hauteur monte.
	 * La montée de hauteur est ce qui donne la sensation d'accélération, alors
	 * que l'espacement, lui, se resserre légèrement.
	 */
	'count_up_tick.mp3': () => {
		const n = seconds(0.78);
		const out = new Float64Array(n);
		const count = 24;
		let at = 0;
		for (let k = 0; k < count; k++) {
			const progress = k / (count - 1);
			const freq = 2100 + progress * 1500;
			const start = Math.round(at * RATE);
			const length = seconds(0.03);
			for (let i = 0; i < length && start + i < n; i++) {
				const t = i / RATE;
				out[start + i] +=
					Math.sin(2 * Math.PI * freq * t) * decay(t, 260) * (0.5 + progress * 0.5);
			}
			// Les intervalles se resserrent : 38 ms au début, 22 ms à la fin.
			at += 0.038 - progress * 0.016;
		}
		return fadeOut(normalize(out, 0.7));
	},
};

// ─── Encodage ────────────────────────────────────────────────────────────────

const ffmpeg = () => {
	const candidates = [
		join(ROOT, 'node_modules', '@remotion', 'compositor-linux-x64-gnu', 'ffmpeg'),
		join(ROOT, 'node_modules', '@remotion', 'compositor-darwin-arm64', 'ffmpeg'),
		join(ROOT, 'node_modules', '@remotion', 'compositor-darwin-x64', 'ffmpeg'),
		join(ROOT, 'node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffmpeg.exe'),
		'ffmpeg',
	];
	for (const candidate of candidates) {
		if (candidate === 'ffmpeg' || existsSync(candidate)) return candidate;
	}
	throw new Error('Aucun ffmpeg utilisable trouvé.');
};

const main = () => {
	const bin = ffmpeg();
	mkdirSync(OUT_DIR, {recursive: true});
	mkdirSync(TMP_DIR, {recursive: true});

	for (const [name, build] of Object.entries(sounds)) {
		const wav = join(TMP_DIR, name.replace(/\.mp3$/, '.wav'));
		const mp3 = join(OUT_DIR, name);
		writeWav(wav, build());
		execFileSync(bin, [
			'-y',
			'-v', 'error',
			'-i', wav,
			'-codec:a', 'libmp3lame',
			'-b:a', '128k',
			'-ar', '48000',
			'-ac', '1',
			mp3,
		]);
		console.log(`✓ ${name}`);
	}

	rmSync(TMP_DIR, {recursive: true, force: true});
	console.log(`\n${Object.keys(sounds).length} fichiers écrits dans public/sfx/`);
};

main();
