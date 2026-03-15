import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
	const authStore = useAuthStore()

	// Si el usuario no está autenticado, intentar re-hidratar usando la cookie
	if (!authStore.isAuthenticated) {
		await authStore.fetchUser()
	}

	const isLoginRoute = to.path === '/'
	const isPwaFile = ['/manifest.json', '/manifest.webmanifest', '/sw.js', '/dev-sw.js'].includes(to.path) || to.path.startsWith('/workbox-')

	// Usuario no autenticado intentando acceder a ruta protegida o no-Pwa
	if (!authStore.isAuthenticated && !isLoginRoute && !isPwaFile) {
		return navigateTo('/')
	}

	// Usuario autenticado intentando acceder al login
	if (authStore.isAuthenticated && isLoginRoute) {
		return navigateTo('/overview')
	}
})
