import { verifyToken } from '../utils/jwt'
import { isPublicApiRoute, canRoleUseApi, canRoleAccessPath } from '../utils/api-access'
import { checkSession, SESSION_COOKIE } from '../utils/session-policy'
import { loadSessionUser } from '../utils/session-store'

// Protected routes prefix
const PROTECTED_PREFIX = '/api/'

export default defineEventHandler(async event => {
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
		token = getCookie(event, SESSION_COOKIE) || ''
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

	// Revocation: the token version must match the user's, and the user must still be active staff.
	// The role used from here on is the current one in the DB, not the one frozen in the token.
	const session = checkSession(decoded, await loadSessionUser(decoded.userId))
	if (!session.ok) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Unauthorized: Session expired or revoked',
		})
	}
	decoded.role = session.role

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
