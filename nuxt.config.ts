// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

// Force restart
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	css: ['~/assets/css/main.css'],
	devtools: { enabled: true },
	eslint: {
		checker: false,
	},
	modules: ['@nuxt/eslint', '@nuxt/fonts','@pinia/nuxt'],
	nitro: {
		alias: {
			'@vue/devtools-api': 'vue-devtools-stub',
		},
	},

	// ==========================================
	// View Transitions API + Page/Layout Transitions
	// ==========================================
	experimental: {
		payloadExtraction: true,
		viewTransition: true,
		// Type $fetch from the generated route set (Nuxt 5 default). The legacy InternalApi
		// typing overflows TypeScript's stack depth on templated URLs (TS2321) in Nuxt 4.6.
		routeTypedFetch: true,
	},
	routeRules: {
		'/overview': { ssr: false },
	},
	// NUXT Plugin to disable sourcemap
	sourcemap: {
		server: false,
		client: false,
	},
	app: {
		pageTransition: { name: 'page', mode: 'out-in' },
		// Opt-in per page via definePageMeta({ viewTransition: true })
		viewTransition: false,
		layoutTransition: { name: 'layout', mode: 'out-in' },
		head: {
			htmlAttrs: { 'data-theme': 'light' },
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
		salonAddress: process.env.SALON_ADDRESS || '',
		salonPhone: process.env.SALON_PHONE || '',

		// Outgoing mail (SMTP). Considered configured only when host and sender are set.
		smtpHost: process.env.SMTP_HOST || '',
		smtpPort: process.env.SMTP_PORT || '',
		smtpSecure: process.env.SMTP_SECURE || '',
		smtpUser: process.env.SMTP_USER || '',
		smtpPass: process.env.SMTP_PASS || '',
		mailFrom: process.env.MAIL_FROM || '',

		// Private keys (Server-side only)
		aeatWsdlUrl:
			process.env.AEAT_WSDL_URL || 'https://prewww1.aeat.es/wlpl/BURT-JDIT/ws/SuministroFactEmitidas.wsdl',
		aeatP12CertPath: process.env.AEAT_P12_CERT_PATH,
		aeatP12Password: process.env.AEAT_P12_PASSWORD,

	},

	// Self-hosted at build time: visitors never contact Google (GDPR)
	fonts: {
		defaults: {
			subsets: ['latin', 'latin-ext'],
		},
		families: [
			// Primary typeface: Roboto
			{ name: 'Roboto', provider: 'google', weights: [300, 400, 500, 700, 900] },
			{ name: 'Mulish', provider: 'google', weights: [300, 400, 500, 600, 700, 800] },
		],
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
			tailwindcss(),
		],
		optimizeDeps: {
			include: [
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
