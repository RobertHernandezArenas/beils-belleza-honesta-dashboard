// Narrow, typed shape for errors caught in API handlers.
// Covers the three error kinds this backend actually throws:
//  - standard Error (message, stack)
//  - Nuxt/H3 errors created with createError (statusCode, statusMessage)
//  - Prisma known-request errors (code like 'P2025', meta)
export interface ApiError {
	message?: string
	stack?: string
	statusCode?: number
	statusMessage?: string
	code?: string
	meta?: unknown
	data?: { statusMessage?: string }
}

// Type a caught `unknown` as ApiError WITHOUT copying it: the returned value
// is the same object reference, so `throw error` still rethrows the original
// H3Error/Prisma error unchanged. Only the static type changes.
export function toApiError(error: unknown): ApiError {
	return (error ?? {}) as ApiError
}
