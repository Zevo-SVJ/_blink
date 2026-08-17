#!/usr/bin/env node
/**
 * Chaîne d'analyse d'une vidéo de référence.
 *
 * Objectif : transformer une vidéo (typiquement filmée ou enregistrée depuis un
 * iPhone) en un jeu de frames organisé, lisible et horodaté, permettant de
 * décoder son langage de motion design avant d'en reproduire quoi que ce soit.
 *
 * Étapes :
 *   1. localiser la vidéo dans le projet ;
 *   2. vérifier format, durée, cadence, rotation, HDR ;
 *   3. mesurer le mouvement image par image et en déduire coupes et pics ;
 *   4. extraire trois niveaux de frames (structure / transitions / mouvement) ;
 *   5. produire des planches contact et un rapport.
 *
 * Aucune animation du projet n'est touchée : cet outil ne fait que lire.
 *
 * Usage :
 *   node scripts/analysis/index.mjs --find
 *   node scripts/analysis/index.mjs reference/ma-video.mov --probe
 *   node scripts/analysis/index.mjs reference/ma-video.mov
 */
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeGrayFrames, resolveTools} from './lib/ffmpeg.mjs';
import {evenlySpacedTimes, extractBurst, extractStills, resetDirectory} from './lib/extract.mjs';
import {findCandidates, searchRoots, slugify} from './lib/find.mjs';
import {analyzeMotion, toCsv} from './lib/motion.mjs';
import {formatProbe, probeVideo} from './lib/probe.mjs';
import {buildContactSheet, buildMotionPlot} from './lib/sheet.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const parseArgs = (argv) => {
	const options = {
		find: false,
		probe: false,
		structure: 16,
		width: 1280,
		tonemap: false,
		sensitivity: 6,
		maxMotion: 6,
		preRoll: 5,
		postRoll: 10,
		out: null,
		keep: false,
	};
	const positional = [];

	for (const arg of argv) {
		if (!arg.startsWith('--')) {
			positional.push(arg);
			continue;
		}
		const [flag, value] = arg.slice(2).split('=');
		switch (flag) {
			case 'find':
				options.find = true;
				break;
			case 'probe':
				options.probe = true;
				break;
			case 'tonemap':
				options.tonemap = true;
				break;
			case 'keep':
				options.keep = true;
				break;
			case 'structure':
				options.structure = Number(value);
				break;
			case 'width':
				options.width = Number(value);
				break;
			case 'sensitivity':
				options.sensitivity = Number(value);
				break;
			case 'max-motion':
				options.maxMotion = Number(value);
				break;
			case 'pre-roll':
				options.preRoll = Number(value);
				break;
			case 'post-roll':
				options.postRoll = Number(value);
				break;
			case 'out':
				options.out = value;
				break;
			default:
				throw new Error(`Option inconnue : --${flag}`);
		}
	}

	return {options, positional};
};

const formatSize = (bytes) =>
	bytes > 1024 * 1024
		? `${(bytes / 1024 ** 2).toFixed(1)} Mo`
		: `${(bytes / 1024).toFixed(0)} Ko`;

const printCandidates = (candidates) => {
	if (candidates.length === 0) {
		console.log('Aucune vidéo trouvée dans les emplacements balayés :');
		for (const root of searchRoots(PROJECT_ROOT)) console.log(`  · ${root}`);
		console.log(
			`\nDéposez le fichier dans ${path.join(PROJECT_ROOT, 'reference')}/ puis relancez.`,
		);
		return;
	}

	console.log(`${candidates.length} vidéo(s) trouvée(s), la plus récente en premier :\n`);
	for (const [index, candidate] of candidates.entries()) {
		const age = (Date.now() - candidate.mtime) / 1000;
		const ageLabel =
			age < 90 ? `il y a ${Math.round(age)} s` : `il y a ${Math.round(age / 60)} min`;
		console.log(
			`  ${index + 1}. ${candidate.file}\n     ${formatSize(candidate.size)} — modifiée ${ageLabel}`,
		);
	}
};

