import { randomBytes } from 'node:crypto'

/** Only staff can sign in to the dashboard; clients are records, not accounts. */
export const STAFF_ROLES = ['ADMIN', 'STAFF'] as const

export type LoginOutcome = { ok: true } | { ok: false; statusCode: 401 | 403; message: string }

const INVALID: LoginOutcome = { ok: false, statusCode: 401, message: 'Correo o contraseña incorrectos' }

/**
 * Decides a login attempt. Unknown email, wrong password and non-staff accounts get the
 * exact same answer (no account enumeration); an inactive account is only disclosed to
 * someone who already proved they know its password.
 */
export function loginOutcome({
	user,
	passwordValid,
}: {
	user: { role: string; status: string } | null
	passwordValid: boolean
}): LoginOutcome {
	if (!user || !passwordValid) return INVALID
	if (!(STAFF_ROLES as readonly string[]).includes(user.role)) return INVALID
	if (user.status !== 'ON') {
		return { ok: false, statusCode: 403, message: 'Cuenta inactiva. Contacta con el administrador.' }
	}
	return { ok: true }
}

/** Random secret for accounts that must not be able to log in (hash it before storing). */
export const unusablePasswordSeed = () => randomBytes(32).toString('base64url')
