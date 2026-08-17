import {mkdirSync, readdirSync, renameSync, rmSync} from 'node:fs';
import path from 'node:path';
import {run} from './ffmpeg.mjs';

/**
 * Chaîne de tone mapping HDR → SDR.
 * Sans elle, une vidéo iPhone HDR ressort délavée et les vraies valeurs de
 * contraste — donc le rendu du motion design — sont impossibles à juger.
 */
const TONEMAP =
	'zscale=t=linear:npl=100,format=gbrpf32le,tonemap=tonemap=hable:desat=0,zscale=p=bt709:t=bt709:m=bt709:r=tv,format=yuv420p';

const buildFilter = ({width, tonemap}) => {
	const parts = [];
	if (tonemap) parts.push(TONEMAP);
	// -2 : hauteur calculée automatiquement, arrondie à un multiple de 2.
	parts.push(`scale=${width}:-2`);
	return parts.join(',');
};

const stamp = (seconds) => `${seconds.toFixed(3).replace('.', '-')}s`;

/** Instants régulièrement espacés, en évitant la toute première et dernière frame. */
export const evenlySpacedTimes = (duration, count) => {
	const times = [];
	for (let i = 0; i < count; i += 1) {
		times.push(((i + 0.5) / count) * duration);
	}
	return times;
};

/**
 * Extraction image par image, avec un appel FFmpeg par instant.
 * Plus lent qu'une rafale, mais l'horodatage de chaque fichier est exact —
 * c'est ce qu'on veut pour les frames de structure, peu nombreuses.
 */
export const extractStills = async (
	ffmpegPath,
	source,
	times,
	outDir,
	{width = 1280, tonemap = false, prefix = 'frame'} = {},
) => {
	mkdirSync(outDir, {recursive: true});
	const filter = buildFilter({width, tonemap});
	const files = [];

	for (const [index, time] of times.entries()) {
		const name = `${prefix}_${String(index + 1).padStart(3, '0')}_t${stamp(time)}.png`;
		const target = path.join(outDir, name);
		await run(ffmpegPath, [
			'-v',
			'error',
			'-ss',
			time.toFixed(3),
			'-i',
			source,
			'-frames:v',
			'1',
			'-vf',
			filter,
			'-y',
			target,
		]);
		files.push({file: target, name, time, index: index + 1});
	}

	return files;
};

/**
 * Extraction en rafale : toutes les frames natives d'un intervalle, en un seul
 * appel FFmpeg. `-vsync 0` laisse passer la cadence d'origine sans ré-échantillonner.
 *
 * Les horodatages sont reconstitués à partir de l'instant de départ et de la
 * cadence : exacts pour une vidéo à fréquence constante, approximatifs en VFR
 * (le rapport le signale quand c'est le cas).
 */
export const extractBurst = async (
	ffmpegPath,
	source,
	{start, duration, fps, outDir, prefix = 'f', width = 1280, tonemap = false, maxFrames = 32},
) => {
	mkdirSync(outDir, {recursive: true});
	const safeStart = Math.max(0, start);
	const cappedDuration = Math.min(duration, maxFrames / fps);
	const filter = buildFilter({width, tonemap});

	const pattern = path.join(outDir, `${prefix}_%03d.png`);
	await run(ffmpegPath, [
		'-v',
		'error',
		'-ss',
		safeStart.toFixed(3),
		'-i',
		source,
		'-t',
		cappedDuration.toFixed(3),
		'-vsync',
		'0',
		'-vf',
		filter,
		'-y',
		pattern,
	]);

	// Renommage a posteriori : le motif %03d ne connaît pas les timestamps.
	const produced = readdirSync(outDir)
		.filter((name) => name.startsWith(`${prefix}_`) && name.endsWith('.png'))
		.sort();

	const files = [];
	for (const [index, name] of produced.entries()) {
		const time = safeStart + index / fps;
		const finalName = `${prefix}_${String(index + 1).padStart(3, '0')}_t${stamp(time)}.png`;
		const from = path.join(outDir, name);
		const to = path.join(outDir, finalName);
		if (from !== to) renameSync(from, to);
		files.push({file: to, name: finalName, time, index: index + 1});
	}

	return files;
};

export const resetDirectory = (dir) => {
	rmSync(dir, {recursive: true, force: true});
	mkdirSync(dir, {recursive: true});
};
