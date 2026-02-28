import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async event => {
	try {
		const users = await prisma.user.findMany({
			orderBy: { created_at: 'desc' },
		})
		// Remove passwords from response
		return users.map(u => {
			const { password, ...rest } = u
			return rest
		})
	} catch (error) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al obtener usuarios',
		})
	}
})
