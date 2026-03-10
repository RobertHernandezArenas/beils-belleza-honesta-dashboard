// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

// Force restart
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	css: ['~/assets/css/main.css'],
	devtools: { enabled: false },
	modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxtjs/google-fonts', '@pinia/nuxt', '@nuxt/image'],

	// ==========================================
	// STRIPE API KEYS — Pago Fraccionado / Cuotas
	// ==========================================
	// ⚠️  stripeSecretKey: SOLO disponible en el servidor (server/)
	// 🌐 stripePublicKey: Disponible en el navegador (app/)
	runtimeConfig: {
		stripeSecretKey: process.env.STRIPE_SECRET_KEY || '', // ← SECRET KEY aquí
		public: {
			stripePublicKey: process.env.STRIPE_PUBLIC_KEY || '', // ← PUBLIC KEY aquí
		},
	},

	googleFonts: {
		families: {
			Roboto: [300, 400, 500, 700],
			'Roboto Condensed': [300, 400, 700],
		},
		display: 'swap',
	},

	build: {
		transpile: ['echarts', 'vue-echarts', 'zrender'],
	},

	telemetry: false, // Disable telemetry for speed
	vite: {
		server: {
			allowedHosts: ['disclamatory-boraginaceous-cedric.ngrok-free.dev', 'localhost'],
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
			include: [
				'aos',
				'lucide-vue-next',
				'@tanstack/vue-query',
				'vue-i18n',
				'zod',
				'echarts',
				'vue-echarts',
			],
		},
	},
})
