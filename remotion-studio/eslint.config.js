import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['node_modules', 'out', 'dist-playground', '.remotion', 'public'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		// Outillage Node : scripts de rendu et chaîne d'analyse vidéo.
		files: ['scripts/**/*.mjs'],
		languageOptions: {globals: globals.node},
	},
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			globals: {...globals.browser, ...globals.node},
			parserOptions: {ecmaFeatures: {jsx: true}},
		},
		plugins: {'react-hooks': reactHooks},
		rules: {
			// Les règles des hooks valent aussi pour `useCurrentFrame` :
			// un hook Remotion appelé conditionnellement casse le rendu.
			...reactHooks.configs.recommended.rules,
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{prefer: 'type-imports', fixStyle: 'separate-type-imports'},
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{argsIgnorePattern: '^_', varsIgnorePattern: '^_'},
			],
		},
	},
);
