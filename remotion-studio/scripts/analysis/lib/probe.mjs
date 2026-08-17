import {statSync} from 'node:fs';
import path from 'node:path';
import {runText} from './ffmpeg.mjs';

const parseRational = (value) => {
	if (!value || typeof value !== 'string') return null;
	const [num, den] = value.split('/').map(Number);
	if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
	return num / den;
};

const readRotation = (stream) => {
	// Une vidéo iPhone est presque toujours stockée en paysage avec une matrice
	// de rotation : la vraie orientation d'affichage n'est PAS width × height.
	const sideData = stream.side_data_list ?? [];
	for (const entry of sideData) {
		if (entry.rotation !== undefined) {
			return ((Math.round(Number(entry.rotation)) % 360) + 360) % 360;
		}
	}
	const tagRotate = Number(stream.tags?.rotate);
	if (Number.isFinite(tagRotate)) return ((tagRotate % 360) + 360) % 360;
	return 0;
};

const HDR_TRANSFERS = new Set(['smpte2084', 'arib-std-b67']);

/**
 * Lit les métadonnées et signale ce qui, dans une vidéo iPhone, peut fausser
 * une analyse de motion design : rotation, HDR, fréquence variable, ralenti.
 */
export const probeVideo = async (ffprobePath, source) => {
	const raw = await runText(ffprobePath, [
		'-v',
		'error',
		'-print_format',
		'json',
		'-show_format',
		'-show_streams',
		source,
	]);

	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`ffprobe n'a pas renvoyé de JSON exploitable pour ${source}`);
	}

	const streams = parsed.streams ?? [];
	const video = streams.find((stream) => stream.codec_type === 'video');
	const audio = streams.find((stream) => stream.codec_type === 'audio');

	if (!video) {
		throw new Error(
			`Aucune piste vidéo dans ${path.basename(source)} — ce n'est pas une vidéo exploitable.`,
		);
	}

	const rotation = readRotation(video);
	const swapped = rotation === 90 || rotation === 270;
	const storedWidth = Number(video.width);
	const storedHeight = Number(video.height);

	const avgFps = parseRational(video.avg_frame_rate);
	const rFps = parseRational(video.r_frame_rate);
	const fps = avgFps && avgFps > 0 ? avgFps : rFps;

	const duration =
		Number(parsed.format?.duration) ||
		Number(video.duration) ||
		(fps && Number(video.nb_frames) ? Number(video.nb_frames) / fps : 0);

	if (!Number.isFinite(duration) || duration <= 0) {
		throw new Error(
			`Durée illisible pour ${path.basename(source)} — fichier tronqué ou corrompu ?`,
		);
	}

	const frameCount = Number(video.nb_frames) || Math.round(duration * (fps ?? 0));

	const warnings = [];
	if (rotation !== 0) {
		warnings.push(
			`Rotation ${rotation}° dans les métadonnées : l'affichage réel est ${
				swapped ? storedHeight : storedWidth
			}×${swapped ? storedWidth : storedHeight}. FFmpeg applique la rotation automatiquement à l'extraction.`,
		);
	}
	if (HDR_TRANSFERS.has(video.color_transfer)) {
		warnings.push(
			`Vidéo HDR (color_transfer = ${video.color_transfer}). Les frames extraites paraîtront délavées sans tone mapping : utilisez --tonemap.`,
		);
	}
	if (avgFps && rFps && Math.abs(avgFps - rFps) / rFps > 0.05) {
		warnings.push(
			`Fréquence variable probable (avg ${avgFps.toFixed(2)} vs base ${rFps.toFixed(2)} fps) : les timings mesurés seront approximatifs.`,
		);
	}
	if (fps && fps > 90) {
		warnings.push(
			`${Math.round(fps)} fps : probable ralenti iPhone. Le rythme perçu ne correspondra pas au rythme réel des frames.`,
		);
	}
	if (!audio) {
		warnings.push("Pas de piste audio : impossible de caler l'analyse sur un rythme sonore.");
	}

	return {
		source,
		fileName: path.basename(source),
		fileSize: statSync(source).size,
		container: parsed.format?.format_name ?? 'inconnu',
		codec: video.codec_name ?? 'inconnu',
		profile: video.profile ?? null,
		pixelFormat: video.pix_fmt ?? null,
		colorTransfer: video.color_transfer ?? null,
		colorPrimaries: video.color_primaries ?? null,
		isHdr: HDR_TRANSFERS.has(video.color_transfer),
		storedWidth,
		storedHeight,
		displayWidth: swapped ? storedHeight : storedWidth,
		displayHeight: swapped ? storedWidth : storedHeight,
		rotation,
		fps: fps ?? null,
		baseFps: rFps ?? null,
		duration,
		frameCount,
		hasAudio: Boolean(audio),
		audioCodec: audio?.codec_name ?? null,
		bitRate: Number(parsed.format?.bit_rate) || null,
		warnings,
	};
};

const formatBytes = (bytes) => {
	if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 ** 3).toFixed(2)} Go`;
	if (bytes > 1024 * 1024) return `${(bytes / 1024 ** 2).toFixed(1)} Mo`;
	return `${(bytes / 1024).toFixed(0)} Ko`;
};

export const formatProbe = (info) => {
	const lines = [
		`  Fichier      ${info.fileName}  (${formatBytes(info.fileSize)})`,
		`  Conteneur    ${info.container}`,
		`  Codec        ${info.codec}${info.profile ? ` / ${info.profile}` : ''} — ${info.pixelFormat ?? '?'}`,
		`  Définition   ${info.displayWidth}×${info.displayHeight}${
			info.rotation ? ` (stockée ${info.storedWidth}×${info.storedHeight}, rotation ${info.rotation}°)` : ''
		}`,
		`  Cadence      ${info.fps ? info.fps.toFixed(3) : '?'} fps`,
		`  Durée        ${info.duration.toFixed(3)} s  (~${info.frameCount} frames)`,
		`  Audio        ${info.hasAudio ? info.audioCodec : 'aucun'}`,
	];
	if (info.isHdr) lines.push(`  HDR          oui (${info.colorTransfer})`);
	return lines.join('\n');
};
