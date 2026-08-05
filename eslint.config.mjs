// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt([
	// Ignore throwaway / vendored directories that shouldn't be linted.
	{
		ignores: [
			'tmp-excalidraw-mcp/**',
			'generated/**',
			'.claude/**',
			'.agents/**',
			'.codex/**',
			'.gemini/**',
			// Dev/DB utility scripts and seeds — not part of the shipped app.
			'scripts/**',
			'seeds/**',
		],
	},
	// Custom manual overrides if needed, like Prettier compatibility
	// But @nuxt/eslint usually handles this.
	{
		rules: {
			'vue/multi-word-component-names': 'off',
			// 'no-console': 'off',
		},
	},
])
