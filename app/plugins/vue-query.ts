import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

export default defineNuxtPlugin(nuxtApp => {
	const queryClient = new QueryClient()
	nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })

	if (process.server) {
		nuxtApp.hooks.hook('app:rendered', () => {
			// hydration handling if needed, usually handled by hydrate option or dehydrate
		})
	}

	if (process.client) {
		nuxtApp.hooks.hook('app:created', () => {
			// client side init
		})
	}

	return {
		provide: {
			queryClient,
		},
	}
})
