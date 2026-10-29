import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

type Env = Record<string, string | undefined>

// Same policy and cost as server/utils/user-admin.ts and server/api/users/[id].put.ts
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128
const BCRYPT_COST = 12

/** New admin password: NEW_ADMIN_PASSWORD if set (must meet the policy) or a random one. */
export function resolveResetPassword(env: Env) {
	const fromEnv = env.NEW_ADMIN_PASSWORD?.trim()
	if (!fromEnv) return { password: randomBytes(18).toString('base64url'), generated: true }
	if (fromEnv.length < MIN_PASSWORD_LENGTH) {
		throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
	}
	if (fromEnv.length > MAX_PASSWORD_LENGTH) {
		throw new Error(`La contraseña no puede superar ${MAX_PASSWORD_LENGTH} caracteres`)
	}
	return { password: fromEnv, generated: false }
}

/** Update data: bcrypt hash only, plus revoking every open session and clearing the lockout. */
export async function buildPasswordResetData(password: string) {
	return {
		password: await bcrypt.hash(password, BCRYPT_COST),
		token_version: { increment: 1 },
		refresh_token: null,
		failed_login_count: 0,
		locked_until: null,
	}
}
