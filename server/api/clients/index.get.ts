import { defineEventHandler, createError, getQuery } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async event => {
	try {
		// Only admins can list clients
		requireAdmin(event)

		const query = getQuery(event)
		const search = query.search as string

		let whereClause: any = { role: 'CLIENT' }
		if (search) {
			whereClause = {
				...whereClause,
				OR: [
					{ name: { contains: search } },
					{ surname: { contains: search } },
					{ email: { contains: search } },
					{ phone: { contains: search } },
				],
			}
		}

		const clients = await prisma.user.findMany({
			where: whereClause,
			orderBy: { created_at: 'desc' },
			include: {
				_count: {
					select: { client_bookings: true, consents: true, debts: true },
				},
			},
		})

		// Remove passwords from response
		return clients.map(client => {
			const { password, ...rest } = client
			return rest
		})
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al obtener clientes',
		})
	}
})

