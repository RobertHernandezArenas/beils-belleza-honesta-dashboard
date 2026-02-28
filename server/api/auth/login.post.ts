import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../utils/prisma'
import { signToken } from '../../utils/jwt'

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
})

export default defineEventHandler(async event => {
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

	if (!user) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Correo o contraseña incorrectos',
		})
	}

	if (user.status !== 'ON') {
		throw createError({
			statusCode: 403,
			statusMessage: 'Cuenta inactiva. Contacta con el administrador.',
		})
	}

	// Verificar contraseña
	const isValid = await bcrypt.compare(password, user.password)

	if (!isValid) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Correo o contraseña incorrectos',
		})
	}

	// Generar Token
	const token = signToken({ userId: user.user_id, email: user.email, role: user.role })

	// Retornar datos (sin password original)
	const { password: _, ...userData } = user

	return {
		user: userData,
		token,
	}
})
