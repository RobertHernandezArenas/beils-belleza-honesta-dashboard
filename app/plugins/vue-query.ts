import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

export default defineNuxtPlugin(nuxtApp => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60 * 5, // 5 minutes
				gcTime: 1000 * 60 * 30, // 30 minutes
				refetchOnWindowFocus: false,
				retry: 1,
			},
		},
	})
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
