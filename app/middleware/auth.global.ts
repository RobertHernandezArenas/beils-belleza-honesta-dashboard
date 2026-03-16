import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
	const authStore = useAuthStore()

	// Si el usuario no está autenticado, intentar re-hidratar usando la cookie
	if (!authStore.isAuthenticated) {
		await authStore.fetchUser()
	}

	// Excepciones para archivos de la PWA que deben ser públicos
	const publicFiles = [
		'/manifest.webmanifest',
		'/manifest.json',
		'/sw.js',
		'/dev-sw.js',
	]
	const isPublicFile = ['/manifest.json', '/manifest.webmanifest', '/sw.js', '/dev-sw.js'].includes(to.path) || to.path.startsWith('/workbox-')
	const isLoginRoute = to.path === '/'

	// Usuario no autenticado intentando acceder a ruta protegida
	if (!authStore.isAuthenticated && !isLoginRoute && !isPublicFile) {
		return navigateTo('/')
	}

	// Usuario autenticado intentando acceder al login
	if (authStore.isAuthenticated && isLoginRoute) {
		return navigateTo('/overview')
	}
})
