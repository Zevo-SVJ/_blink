import {existsSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';

export const VIDEO_EXTENSIONS = new Set([
	'.mov',
	'.mp4',
	'.m4v',
	'.mkv',
	'.webm',
	'.avi',
	'.hevc',
	'.m4s',
]);

/**
 * Emplacements balayés à la recherche de la vidéo de référence.
 *
 * `reference/` est l'emplacement officiel du projet ; les autres couvrent les
 * cas où un fichier arrive par un autre chemin (pièce jointe déposée par
 * l'agent hôte, transfert manuel, téléchargement).
 */
export const searchRoots = (projectRoot) => [
	path.join(projectRoot, 'reference'),
	projectRoot,
	path.resolve(projectRoot, '..'),
	'/mnt/user-data',
	'/mnt/data',
	'/workspace',
	process.env.HOME ?? '/root',
	'/tmp',
];

const SKIP = new Set(['node_modules', '.git', 'out', 'dist-playground', '.analysis']);

const walk = (dir, depth, results) => {
	let entries;
	try {
		entries = readdirSync(dir, {withFileTypes: true});
	} catch {
		return;
	}

	for (const entry of entries) {
		if (entry.name.startsWith('.') && entry.name !== '.analysis') continue;
		if (SKIP.has(entry.name)) continue;

		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (depth > 0) walk(full, depth - 1, results);
			continue;
		}
		if (!entry.isFile()) continue;
		if (!VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;

		try {
			const stats = statSync(full);
			results.push({file: full, size: stats.size, mtime: stats.mtimeMs});
		} catch {
			/* fichier disparu entre-temps */
		}
	}
};

/** Liste les vidéos candidates, la plus récente en premier. */
export const findCandidates = (projectRoot, {depth = 2} = {}) => {
	const results = [];
	const seen = new Set();

	for (const root of searchRoots(projectRoot)) {
		if (!existsSync(root)) continue;
		const before = results.length;
		walk(root, root === projectRoot || root.endsWith('reference') ? depth : 1, results);
		for (let i = before; i < results.length; i += 1) {
			if (seen.has(results[i].file)) {
				results[i] = null;
			} else {
				seen.add(results[i].file);
			}
		}
	}

	return results
		.filter(Boolean)
		.sort((a, b) => b.mtime - a.mtime);
};

export const slugify = (fileName) =>
	path
		.basename(fileName, path.extname(fileName))
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 48) || 'reference';
