import { createError } from 'h3'
import bcrypt from 'bcryptjs'
import { toPublicUser } from '../../utils/public-user'
import { signToken } from '../../utils/jwt'
import { loginOutcome, unusablePasswordSeed, STAFF_ROLES } from '../../utils/login-policy'
import { isLocked, lockDurationMinutes, lockedMessage } from '../../utils/login-lockout'
import type { AuthRepository } from './ports'

const DUMMY_HASH = bcrypt.hashSync(unusablePasswordSeed(), 12)

export interface LoginDeps {
	auth: AuthRepository
	now?: () => Date
}

export async function login(deps: LoginDeps, { email, password }: { email: string; password: string }) {
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

