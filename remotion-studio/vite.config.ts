import react from '@vitejs/plugin-react';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Le playground est une petite app React qui embarque `<Player />` de Remotion
 * dans une interface entièrement animée avec Framer Motion.
 * Il ne sert PAS au rendu vidéo — c'est la vitrine du côté « interactif ».
 */
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.join(root, 'src'),
		},
	},
	server: {
		port: 5273,
		open: false,
	},
	build: {
		outDir: 'dist-playground',
		sourcemap: true,
	},
});
