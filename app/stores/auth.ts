import { defineStore } from 'pinia'
import { useCookie } from '#imports'
import type { ClientDTO } from '~~/shared/types/domain'

export const useAuthStore = defineStore('auth', () => {
	const user = ref<ClientDTO | null>(null)
	const token = useCookie('auth_token', {
		maxAge: 60 * 60 * 24, // 1 day
		path: '/',
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	})

	const isAuthenticated = computed(() => !!token.value && !!user.value)

	function setAuth(userData: ClientDTO, tokenData: string) {
		user.value = userData
		token.value = tokenData
	}

	function clearAuth() {
		user.value = null
		token.value = null
	}

	async function fetchUser() {
		if (!token.value) return false

		try {
			const data = await $fetch<{ user: ClientDTO }>('/api/auth/me', {
				headers: {
					Authorization: `Bearer ${token.value}`,
				},
			})

			if (!data || !data.user) {
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

	return {
		user,
		token,
		isAuthenticated,
		setAuth,
		clearAuth,
		fetchUser,
	}
})
