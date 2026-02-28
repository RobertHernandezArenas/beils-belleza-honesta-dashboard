import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async nuxtApp => {
	const authStore = useAuthStore()

	// Interceptar peticiones iniciales para cargar el usuario y evitar destellos
	if (import.meta.server || import.meta.client) {
		if (authStore.token && !authStore.user) {
			await authStore.fetchUser()
		}
	}
})
