import { STAFF_ROLES } from './login-policy'

/**
 * Session rules.
 * - The session cookie is set by the server and is httpOnly (JS/XSS can't read it).
 * - Tokens carry `tv` (token version). Bumping users.token_version revokes every session of
 *   that user, which happens on role/status/password changes. The middleware checks it
 *   against the DB (cached briefly), and uses the DB role rather than the one in the token.
 */

export const SESSION_COOKIE = 'auth_token'
export const SESSION_MAX_AGE = 60 * 60 * 24 // 24h, same as the JWT expiry

export function sessionCookieOptions(nodeEnv = process.env.NODE_ENV) {
	return {
		httpOnly: true,
		secure: nodeEnv === 'production',
		sameSite: 'strict' as const,
		path: '/',
		maxAge: SESSION_MAX_AGE,
	}
}

export interface SessionUser {
	status: string
	role: string
	token_version: number
}

export type SessionCheck = { ok: true; role: string } | { ok: false }

export function checkSession(token: { tv?: number }, user: SessionUser | null): SessionCheck {
	if (!user || user.status !== 'ON') return { ok: false }
	if (!(STAFF_ROLES as readonly string[]).includes(user.role)) return { ok: false }
	if ((token.tv ?? 0) !== user.token_version) return { ok: false }
	return { ok: true, role: user.role }
}

/** Changes that must end the user's existing sessions. */
export function shouldRevokeSessions(update: { role?: string; status?: string; password?: string }) {
	return update.role !== undefined || update.status !== undefined || !!update.password
}

/** Tiny TTL cache so the session check doesn't hit the DB on every request. */
export function createSessionCache<T>(ttlMs: number) {
	const entries = new Map<string, { value: T; expiresAt: number }>()
	return {
		get(key: string, now = Date.now()) {
			const entry = entries.get(key)
			if (!entry) return undefined
			if (now >= entry.expiresAt) {
				entries.delete(key)
				return undefined
			}
			return entry.value
		},
		set(key: string, value: T, now = Date.now()) {
			entries.set(key, { value, expiresAt: now + ttlMs })
		},
		invalidate(key: string) {
			entries.delete(key)
		},
	}
}