const writeReport = (context) => {
	const {info, analysis, outDir, levels, sheets, tools, options} = context;
	const rel = (file) => (file ? path.relative(outDir, file) : '—');

	const lines = [];
	lines.push(`# Analyse — ${info.fileName}`, '');
	lines.push(`Généré le ${new Date().toISOString()}`, '');

	lines.push('## 1. Format', '');
	lines.push('```');
	lines.push(formatProbe(info));
	lines.push('```', '');
	if (info.warnings.length > 0) {
		lines.push('**Points d’attention**', '');
		for (const warning of info.warnings) lines.push(`- ${warning}`);
		lines.push('');
	}

	lines.push('## 2. Signal de mouvement', '');
	lines.push(
		`Mesuré sur des frames décimées en niveaux de gris : différence moyenne absolue entre images consécutives, normalisée sur [0, 1].`,
		'',
	);
	lines.push('| Indicateur | Valeur |');
	lines.push('| --- | --- |');
	lines.push(`| Médiane | ${analysis.stats.median.toFixed(4)} |`);
	lines.push(`| Écart médian absolu | ${analysis.stats.mad.toFixed(4)} |`);
	lines.push(`| Seuil de coupe retenu | ${analysis.stats.cutThreshold.toFixed(4)} |`);
	lines.push(`| Mouvement moyen | ${analysis.stats.meanMotion.toFixed(4)} |`);
	lines.push(`| Pic de mouvement | ${analysis.stats.peakMotion.toFixed(4)} |`);
	lines.push('', `Courbe : \`${rel(sheets.plot?.file)}\``, '');

	lines.push('## 3. Évènements', '');
	lines.push(
		`${analysis.cuts.length} évènement(s) retenu(s) : les frames dont l'agitation dépasse d'au moins ${analysis.stats.cutSensitivity}× celle de leur voisinage immédiat.`,
		'',
	);
	lines.push(
		'> Le **ratio** est la mesure qui discrimine. Un changement de plan et une animation intra-plan très énergique se ressemblent au niveau des pixels : le classement ci-dessous ordonne les candidats, il ne les tranche pas. La planche contact de chaque évènement permet de conclure.',
		'',
	);
	if (analysis.cuts.length > 0) {
		lines.push('| # | Instant | Ratio | Profil | Étalement | Score | Frames |');
		lines.push('| --- | --- | --- | --- | --- | --- | --- |');
		for (const [index, cut] of analysis.cuts.entries()) {
			const level = levels.transitions[index];
			lines.push(
				`| ${index + 1} | ${cut.time.toFixed(3)} s | ${cut.ratio.toFixed(1)}× | ${cut.kind} | ${cut.widthFrames} frame(s) | ${cut.score.toFixed(4)} | ${level ? level.files.length : 0} |`,
			);
		}
		lines.push('');

		const strongest = [...analysis.cuts].sort((a, b) => b.ratio - a.ratio).slice(0, 3);
		lines.push(
			`Les plus marqués : ${strongest
				.map((cut) => `${cut.time.toFixed(2)} s (${cut.ratio.toFixed(1)}×)`)
				.join(', ')}.`,
			'',
		);
	}

	lines.push('### Segments entre évènements', '');
	lines.push('| # | Début | Fin | Durée | Mouvement moyen |');
	lines.push('| --- | --- | --- | --- | --- |');
	for (const shot of analysis.shots) {
		lines.push(
			`| ${shot.index} | ${shot.startTime.toFixed(2)} s | ${shot.endTime.toFixed(2)} s | ${shot.duration.toFixed(2)} s | ${shot.meanMotion.toFixed(4)} |`,
		);
	}
	lines.push('');

	lines.push('## 4. Frames extraites', '');
	lines.push(`### Niveau 1 — structure (${levels.structure.files.length} frames)`, '');
	lines.push(
		`Réparties régulièrement sur toute la durée, pour lire la structure d'ensemble.`,
		'',
	);
	lines.push(`- Dossier : \`${rel(levels.structure.dir)}\``);
	lines.push(`- Planche : \`${rel(sheets.structure?.file)}\``, '');

	lines.push(`### Niveau 2 — transitions (${levels.transitions.length} rafales)`, '');
	lines.push(
		`Autour de chaque évènement : ${options.preRoll} frames avant le début de l'étalement, ${options.postRoll} après sa fin, à la cadence native. C'est ce niveau qui permet de relever une courbe d'accélération frame par frame.`,
		'',
	);
	for (const [index, level] of levels.transitions.entries()) {
		const cut = analysis.cuts[index];
		lines.push(
			`- **Évènement ${index + 1}** — ${cut.time.toFixed(3)} s, ${cut.ratio.toFixed(1)}×, ${cut.kind} — \`${rel(level.dir)}\` (${level.files.length} frames), planche \`${rel(sheets.transitions[index]?.file)}\``,
		);
	}
	lines.push('');

	lines.push(`### Niveau 3 — mouvement fort (${levels.motion.length} rafales)`, '');
	lines.push(
		`Fenêtres les plus énergiques hors zones de coupe : c'est l'animation elle-même, pas le montage.`,
		'',
	);
	for (const [index, level] of levels.motion.entries()) {
		const peak = analysis.motionPeaks[index];
		lines.push(
			`- **Pic ${index + 1}** — centré à ${peak.centerTime.toFixed(3)} s (score ${peak.score.toFixed(4)}) — \`${rel(level.dir)}\` (${level.files.length} frames), planche \`${rel(sheets.motion[index]?.file)}\``,
		);
	}
	lines.push('');

	lines.push('## 5. Reproductibilité', '');
	lines.push('```');
	lines.push(`ffmpeg   ${tools.ffmpeg.path}`);
	lines.push(`         ${tools.ffmpeg.version}`);
	lines.push(`ffprobe  ${tools.ffprobe.path}`);
	lines.push(`         ${tools.ffprobe.version}`);
	lines.push('```', '');
	if (info.warnings.some((warning) => warning.includes('Fréquence variable'))) {
		lines.push(
			'> Cadence variable détectée : les horodatages des rafales sont reconstitués à partir de la cadence moyenne et peuvent dériver de quelques millisecondes.',
			'',
		);
	}

	return lines.join('\n');
};

