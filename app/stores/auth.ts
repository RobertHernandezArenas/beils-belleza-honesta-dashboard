import { defineStore } from 'pinia'
import type { ClientDTO } from '~~/shared/types/domain'

/**
 * The session token lives in an httpOnly cookie set by the server, so it's never readable
 * here (nor by any injected script). The session is whatever /api/auth/me says it is.
 */
export const useAuthStore = defineStore('auth', () => {
	const user = ref<ClientDTO | null>(null)
	// Forwards the incoming request's cookies during SSR; a plain $fetch in the browser
	const requestFetch = useRequestFetch()

	const isAuthenticated = computed(() => !!user.value)

	function setAuth(userData: ClientDTO) {
		user.value = userData
	}

	function clearAuth() {
		user.value = null
	}

	async function fetchUser() {
		try {
			const data = await requestFetch<{ user: ClientDTO }>('/api/auth/me')
			if (!data?.user) {
				clearAuth()
				return false
			}
			user.value = data.user
			return true
		} catch {
			clearAuth()
			return false
		}
	}

	/** Server-side logout: the httpOnly cookie can only be cleared by the server */
	async function logout() {
		try {
			await $fetch('/api/auth/logout', { method: 'POST' })
		} finally {
			clearAuth()
		}
	}

	return {
		user,
		isAuthenticated,
		setAuth,
		clearAuth,
		fetchUser,
		logout,
	}
})
