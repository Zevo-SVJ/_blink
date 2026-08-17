import {spawn} from 'node:child_process';
import {existsSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
	'..',
	'..',
);

/**
 * Localise les binaires FFmpeg utilisables.
 *
 * Le projet ne déclare aucune dépendance FFmpeg : Remotion en embarque déjà un
 * (n7.1, avec les décodeurs h264 / hevc / prores dont on a besoin pour une
 * vidéo iPhone). On préfère malgré tout un FFmpeg système quand il existe, car
 * les builds complets exposent plus de filtres — mais toute la chaîne
 * d'analyse est écrite pour ne dépendre que du plus petit dénominateur commun :
 *
 *   • démux mov/mp4 + décodage h264/hevc
 *   • filtre `scale`
 *   • sortie `image2` (PNG par frame) et `image2pipe` + `rawvideo` (flux brut)
 *
 * Rien d'autre. Pas de `select`, pas de `scdet`, pas de `tile` : la détection
 * de coupes et les planches contact sont calculées côté Node.
 */

const remotionCompositorBinaries = (name) => {
	const modulesDir = path.join(PROJECT_ROOT, 'node_modules', '@remotion');
	if (!existsSync(modulesDir)) return [];
	return readdirSync(modulesDir)
		.filter((entry) => entry.startsWith('compositor-'))
		.map((entry) => path.join(modulesDir, entry, name))
		.filter((candidate) => existsSync(candidate));
};

const installerBinary = (scope, name) => {
	const dir = path.join(PROJECT_ROOT, 'node_modules', scope);
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.map((entry) => path.join(dir, entry, name))
		.filter((candidate) => existsSync(candidate));
};

const runVersion = (bin) =>
	new Promise((resolve) => {
		const child = spawn(bin, ['-hide_banner', '-version'], {stdio: ['ignore', 'pipe', 'pipe']});
		let out = '';
		child.stdout.on('data', (data) => {
			out += data.toString();
		});
		child.on('error', () => resolve(null));
		child.on('close', (code) => {
			if (code !== 0) return resolve(null);
			const first = out.split('\n')[0] ?? '';
			resolve(first.trim());
		});
	});

const firstWorking = async (candidates) => {
	for (const candidate of candidates) {
		if (!candidate) continue;
		const version = await runVersion(candidate);
		if (version) return {path: candidate, version};
	}
	return null;
};

export const resolveTools = async () => {
	const ffmpeg = await firstWorking([
		process.env.FFMPEG_PATH,
		'ffmpeg',
		...installerBinary('@ffmpeg-installer', 'ffmpeg'),
		...remotionCompositorBinaries('ffmpeg'),
	]);

	const ffprobe = await firstWorking([
		process.env.FFPROBE_PATH,
		'ffprobe',
		...installerBinary('@ffprobe-installer', 'ffprobe'),
		...remotionCompositorBinaries('ffprobe'),
	]);

	if (!ffmpeg) {
		throw new Error(
			'Aucun FFmpeg utilisable.\n' +
				'Installez-en un (macOS : `brew install ffmpeg`) ou pointez FFMPEG_PATH sur un binaire.',
		);
	}
	if (!ffprobe) {
		throw new Error(
			'Aucun ffprobe utilisable. Installez FFmpeg ou définissez FFPROBE_PATH.',
		);
	}

	return {ffmpeg, ffprobe};
};

/** Exécute un binaire et renvoie stdout en Buffer. Rejette sur code ≠ 0. */
export const run = (bin, args, {maxBuffer = 512 * 1024 * 1024} = {}) =>
	new Promise((resolve, reject) => {
		const child = spawn(bin, args, {stdio: ['ignore', 'pipe', 'pipe']});
		const chunks = [];
		let size = 0;
		let stderr = '';

		child.stdout.on('data', (data) => {
			size += data.length;
			if (size > maxBuffer) {
				child.kill('SIGKILL');
				reject(new Error(`Sortie trop volumineuse (> ${maxBuffer} octets)`));
				return;
			}
			chunks.push(data);
		});
		child.stderr.on('data', (data) => {
			stderr += data.toString();
		});
		child.on('error', reject);
		child.on('close', (code) => {
			if (code !== 0) {
				reject(
					new Error(
						`${path.basename(bin)} a échoué (code ${code})\n${stderr.trim().slice(-2000)}`,
					),
				);
				return;
			}
			resolve(Buffer.concat(chunks));
		});
	});

export const runText = async (bin, args, options) =>
	(await run(bin, args, options)).toString('utf8');

/**
 * Décode la vidéo en niveaux de gris à très basse définition, et renvoie un
 * tableau de frames brutes.
 *
 * `-f image2pipe -vcodec rawvideo` plutôt que `-f rawvideo` : le muxer
 * `rawvideo` est absent de certains builds allégés (dont celui de Remotion),
 * alors qu'`image2pipe` y est toujours présent et produit exactement le même
 * flux concaténé.
 */
export const decodeGrayFrames = async (ffmpegPath, source, width, height) => {
	const buffer = await run(ffmpegPath, [
		'-v',
		'error',
		'-i',
		source,
		'-vf',
		`scale=${width}:${height}`,
		'-f',
		'image2pipe',
		'-vcodec',
		'rawvideo',
		'-pix_fmt',
		'gray',
		'-',
	]);

	const frameSize = width * height;
	if (buffer.length === 0 || buffer.length % frameSize !== 0) {
		throw new Error(
			`Flux brut inattendu : ${buffer.length} octets pour des frames de ${frameSize} octets.\n` +
				'Le build de FFmpeg utilisé ne sait probablement pas produire de flux rawvideo.',
		);
	}

	const count = buffer.length / frameSize;
	const frames = new Array(count);
	for (let i = 0; i < count; i += 1) {
		frames[i] = buffer.subarray(i * frameSize, (i + 1) * frameSize);
	}
	return frames;
};

/** Extrait une seule image en RGB brut à un instant donné. */
export const decodeRgbAt = async (
	ffmpegPath,
	source,
	seconds,
	width,
	height,
	{filterPrefix = ''} = {},
) => {
	const filter = filterPrefix
		? `${filterPrefix},scale=${width}:${height}`
		: `scale=${width}:${height}`;

	const buffer = await run(ffmpegPath, [
		'-v',
		'error',
		'-ss',
		seconds.toFixed(3),
		'-i',
		source,
		'-frames:v',
		'1',
		'-vf',
		filter,
		'-f',
		'image2pipe',
		'-vcodec',
		'rawvideo',
		'-pix_fmt',
		'rgb24',
		'-',
	]);

	const expected = width * height * 3;
	if (buffer.length < expected) {
		throw new Error(
			`Image tronquée à ${seconds.toFixed(3)}s : ${buffer.length} octets pour ${expected} attendus.`,
		);
	}
	return buffer.subarray(0, expected);
};
