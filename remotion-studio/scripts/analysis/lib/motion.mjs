/**
 * Analyse du mouvement à partir des frames décodées en niveaux de gris.
 *
 * Tout est calculé ici plutôt que délégué aux filtres `select` / `scdet` de
 * FFmpeg, pour trois raisons :
 *   • ces filtres sont absents de certains builds (dont celui de Remotion) ;
 *   • les seuils s'adaptent au bruit réel de la vidéo au lieu d'être fixes ;
 *   • on distingue une coupe franche d'une transition animée — distinction
 *     essentielle quand l'objectif est de reproduire un langage de transition.
 */

const median = (values) => {
	if (values.length === 0) return 0;
	const sorted = Float64Array.from(values).sort();
	const middle = sorted.length >> 1;
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
};

const percentile = (values, p) => {
	if (values.length === 0) return 0;
	const sorted = Float64Array.from(values).sort();
	const index = Math.min(
		sorted.length - 1,
		Math.max(0, Math.round((p / 100) * (sorted.length - 1))),
	);
	return sorted[index];
};

/** Différence moyenne absolue entre deux frames, normalisée sur [0, 1]. */
const frameDelta = (a, b) => {
	let total = 0;
	for (let i = 0; i < a.length; i += 1) {
		total += Math.abs(a[i] - b[i]);
	}
	return total / a.length / 255;
};

const meanLuma = (frame) => {
	let total = 0;
	for (let i = 0; i < frame.length; i += 1) total += frame[i];
	return total / frame.length / 255;
};

/**
 * Médiane glissante : le « niveau d'agitation normal » à cet instant du film.
 *
 * C'est la pièce maîtresse de la détection. Un seuil global échoue dès que la
 * vidéo alterne passages calmes et passages animés — et il rate complètement
 * les transitions *animées* d'un motion design soigné, qui étalent le
 * changement sur plusieurs frames au lieu de le concentrer sur une seule.
 * Comparer chaque frame à son voisinage résout les deux cas.
 */
const rollingMedian = (values, halfWindow) => {
	const result = new Float64Array(values.length);
	for (let i = 0; i < values.length; i += 1) {
		const start = Math.max(0, i - halfWindow);
		const end = Math.min(values.length, i + halfWindow + 1);
		result[i] = median(values.subarray(start, end));
	}
	return result;
};

