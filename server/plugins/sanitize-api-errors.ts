import { sanitizeApiError } from '../utils/api-errors'

// Logs the real error server-side, then strips internal details before Nuxt serialises it
export default defineNitroPlugin(nitroApp => {
	nitroApp.hooks.hook('error', (error, { event }) => {
		const path = event?.path || ''
		const raw = error as unknown as Record<string, unknown>
		const original = String(raw.message || raw.statusMessage || '').trim()
		if (sanitizeApiError(raw, path)) {
			console.error(`[API ERROR] ${event?.method} ${path}:`, original, (error as Error).stack ?? '')
		}
	})
})
