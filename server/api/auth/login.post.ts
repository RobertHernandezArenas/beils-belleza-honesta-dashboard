import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../utils/prisma'
import { signToken } from '../../utils/jwt'
import { loginOutcome, unusablePasswordSeed } from '../../utils/login-policy'

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

		// Always run bcrypt, then decide: unknown email, wrong password and client accounts look identical
		const passwordValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH)
		const outcome = loginOutcome({ user, passwordValid })
		if (!outcome.ok) {
			throw createError({ statusCode: outcome.statusCode, statusMessage: outcome.message })
		}

		// Generar Token
		const token = signToken({ userId: user!.user_id, email: user!.email, role: user!.role })

		// Retornar datos (sin password ni refresh token)
		const { password: _, refresh_token: __, ...userData } = user!

		return {
			user: userData,
			token,
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