export const analyzeMotion = (frames, fps, options = {}) => {
	const {
		/**
		 * Combien de fois au-dessus de l'agitation locale une frame doit se
		 * situer pour compter comme un évènement de montage.
		 */
		cutSensitivity = 6,
		/** Plancher absolu : garde-fou contre une vidéo quasi figée. */
		minCutScore = 0.0012,
		/** Écart minimal entre deux coupes, en secondes. */
		minCutGap = 0.2,
		/** Nombre maximal de pics de mouvement retenus. */
		maxMotionPeaks = 8,
		/** Demi-fenêtre de la baseline locale, en secondes. */
		baselineWindow = 1,
	} = options;

	const count = frames.length;
	const diffs = new Float64Array(Math.max(0, count - 1));
	const luma = new Float64Array(count);

	luma[0] = count > 0 ? meanLuma(frames[0]) : 0;
	for (let i = 1; i < count; i += 1) {
		diffs[i - 1] = frameDelta(frames[i - 1], frames[i]);
		luma[i] = meanLuma(frames[i]);
	}

	const med = median(diffs);
	const mad = median(Float64Array.from(diffs, (value) => Math.abs(value - med)));

	const halfWindow = Math.max(3, Math.round(baselineWindow * fps));
	const baseline = rollingMedian(diffs, halfWindow);
	const EPSILON = 1e-6;

	// Rapport à l'agitation locale : c'est ce qui décide, pas la valeur brute.
	const ratios = new Float64Array(diffs.length);
	for (let i = 0; i < diffs.length; i += 1) {
		ratios[i] = diffs[i] / Math.max(baseline[i], EPSILON);
	}

	// `diffs[i]` décrit le passage de la frame i à la frame i+1 : on rattache
	// l'évènement à la frame i+1, celle où le changement est visible.
	const candidates = [];
	for (let i = 0; i < diffs.length; i += 1) {
		if (ratios[i] < cutSensitivity) continue;
		if (diffs[i] < minCutScore) continue;
		const isLocalMax =
			(i === 0 || diffs[i] >= diffs[i - 1]) &&
			(i === diffs.length - 1 || diffs[i] >= diffs[i + 1]);
		if (isLocalMax) candidates.push(i);
	}

	const minGapFrames = Math.max(1, Math.round(minCutGap * fps));
	const cuts = [];
	for (const index of candidates) {
		const previous = cuts[cuts.length - 1];
		if (previous && index - previous.diffIndex < minGapFrames) {
			// Deux pics trop proches : on ne garde que le plus fort.
			if (diffs[index] > previous.score) {
				cuts.pop();
			} else {
				continue;
			}
		}

		// Étalement : une coupe franche tient sur 1–2 frames, une transition
		// animée reste au-dessus de son voisinage pendant plusieurs frames.
		// Le seuil d'étalement est relatif au pic ET à la baseline locale, pour
		// ne pas absorber le mouvement de la scène qui suit.
		const spreadFloor = Math.max(baseline[index] * 2, diffs[index] * 0.18);
		const maxSpread = Math.round(1.5 * fps);

		let start = index;
		while (
			start > 0 &&
			index - start < maxSpread &&
			diffs[start - 1] >= spreadFloor
		) {
			start -= 1;
		}
		let end = index;
		while (
			end < diffs.length - 1 &&
			end - index < maxSpread &&
			diffs[end + 1] >= spreadFloor
		) {
			end += 1;
		}

		const widthFrames = end - start + 1;
		cuts.push({
			diffIndex: index,
			frame: index + 1,
			time: (index + 1) / fps,
			score: diffs[index],
			/** Combien de fois au-dessus de l'agitation locale. */
			ratio: ratios[index],
			widthFrames,
			startFrame: start + 1,
			endFrame: end + 1,
			startTime: (start + 1) / fps,
			endTime: (end + 1) / fps,
			/**
			 * Classement indicatif, à confirmer à l'œil sur la planche contact.
			 * Une différence de pixels ne sait pas distinguer un changement de
			 * plan d'une animation intra-plan très énergique : le ratio les
			 * ordonne, il ne tranche pas.
			 */
			kind:
				widthFrames <= 2
					? 'rupture franche'
					: ratios[index] >= 12
						? 'transition marquée'
						: 'accent d’animation',
		});
	}

	// Plans : les segments entre deux coupes.
	const shots = [];
	const boundaries = [0, ...cuts.map((cut) => cut.frame), count - 1];
	for (let i = 0; i < boundaries.length - 1; i += 1) {
		const startFrame = boundaries[i];
		const endFrame = boundaries[i + 1];
		if (endFrame - startFrame < 2) continue;

		const slice = Array.from(
			diffs.subarray(Math.max(0, startFrame), Math.max(1, endFrame)),
		);
		shots.push({
			index: shots.length + 1,
			startFrame,
			endFrame,
			startTime: startFrame / fps,
			endTime: endFrame / fps,
			duration: (endFrame - startFrame) / fps,
			meanMotion: slice.reduce((sum, value) => sum + value, 0) / (slice.length || 1),
			peakMotion: slice.reduce((max, value) => Math.max(max, value), 0),
		});
	}

	// Pics de mouvement : fenêtres glissantes énergiques, hors zones de coupe —
	// c'est là que se joue l'animation elle-même, pas le montage.
	const windowFrames = Math.max(2, Math.round(0.25 * fps));
	const rolling = new Float64Array(Math.max(0, diffs.length - windowFrames + 1));
	for (let i = 0; i < rolling.length; i += 1) {
		let total = 0;
		for (let k = 0; k < windowFrames; k += 1) total += diffs[i + k];
		rolling[i] = total / windowFrames;
	}

	const motionFloor = percentile(rolling, 80);
	const inCutZone = (frame) =>
		cuts.some((cut) => frame >= cut.startFrame - 2 && frame <= cut.endFrame + 2);

	const motionCandidates = [];
	for (let i = 0; i < rolling.length; i += 1) {
		if (rolling[i] < motionFloor) continue;
		const centerFrame = i + Math.round(windowFrames / 2);
		if (inCutZone(centerFrame)) continue;
		motionCandidates.push({
			startFrame: i,
			endFrame: i + windowFrames,
			centerFrame,
			score: rolling[i],
		});
	}

	motionCandidates.sort((a, b) => b.score - a.score);
	const motionPeaks = [];
	for (const candidate of motionCandidates) {
		if (motionPeaks.length >= maxMotionPeaks) break;
		const tooClose = motionPeaks.some(
			(peak) => Math.abs(peak.centerFrame - candidate.centerFrame) < windowFrames * 2,
		);
		if (tooClose) continue;
		motionPeaks.push({
			...candidate,
			startTime: candidate.startFrame / fps,
			endTime: candidate.endFrame / fps,
			centerTime: candidate.centerFrame / fps,
		});
	}
	motionPeaks.sort((a, b) => a.centerFrame - b.centerFrame);

	return {
		diffs,
		luma,
		stats: {
			median: med,
			mad,
			/** Seuil représentatif, pour l'échelle du graphe uniquement : la
			 *  décision réelle se prend frame par frame sur `ratio`. */
			cutThreshold: Math.max(minCutScore, median(baseline) * cutSensitivity),
			cutSensitivity,
			motionFloor,
			meanMotion: diffs.reduce((sum, value) => sum + value, 0) / (diffs.length || 1),
			peakMotion: diffs.reduce((max, value) => Math.max(max, value), 0),
		},
		cuts,
		shots,
		motionPeaks,
	};
};

/** Sérialise le signal image par image, pour inspection dans un tableur. */
export const toCsv = (analysis, fps) => {
	const lines = ['frame,time,motion,luma'];
	for (let i = 0; i < analysis.diffs.length; i += 1) {
		const frame = i + 1;
		lines.push(
			`${frame},${(frame / fps).toFixed(4)},${analysis.diffs[i].toFixed(6)},${analysis.luma[frame].toFixed(6)}`,
		);
	}
	return lines.join('\n');
};
