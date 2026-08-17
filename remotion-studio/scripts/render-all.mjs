#!/usr/bin/env node
/**
 * Rendu par lot de toutes les compositions, via l'API programmatique de
 * Remotion (`@remotion/bundler` + `@remotion/renderer`).
 *
 * Deux avantages sur `remotion render` en boucle :
 *   • le bundle webpack n'est construit qu'une seule fois ;
 *   • c'est le même code qui tournera en CI ou derrière une file de rendu.
 *
 * Usage :
 *   node scripts/render-all.mjs                  → toutes les compositions
 *   node scripts/render-all.mjs HeroReveal Reel  → une sélection
 */
import {bundle} from '@remotion/bundler';
import {
	getCompositions,
	renderMedia,
	selectComposition,
} from '@remotion/renderer';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'out');
const ENTRY = path.join(ROOT, 'src', 'index.ts');

const requested = process.argv.slice(2);

/**
 * Permet de pointer sur un Chromium déjà installé, quand le téléchargement
 * automatique de Chrome Headless Shell n'est pas possible (CI, réseau filtré).
 */
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;

const main = async () => {
	await mkdir(OUT_DIR, {recursive: true});

	console.log('▸ Bundling…');
	const serveUrl = await bundle({
		entryPoint: ENTRY,
		// Le même alias que dans remotion.config.ts et vite.config.ts.
		webpackOverride: (config) => ({
			...config,
			resolve: {
				...config.resolve,
				alias: {...config.resolve?.alias, '@': path.join(ROOT, 'src')},
			},
		}),
		onProgress: (progress) => {
			process.stdout.write(`\r  bundle ${Math.round(progress)}%   `);
		},
	});
	process.stdout.write('\r  bundle 100%   \n');

	const all = await getCompositions(serveUrl, {browserExecutable});
	const targets =
		requested.length > 0
			? all.filter((composition) => requested.includes(composition.id))
			: all;

	if (targets.length === 0) {
		console.error(
			`Aucune composition ne correspond. Disponibles : ${all
				.map((c) => c.id)
				.join(', ')}`,
		);
		process.exitCode = 1;
		return;
	}

	for (const target of targets) {
		const composition = await selectComposition({
			serveUrl,
			id: target.id,
			browserExecutable,
		});
		const outputLocation = path.join(OUT_DIR, `${target.id}.mp4`);

		console.log(
			`▸ ${target.id} — ${composition.width}×${composition.height}, ${composition.durationInFrames} frames`,
		);

		await renderMedia({
			serveUrl,
			composition,
			codec: 'h264',
			crf: 16,
			imageFormat: 'png',
			outputLocation,
			browserExecutable,
			onProgress: ({progress}) => {
				process.stdout.write(`\r  rendu ${Math.round(progress * 100)}%   `);
			},
		});

		process.stdout.write(`\r  → ${path.relative(ROOT, outputLocation)}      \n`);
	}

	console.log('✓ Terminé.');
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
