import { createError } from 'h3'
import bcrypt from 'bcryptjs'
import { toPublicUser } from '../../utils/public-user'
import { signToken } from '../../utils/jwt'
import { loginOutcome, unusablePasswordSeed, STAFF_ROLES } from '../../utils/login-policy'
import { isLocked, lockDurationMinutes, lockedMessage } from '../../utils/login-lockout'
import { createKeyedMutex } from '../../utils/keyed-mutex'
import type { AuthRepository } from './ports'

const DUMMY_HASH = bcrypt.hashSync(unusablePasswordSeed(), 12)

export interface LoginDeps {
	auth: AuthRepository
	now?: () => Date
}

// Serializes attempts per email: without this, many concurrent requests for the same
// account all read "not locked" and all get to run bcrypt against the real password
// before any of them finishes incrementing the counter and writing the lock. Keying by
// email (not by resolved user) also serializes unknown-email attempts, which is harmless.
const loginMutex = createKeyedMutex()

export async function login(deps: LoginDeps, { email, password }: { email: string; password: string }) {
	return loginMutex(email, () => attemptLogin(deps, { email, password }))
}

async function attemptLogin(deps: LoginDeps, { email, password }: { email: string; password: string }) {
	const user = await deps.auth.findByEmail(email)
	const isStaffAccount = !!user && (STAFF_ROLES as readonly string[]).includes(user.role)

	if (isStaffAccount && isLocked(user!.locked_until)) {
		throw createError({ statusCode: 423, statusMessage: lockedMessage(user!.locked_until!) })
	}

	const passwordValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH)

	if (isStaffAccount && !passwordValid) {
		const failedCount = await deps.auth.incrementFailedAttempts(user!.user_id)
		const lockMinutes = lockDurationMinutes(failedCount)
		if (lockMinutes > 0) {
			const nowMs = deps.now ? deps.now().getTime() : Date.now()
			const lockedUntil = new Date(nowMs + lockMinutes * 60_000)
			await deps.auth.lockAccount(user!.user_id, lockedUntil)
			throw createError({ statusCode: 423, statusMessage: lockedMessage(lockedUntil) })
		}
	}

	const outcome = loginOutcome({ user, passwordValid })
	if (!outcome.ok) {
		throw createError({ statusCode: outcome.statusCode, statusMessage: outcome.message })
	}

	if (user!.failed_login_count > 0 || user!.locked_until) {
		await deps.auth.resetFailedAttempts(user!.user_id)
	}

	const token = signToken({
		userId: user!.user_id,
		email: user!.email,
		role: user!.role,
		tv: user!.token_version,
	})

	return {
		token,
		user: toPublicUser(user!),
	}
}

