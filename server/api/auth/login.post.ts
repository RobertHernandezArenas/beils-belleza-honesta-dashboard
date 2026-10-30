import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../utils/prisma'
import { toPublicUser } from '../../utils/public-user'
import { signToken } from '../../utils/jwt'
import { loginOutcome, unusablePasswordSeed, STAFF_ROLES } from '../../utils/login-policy'
import { isLocked, lockDurationMinutes, lockedMessage, unlockedWhere } from '../../utils/login-lockout'
import { SESSION_COOKIE, sessionCookieOptions } from '../../utils/session-policy'

const loginSchema = z.object({
	email: z.string().email().max(50),
	password: z.string().min(1).max(128),
})

// Compared against when the email doesn't exist, so response time doesn't reveal valid emails
const DUMMY_HASH = bcrypt.hashSync(unusablePasswordSeed(), 12)

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)

		// Validar Input
		const result = loginSchema.safeParse(body)
		if (!result.success) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Credenciales inválidas o formato incorrecto',
			})
		}

		const { email, password } = result.data

		// Buscar usuario en BD
		const user = await prisma.user.findUnique({
			where: { email },
		})

		const isStaffAccount = !!user && (STAFF_ROLES as readonly string[]).includes(user.role)

		// Locked accounts are refused before the password is even checked (the right one too)
		if (isStaffAccount && isLocked(user!.locked_until)) {
			throw createError({ statusCode: 423, statusMessage: lockedMessage(user!.locked_until!) })
		}

		// Always run bcrypt, then decide: unknown email, wrong password and client accounts look identical
		const passwordValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH)

		// Count failures atomically on staff accounts; the 3rd one locks the account
		if (isStaffAccount && !passwordValid) {
			const { failed_login_count } = await prisma.user.update({
				where: { user_id: user!.user_id },
				data: { failed_login_count: { increment: 1 } },
				select: { failed_login_count: true },
			})
			const lockMinutes = lockDurationMinutes(failed_login_count)
			if (lockMinutes > 0) {
				const lockedUntil = new Date(Date.now() + lockMinutes * 60_000)
				await prisma.user.update({ where: { user_id: user!.user_id }, data: { locked_until: lockedUntil } })
				console.warn(`[LOGIN] Account locked for ${lockMinutes} min after ${failed_login_count} failed attempts: ${user!.user_id}`)
				throw createError({ statusCode: 423, statusMessage: lockedMessage(lockedUntil) })
			}
		}

		const outcome = loginOutcome({ user, passwordValid })
		if (!outcome.ok) {
			throw createError({ statusCode: outcome.statusCode, statusMessage: outcome.message })
		}

		// Successful login clears any failed-attempt history. For staff the reset only applies if the
		// account is still unlocked in the database: a lock written by concurrent failures wins, so
		// no session is issued while the account is locked.
		if (isStaffAccount) {
			const cleared = await prisma.user.updateMany({
				where: { user_id: user!.user_id, ...unlockedWhere() },
				data: { failed_login_count: 0, locked_until: null },
			})
			if (cleared.count === 0) {
				const fresh = await prisma.user.findUnique({ where: { user_id: user!.user_id }, select: { locked_until: true } })
				throw createError({
					statusCode: 423,
					statusMessage: fresh?.locked_until ? lockedMessage(fresh.locked_until) : 'Cuenta bloqueada temporalmente. Inténtalo de nuevo más tarde.',
				})
			}
		} else if (user!.failed_login_count > 0 || user!.locked_until) {
			await prisma.user.update({
				where: { user_id: user!.user_id },
				data: { failed_login_count: 0, locked_until: null },
			})
		}

		// Generar Token
		const token = signToken({ userId: user!.user_id, email: user!.email, role: user!.role, tv: user!.token_version })

		// httpOnly cookie set by the server: JavaScript (and any XSS) can't read the token
		setCookie(event, SESSION_COOKIE, token, sessionCookieOptions())

		// Retornar datos (sin password ni refresh token)
		return {
			user: toPublicUser(user!),
		}
	} catch (rawError) {
		const error = toApiError(rawError)

		// If it's already a Nuxt error, rethrow it
		if (error.statusCode) throw error

		// Log details server-side only; never send internal errors to the browser
		console.error('[LOGIN] Unexpected error:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Error interno al iniciar sesión',
		})
	}
})
