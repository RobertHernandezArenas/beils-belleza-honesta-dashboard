/**
 * Keeps internal error details (Prisma messages, table/column names, connection strings)
 * out of API responses. Mutates the error in place because Nitro's `error` hook runs on the
 * same object right before the error handler serialises it.
 *
 * - 5xx: always replaced by a generic message (details stay in the server log).
 * - 4xx: kept, since handlers write those for the user, unless they leak database internals.
 */

const GENERIC_5XX = 'Error interno del servidor'
const GENERIC_4XX = 'Solicitud inválida'
const INTERNAL_DETAIL = /prisma|invalid `|argument `|unknown column|ECONNREFUSED|ER_[A-Z_]+|\n/i

export function sanitizeApiError(error: Record<string, unknown>, path: string): boolean {
	if (!path.startsWith('/api/')) return false

	const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500
	const statusMessage = String(error.statusMessage ?? error.message ?? '')

	if (statusCode >= 500) {
		error.statusMessage = GENERIC_5XX
		error.message = GENERIC_5XX
		error.data = undefined
		return true
	}

	if (INTERNAL_DETAIL.test(statusMessage) || statusMessage.length > 300) {
		error.statusMessage = GENERIC_4XX
		error.message = GENERIC_4XX
		error.data = undefined
		return true
	}

	return false
}