const main = async () => {
	const {options, positional} = parseArgs(process.argv.slice(2));

	console.log('▸ Recherche des binaires FFmpeg…');
	const tools = await resolveTools();
	console.log(`  ffmpeg   ${tools.ffmpeg.path}`);
	console.log(`           ${tools.ffmpeg.version}`);
	console.log(`  ffprobe  ${tools.ffprobe.path}`);
	console.log(`           ${tools.ffprobe.version}\n`);

	const candidates = findCandidates(PROJECT_ROOT);

	if (options.find) {
		printCandidates(candidates);
		return;
	}

	let source = positional[0];
	if (!source) {
		if (candidates.length === 0) {
			printCandidates(candidates);
			process.exitCode = 1;
			return;
		}
		source = candidates[0].file;
		console.log(`▸ Aucun fichier précisé — sélection automatique du plus récent :\n  ${source}\n`);
	}

	source = path.resolve(source);
	if (!existsSync(source)) {
		throw new Error(`Fichier introuvable : ${source}`);
	}

	console.log('▸ Vérification du format…');
	const info = await probeVideo(tools.ffprobe.path, source);
	console.log(formatProbe(info));
	if (info.warnings.length > 0) {
		console.log('');
		for (const warning of info.warnings) console.log(`  ⚠ ${warning}`);
	}
	console.log('');

	if (options.probe) {
		console.log('(--probe : arrêt après vérification du format)');
		return;
	}

	if (info.isHdr && !options.tonemap) {
		console.log(
			'  ⚠ Vidéo HDR sans --tonemap : les frames seront extraites telles quelles.\n',
		);
	}

	const fps = info.fps ?? 30;

	// Signal de mouvement : basse définition volontaire, pour que le grain et le
	// bruit de compression ne soient pas comptés comme du mouvement.
	const analysisWidth =
		info.displayWidth >= info.displayHeight
			? 64
			: Math.max(2, Math.round((64 * info.displayWidth) / info.displayHeight / 2) * 2);
	const analysisHeight =
		info.displayWidth >= info.displayHeight
			? Math.max(2, Math.round((64 * info.displayHeight) / info.displayWidth / 2) * 2)
			: 64;

	console.log(`▸ Décodage du signal de mouvement (${analysisWidth}×${analysisHeight})…`);
	const grayFrames = await decodeGrayFrames(
		tools.ffmpeg.path,
		source,
		analysisWidth,
		analysisHeight,
	);
	console.log(`  ${grayFrames.length} frames analysées`);

	const analysis = analyzeMotion(grayFrames, fps, {
		cutSensitivity: options.sensitivity,
		maxMotionPeaks: options.maxMotion,
	});
	console.log(
		`  ${analysis.cuts.length} évènement(s), ${analysis.shots.length} segment(s), ${analysis.motionPeaks.length} pic(s) de mouvement\n`,
	);

	const slug = slugify(info.fileName);
	const outDir = options.out
		? path.resolve(options.out)
		: path.join(PROJECT_ROOT, '.analysis', slug);

	if (!options.keep) resetDirectory(outDir);
	mkdirSync(outDir, {recursive: true});

	const aspect = {width: info.displayWidth, height: info.displayHeight};
	const extractOptions = {width: options.width, tonemap: options.tonemap};
	const sheets = {structure: null, transitions: [], motion: [], plot: null};
	const levels = {structure: null, transitions: [], motion: []};

	// ── Niveau 1 — structure ────────────────────────────────────────────────
	console.log('▸ Niveau 1 — frames de structure…');
	const structureDir = path.join(outDir, '01-structure');
	const structureTimes = evenlySpacedTimes(info.duration, options.structure);
	const structureFiles = await extractStills(
		tools.ffmpeg.path,
		source,
		structureTimes,
		structureDir,
		{...extractOptions, prefix: 'struct'},
	);
	levels.structure = {dir: structureDir, files: structureFiles, times: structureTimes};
	console.log(`  ${structureFiles.length} frames → ${path.relative(PROJECT_ROOT, structureDir)}`);

	sheets.structure = await buildContactSheet(tools.ffmpeg.path, source, structureTimes, {
		outFile: path.join(outDir, 'planches', '00-structure.png'),
		aspect,
		columns: 4,
		tonemap: options.tonemap,
		// La police bitmap des planches ne couvre que les chiffres : les titres
		// restent volontairement numériques (voir lib/png.mjs).
		title: `${info.duration.toFixed(1)}s ${options.structure}f`,
	});

	// ── Niveau 2 — transitions ──────────────────────────────────────────────
	console.log('▸ Niveau 2 — rafales autour des évènements…');
	for (const [index, cut] of analysis.cuts.entries()) {
		const label = `evt-${String(index + 1).padStart(2, '0')}`;
		const start = Math.max(0, cut.startTime - options.preRoll / fps);
		const end = Math.min(info.duration, cut.endTime + options.postRoll / fps);
		const dir = path.join(outDir, '02-transitions', `${label}_t${cut.time.toFixed(2).replace('.', '-')}s`);

		const files = await extractBurst(tools.ffmpeg.path, source, {
			start,
			duration: Math.max(1 / fps, end - start),
			fps,
			outDir: dir,
			prefix: label,
			maxFrames: 36,
			...extractOptions,
		});
		levels.transitions.push({dir, files, cut});

		const sheet = await buildContactSheet(
			tools.ffmpeg.path,
			source,
			files.map((entry) => entry.time),
			{
				outFile: path.join(outDir, 'planches', `${label}.png`),
				aspect,
				columns: 6,
				tileWidth: 300,
				tonemap: options.tonemap,
				title: `#${index + 1} ${cut.time.toFixed(2)}s ${cut.ratio.toFixed(1)}`,
			},
		);
		sheets.transitions.push(sheet);
		console.log(
			`  ${label} — ${cut.time.toFixed(3)}s  ${cut.ratio.toFixed(1)}×  ${cut.kind} : ${files.length} frames`,
		);
	}
	if (analysis.cuts.length === 0) {
		console.log('  aucun évènement au-dessus du seuil (essayez --sensitivity=4)');
	}

	// ── Niveau 3 — mouvement fort ───────────────────────────────────────────
	console.log('▸ Niveau 3 — rafales sur les pics de mouvement…');
	for (const [index, peak] of analysis.motionPeaks.entries()) {
		const label = `pic-${String(index + 1).padStart(2, '0')}`;
		const start = Math.max(0, peak.startTime - 2 / fps);
		const end = Math.min(info.duration, peak.endTime + 2 / fps);
		const dir = path.join(
			outDir,
			'03-mouvement',
			`${label}_t${peak.centerTime.toFixed(2).replace('.', '-')}s`,
		);

		const files = await extractBurst(tools.ffmpeg.path, source, {
			start,
			duration: Math.max(1 / fps, end - start),
			fps,
			outDir: dir,
			prefix: label,
			maxFrames: 24,
			...extractOptions,
		});
		levels.motion.push({dir, files, peak});

		const sheet = await buildContactSheet(
			tools.ffmpeg.path,
			source,
			files.map((entry) => entry.time),
			{
				outFile: path.join(outDir, 'planches', `${label}.png`),
				aspect,
				columns: 6,
				tileWidth: 300,
				tonemap: options.tonemap,
				title: `#${index + 1} ${peak.centerTime.toFixed(2)}s`,
			},
		);
		sheets.motion.push(sheet);
		console.log(`  ${label} — centré à ${peak.centerTime.toFixed(3)}s : ${files.length} frames`);
	}
	if (analysis.motionPeaks.length === 0) console.log('  aucun pic retenu');

	// ── Rapport ─────────────────────────────────────────────────────────────
	sheets.plot = buildMotionPlot(analysis, fps, {
		outFile: path.join(outDir, 'planches', '01-signal-mouvement.png'),
	});

	writeFileSync(
		path.join(outDir, 'metadata.json'),
		JSON.stringify(
			{
				video: info,
				tools: {ffmpeg: tools.ffmpeg, ffprobe: tools.ffprobe},
				options,
				stats: analysis.stats,
				cuts: analysis.cuts,
				shots: analysis.shots,
				motionPeaks: analysis.motionPeaks,
			},
			null,
			2,
		),
	);
	writeFileSync(path.join(outDir, 'motion.csv'), toCsv(analysis, fps));
	writeFileSync(
		path.join(outDir, '00-RAPPORT.md'),
		writeReport({info, analysis, outDir, levels, sheets, tools, options}),
	);

	const totalFrames =
		levels.structure.files.length +
		levels.transitions.reduce((sum, level) => sum + level.files.length, 0) +
		levels.motion.reduce((sum, level) => sum + level.files.length, 0);

	console.log('');
	console.log('✓ Analyse terminée');
	console.log(`  Dossier   ${path.relative(PROJECT_ROOT, outDir)}/`);
	console.log(`  Rapport   ${path.relative(PROJECT_ROOT, outDir)}/00-RAPPORT.md`);
	console.log(`  Planches  ${path.relative(PROJECT_ROOT, outDir)}/planches/`);
	console.log(`  Frames    ${totalFrames} au total`);
};

main().catch((error) => {
	console.error(`\n✖ ${error.message}`);
	process.exit(1);
});
