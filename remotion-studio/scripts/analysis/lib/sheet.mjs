import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {decodeRgbAt} from './ffmpeg.mjs';
import {blit, createCanvas, darkenRect, drawText, encodePng} from './png.mjs';

const TONEMAP =
	'zscale=t=linear:npl=100,format=gbrpf32le,tonemap=tonemap=hable:desat=0,zscale=p=bt709:t=bt709:m=bt709:r=tv,format=yuv420p';

/**
 * Planche contact : une grille de vignettes horodatées dans une seule image.
 *
 * C'est l'outil de lecture le plus important de la chaîne. Regarder seize
 * frames côte à côte fait apparaître immédiatement le rythme, la structure des
 * plans et la trajectoire d'une transition — ce qu'une succession d'images
 * isolées ne montre jamais aussi bien.
 */
export const buildContactSheet = async (
	ffmpegPath,
	source,
	times,
	{
		outFile,
		aspect,
		columns = 4,
		tileWidth = 420,
		gap = 8,
		tonemap = false,
		title = '',
	},
) => {
	if (times.length === 0) return null;

	const tileHeight = Math.max(2, Math.round((tileWidth * aspect.height) / aspect.width / 2) * 2);
	const cols = Math.min(columns, times.length);
	const rows = Math.ceil(times.length / cols);

	const headerHeight = title ? 28 : 0;
	const canvas = createCanvas(
		cols * tileWidth + (cols + 1) * gap,
		rows * tileHeight + (rows + 1) * gap + headerHeight,
		[8, 8, 12],
	);

	if (title) drawText(canvas, title, gap, gap + 4, 2, [150, 150, 165]);

	for (const [index, time] of times.entries()) {
		const rgb = await decodeRgbAt(ffmpegPath, source, time, tileWidth, tileHeight, {
			filterPrefix: tonemap ? TONEMAP : '',
		});

		const col = index % cols;
		const row = Math.floor(index / cols);
		const x = gap + col * (tileWidth + gap);
		const y = headerHeight + gap + row * (tileHeight + gap);

		blit(canvas, rgb, tileWidth, tileHeight, x, y);

		// Étiquette incrustée : l'index et l'instant restent collés à l'image,
		// impossible de se tromper de correspondance en relisant la planche.
		const label = `#${index + 1} ${time.toFixed(2)}s`;
		const labelWidth = label.length * 4 * 2 + 8;
		darkenRect(canvas, x, y + tileHeight - 18, labelWidth, 18, 0.25);
		drawText(canvas, label, x + 4, y + tileHeight - 14, 2, [255, 255, 255]);
	}

	mkdirSync(path.dirname(outFile), {recursive: true});
	writeFileSync(outFile, encodePng(canvas.width, canvas.height, canvas.data));

	return {
		file: outFile,
		columns: cols,
		rows,
		count: times.length,
		width: canvas.width,
		height: canvas.height,
	};
};

/**
 * Courbe du signal de mouvement, avec les évènements marqués.
 * Un graphe vaut mieux qu'une colonne de nombres pour repérer d'un coup d'œil
 * le rythme d'un montage.
 */
export const buildMotionPlot = (analysis, fps, {outFile, width = 1400, height = 260}) => {
	const canvas = createCanvas(width, height, [8, 8, 12]);
	const diffs = analysis.diffs;
	if (diffs.length === 0) return null;

	const plotTop = 24;
	const plotHeight = height - plotTop - 24;
	const maxValue = Math.max(analysis.stats.peakMotion, analysis.stats.cutThreshold * 1.2, 1e-6);

	const setPixel = (x, y, color) => {
		if (x < 0 || x >= width || y < 0 || y >= height) return;
		const offset = (y * width + x) * 3;
		canvas.data[offset] = color[0];
		canvas.data[offset + 1] = color[1];
		canvas.data[offset + 2] = color[2];
	};

	// Seuil indicatif.
	const thresholdY = plotTop + plotHeight - (analysis.stats.cutThreshold / maxValue) * plotHeight;
	for (let x = 0; x < width; x += 4) {
		setPixel(x, Math.round(thresholdY), [120, 60, 90]);
		setPixel(x + 1, Math.round(thresholdY), [120, 60, 90]);
	}

	// Zones d'évènement, en fond.
	for (const cut of analysis.cuts) {
		const x0 = Math.round(((cut.startFrame - 1) / diffs.length) * width);
		const x1 = Math.round(((cut.endFrame - 1) / diffs.length) * width);
		for (let x = x0; x <= Math.max(x1, x0 + 1); x += 1) {
			for (let y = plotTop; y < plotTop + plotHeight; y += 1) {
				setPixel(x, y, cut.kind === 'rupture franche' ? [60, 24, 40] : [26, 40, 64]);
			}
		}
	}

	// Signal.
	for (let i = 0; i < diffs.length; i += 1) {
		const x = Math.round((i / diffs.length) * width);
		const value = Math.min(1, diffs[i] / maxValue);
		const barTop = plotTop + plotHeight - value * plotHeight;
		for (let y = Math.round(barTop); y < plotTop + plotHeight; y += 1) {
			setPixel(x, y, [110, 200, 240]);
		}
	}

	// Titres numériques uniquement : la police bitmap ne connaît pas l'alphabet.
	drawText(canvas, `0-${maxValue.toFixed(3)}`, 8, 6, 2, [150, 150, 165]);
	drawText(
		canvas,
		`${(diffs.length / fps).toFixed(1)}s #${analysis.cuts.length}`,
		8,
		height - 16,
		2,
		[150, 150, 165],
	);

	mkdirSync(path.dirname(outFile), {recursive: true});
	writeFileSync(outFile, encodePng(canvas.width, canvas.height, canvas.data));
	return {file: outFile, width, height};
};
