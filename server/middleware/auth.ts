import { verifyToken } from '../utils/jwt'

// Protected routes prefix
const PROTECTED_PREFIX = '/api/'
// Routes that don't need authentication even if inside the protected prefix
const PUBLIC_ROUTES = ['/api/auth/login', '/api/hello']

export default defineEventHandler(event => {
	const path = event.path || ''

	// Check if the route is an API route and not in the public list
	if (!path.startsWith(PROTECTED_PREFIX)) {
		return // Not an API route, allow
	}

	const isPublic = PUBLIC_ROUTES.some(r => path.startsWith(r))
	if (isPublic) {
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

	try {
		const decoded = verifyToken(token)
		if (!decoded) {
			throw new Error('Invalid token structure')
		}

		// Attach user info to the event context so subsequent API handlers can use it
		event.context.user = decoded
	} catch (error) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Unauthorized: Session expired or invalid token',
		})
	}
})
