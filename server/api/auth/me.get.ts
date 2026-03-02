import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async event => {
	// The user info is already validated and decoded by server/middleware/auth.ts
	const decoded = event.context.user

	if (!decoded || !decoded.userId) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Unauthorized access',
		})
	}

	const user = await prisma.user.findUnique({
		where: { user_id: decoded.userId },
		select: {
			user_id: true,
			email: true,
			name: true,
			surname: true,
			role: true,
			status: true,
			document_type: true,
			document_id: true,
			phone: true,
			created_at: true,
		},
	})

	if (!user || user.status !== 'ON') {
		throw createError({
			statusCode: 403,
			statusMessage: 'Cuenta inactiva o no encontrada. Contacta con soporte admin.',
		})
	}

	return {
		user,
	}
})
