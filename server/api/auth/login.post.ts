import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { toApiError } from '../../utils/errors'
import { SESSION_COOKIE, sessionCookieOptions } from '../../utils/session-policy'
import { login } from '../../modules/auth/login'
import { createPrismaAuthRepository } from '../../modules/auth/prisma-auth-repository'

const loginSchema = z.object({
	email: z.string().email().max(50),
	password: z.string().min(1).max(128),
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const result = loginSchema.safeParse(body)
		if (!result.success) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Credenciales inválidas o formato incorrecto',
			})
		}

		const { email, password } = result.data
		const { token, user } = await login(
			{ auth: createPrismaAuthRepository(prisma) },
			{ email, password },
		)

		setCookie(event, SESSION_COOKIE, token, sessionCookieOptions())

		return { user }
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error

		console.error('[LOGIN] Unexpected error:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Error interno al iniciar sesión',
		})
	}
})
