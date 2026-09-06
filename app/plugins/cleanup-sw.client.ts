export default defineNuxtPlugin(() => {
	if (import.meta.dev && typeof window !== 'undefined') {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				for (const registration of registrations) {
					registration.unregister().then((success) => {
						if (success) {
							console.info('[Dev] Unregistered zombie service worker:', registration.scope)
						}
					})
				}
			})
		}
		if ('caches' in window) {
			caches.keys().then((keys) => {
				for (const key of keys) {
					caches.delete(key).then(() => {
						console.info('[Dev] Cleared stale cache storage:', key)
					})
				}
			})
		}
	}
})
