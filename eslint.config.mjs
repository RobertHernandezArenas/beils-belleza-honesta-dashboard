// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt([
	// Custom manual overrides if needed, like Prettier compatibility
	// But @nuxt/eslint usually handles this.
	{
		rules: {
			'vue/multi-word-component-names': 'off',
			// 'no-console': 'off',
		},
	},
])
