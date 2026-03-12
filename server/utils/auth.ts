import { createError, H3Event } from 'h3'

/**
 * Checks if the current authenticated user has the ADMIN role.
 * Throws a 403 Forbidden error if not.
 * Assumes the user info is attached to event.context.user by the auth middleware.
 */
export const requireAdmin = (event: H3Event) => {
	const user = event.context.user

	if (!user || user.role !== 'ADMIN') {
		throw createError({
			statusCode: 403,
			statusMessage: 'Acceso restringido: Se require rol de Administrador',
		})
	}
}
