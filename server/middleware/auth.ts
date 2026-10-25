import { verifyToken } from '../utils/jwt'
import { isPublicApiRoute, canRoleUseApi, canRoleAccessPath } from '../utils/api-access'

// Protected routes prefix
const PROTECTED_PREFIX = '/api/'

export default defineEventHandler(event => {
	const path = event.path || ''

	// Check if the route is an API route and not in the public list
	if (!path.startsWith(PROTECTED_PREFIX)) {
		return // Not an API route, allow
	}

	// Exact-match allow-list (see utils/api-access). Sales/carts stay protected:
	// they expose client PII, issue fiscal invoices and consume bonos.
	if (isPublicApiRoute(path)) {
		return // Public API route, allow
	}

	// Try extracting token from Authorization header (Bearer token)
	let token = ''
	const authHeader = getHeader(event, 'Authorization')

	if (authHeader && authHeader.startsWith('Bearer ')) {
		token = authHeader.split(' ')[1] || ''
	}

	// If no header token, try extracting from the cookie
	if (!token) {
		token = getCookie(event, 'auth_token') || ''
	}

	if (!token) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Unauthorized: Token is missing or invalid',
		})
	}

	const decoded = verifyToken(token)
	if (!decoded) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Unauthorized: Session expired or invalid token',
		})
	}

	// Staff-only API: reject client (or unknown) roles everywhere, before any handler runs
	if (!canRoleUseApi(decoded.role)) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Acceso restringido al personal del centro',
		})
	}

	// Health records (questionnaires, consents, revocations) are admin-only
	if (!canRoleAccessPath(decoded.role, path)) {
		throw createError({
			statusCode: 403,
			statusMessage: 'Acceso restringido: datos de salud solo para administradores',
		})
	}

	// Attach user info to the event context so subsequent API handlers can use it
	event.context.user = decoded
})
