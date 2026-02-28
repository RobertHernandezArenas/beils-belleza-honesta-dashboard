import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCookie, useFetch } from '#imports'

export const useAuthStore = defineStore('auth', () => {
	const user = ref<any>(null)
	const token = useCookie('auth_token', {
		maxAge: 60 * 60 * 24, // 1 day
		path: '/',
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
	})

	const isAuthenticated = computed(() => !!token.value && !!user.value)

	function setAuth(userData: any, tokenData: string) {
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
			const data: any = await $fetch('/api/auth/me', {
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
		} catch (e) {
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
