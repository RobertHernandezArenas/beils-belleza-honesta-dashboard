import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		const client = await prisma.user.findUnique({
			where: { user_id: id, role: 'CLIENT' },
			include: {
				consents: true,
				questionnaires: true,
				revokes: true,
				client_bookings: {
					orderBy: { booking_date: 'desc' },
					take: 5,
				},
				debts: {
					where: { status: 'pending' },
				},
			},
		})

		if (!client) {
			throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
		}

		// Remove password from response
		const { password, ...rest } = client
		return rest
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al obtener el cliente',
		})
	}
})
