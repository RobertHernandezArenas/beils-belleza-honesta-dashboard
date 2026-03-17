// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

// Force restart
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	css: ['~/assets/css/main.css'],
	devtools: { enabled: false },
	modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxtjs/google-fonts', '@pinia/nuxt', '@nuxt/image'],

	// ==========================================
	// View Transitions API + Page/Layout Transitions
	// ==========================================
	experimental: {
		payloadExtraction: true,
	},
	app: {
		pageTransition: { name: 'page', mode: 'out-in' },
		layoutTransition: { name: 'layout', mode: 'out-in' },
		head: {
			link: [
				{ rel: 'apple-touch-icon', href: '/images/apple-touch-icon.png' },
				{ rel: 'apple-touch-icon', sizes: '152x152', href: '/images/apple-touch-icon-152x152.png' },
			],
		},
	},

	// ==========================================
	// CONFIGURATION
	// ==========================================
	runtimeConfig: {
		// Salon / Issuer Info
		salonNif: process.env.SALON_NIF || '00000000T',
		salonName: process.env.SALON_NAME || 'Beils Belleza Honesta',

		// Private keys (Server-side only)
		aeatWsdlUrl: process.env.AEAT_WSDL_URL || 'https://prewww1.aeat.es/wlpl/BURT-JDIT/ws/SuministroFactEmitidas.wsdl',
		aeatP12CertPath: process.env.AEAT_P12_CERT_PATH,
		aeatP12Password: process.env.AEAT_P12_PASSWORD,

		// ==========================================
		// STRIPE API KEYS — Pago Fraccionado / Cuotas
		// ==========================================
		// ⚠️  stripeSecretKey: SOLO disponible en el servidor (server/)
		stripeSecretKey: process.env.STRIPE_SECRET_KEY || '', // ← SECRET KEY aquí
		public: {
			// 🌐 stripePublicKey: Disponible en el navegador (app/)
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
				'gsap',
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
