import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../utils/prisma'
import { signToken } from '../../utils/jwt'

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
})

export default defineEventHandler(async event => {
	console.log('[LOGIN] Request received')
	try {
		const body = await readBody(event)
		console.log('[LOGIN] Body email:', body?.email)

		// Validar Input
		const result = loginSchema.safeParse(body)
		if (!result.success) {
			console.log('[LOGIN] Validation failed:', result.error.format())
			throw createError({
				statusCode: 400,
				statusMessage: 'Credenciales inválidas o formato incorrecto',
			})
		}

		const { email, password } = result.data

		// Buscar usuario en BD
		console.log('[LOGIN] Searching user in DB...')
		const user = await prisma.user.findUnique({
			where: { email },
		})

		if (!user) {
			console.log('[LOGIN] User not found')
			throw createError({
				statusCode: 401,
				statusMessage: 'Correo o contraseña incorrectos',
			})
		}

		console.log('[LOGIN] User found, status:', user.status)

		if (user.status !== 'ON') {
			throw createError({
				statusCode: 403,
				statusMessage: 'Cuenta inactiva. Contacta con el administrador.',
			})
		}

		// Verificar contraseña
		console.log('[LOGIN] Verifying password...')
		const isValid = await bcrypt.compare(password, user.password)

		if (!isValid) {
			console.log('[LOGIN] Invalid password')
			throw createError({
				statusCode: 401,
				statusMessage: 'Correo o contraseña incorrectos',
			})
		}

		// Generar Token
		const token = signToken({ userId: user.user_id, email: user.email, role: user.role })
		console.log('[LOGIN] Token generated successfully')

		// Retornar datos (sin password original)
		const { password: _, ...userData } = user

		return {
			user: userData,
			token,
		}
	} catch (error: any) {
		console.error('[LOGIN] Error critical:', error)
		
		// If it's already a Nuxt error, rethrow it
		if (error.statusCode) throw error

		// Otherwise, throw a generic 500 with the error message for debugging
		throw createError({
			statusCode: 500,
			statusMessage: `Internal Server Error: ${error.message || 'Unknown error'}`,
			data: error
		})
	}
})
