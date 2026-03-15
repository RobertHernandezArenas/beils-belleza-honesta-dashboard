import { type H3Event as TH3Event } from 'h3'
import type { JwtPayload } from './jwt'

// H3Event and createError are auto-imported by Nuxt/Nitro

/**
 * Checks if the current authenticated user has the ADMIN role.
 * Throws a 403 Forbidden error if not.
 * Assumes the user info is attached to event.context.user by the auth middleware.
 */
export const requireAdmin = (event: TH3Event) => {
	const user = event.context.user as JwtPayload | undefined

	if (!user || user.role !== 'ADMIN') {
		throw createError({
			statusCode: 403,
			statusMessage: 'Acceso restringido: Se require rol de Administrador',
		})
	}
}
