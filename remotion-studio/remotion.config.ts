import {Config} from '@remotion/cli/config';
import path from 'node:path';

// Remotion compile ce fichier en CJS : `import.meta` n'y est pas disponible.
// Le CLI est toujours lancé depuis la racine du projet.
const root = process.cwd();

/**
 * Point d'entrée du bundle Remotion : c'est ce fichier qui appelle
 * `registerRoot()` et déclare toutes les compositions.
 */
Config.setEntryPoint('./src/index.ts');

/**
 * L'alias `@/…` doit être connu de deux bundlers différents :
 *  - webpack  → utilisé par Remotion (studio + rendu)
 *  - Vite     → utilisé par le playground interactif (voir vite.config.ts)
 * Les deux doivent rester synchronisés avec `paths` dans tsconfig.json.
 */
Config.overrideWebpackConfig((currentConfig) => ({
	...currentConfig,
	resolve: {
		...currentConfig.resolve,
		alias: {
			...currentConfig.resolve?.alias,
			'@': path.join(root, 'src'),
		},
	},
}));

// --- Qualité d'image -------------------------------------------------------
// PNG pour les frames intermédiaires : pas d'artefacts JPEG sur les dégradés
// et les surfaces en verre dépoli, qui sont partout dans ce design system.
Config.setVideoImageFormat('png');
Config.setStillImageFormat('png');

// H.264 + CRF bas = master de très bonne qualité, lisible partout.
// Pour une livraison web moderne, passer en `vp9` ou `h265`.
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');

// --- Rendu -----------------------------------------------------------------
Config.setOverwriteOutput(true);
Config.setChromiumDisableWebSecurity(false);

// Toute erreur JS survenue dans une frame fait échouer le rendu au lieu de
// produire silencieusement une vidéo cassée.
Config.setChromiumIgnoreCertificateErrors(false);
Config.setLevel('info');
