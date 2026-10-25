import { STAFF_ROLES } from './login-policy'

/** API routes reachable without a session. Exact paths only: a prefix match would make
 *  any future route starting with the same text public by accident. */
const PUBLIC_API_ROUTES = new Set(['/api/auth/login'])

const normalizePath = (path: string) => {
	const withoutQuery = path.split('?')[0] || ''
	return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, '') : withoutQuery
}

export function isPublicApiRoute(path: string) {
	return PUBLIC_API_ROUTES.has(normalizePath(path))
}

/** The dashboard API is for staff only. Client records never act as API users, even if a
 *  token with that role still exists (issued before client logins were blocked). */
export function canRoleUseApi(role: string | undefined) {
	return !!role && (STAFF_ROLES as readonly string[]).includes(role)
}
