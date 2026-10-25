import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async _nuxtApp => {
	const authStore = useAuthStore()

	// Interceptar peticiones iniciales para cargar el usuario y evitar destellos.
	// The httpOnly cookie isn't visible to JS: on the server skip the call when there is no cookie
	// at all; in the browser (client-only pages) ask the server.
	if (authStore.user) return
	if (import.meta.server && !useRequestHeaders(['cookie']).cookie?.includes('auth_token=')) return
	await authStore.fetchUser()
})
