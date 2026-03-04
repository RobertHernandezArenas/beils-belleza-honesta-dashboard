// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

// Force restart
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	css: ['~/assets/css/main.css'],
	devtools: { enabled: false },
	modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxtjs/google-fonts', '@pinia/nuxt', '@nuxt/image'],

	googleFonts: {
		families: {
			Roboto: [300, 400, 500, 700],
			'Roboto Condensed': [300, 400, 700],
		},
		display: 'swap',
	},

	telemetry: false, // Disable telemetry for speed
  vite: {
    server: {
      allowedHosts: ['disclamatory-boraginaceous-cedric.ngrok-free.dev', 'localhost']
    },
		resolve: {
			alias: {
				'.prisma/client/index-browser': './node_modules/@prisma/client/index-browser.js',
			},
		},
		plugins: [
			// @ts-expect-error Type mismatch with Nuxt's Vite interface
			tailwindcss(),
		],
		optimizeDeps: {
			include: ['aos', 'lucide-vue-next', '@tanstack/vue-query', 'vue-i18n', 'zod'],
		},
	},
})
