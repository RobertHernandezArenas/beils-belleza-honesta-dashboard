import { defineEventHandler, getHeader, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { verifyToken } from '../../utils/jwt'

export default defineEventHandler(async event => {
	const authHeader = getHeader(event, 'Authorization')

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Token no proporcionado o formato inválido',
		})
	}

	const token = (authHeader as string).split(' ')[1]

	if (!token) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Token no proporcionado o formato inválido',
		})
	}

	const decoded = verifyToken(token)

	if (!decoded || !decoded.userId) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Token expirado o inválido',
		})
	}

	const user = await prisma.user.findUnique({
		where: { user_id: decoded.userId },
	})

	if (!user) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Usuario no encontrado',
		})
	}

	const { password: _, ...userData } = user

	return {
		user: userData,
	}
})
