import { defineEventHandler, createError, getQuery } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async event => {
	try {
		const query = getQuery(event)
		const search = query.search as string

		let whereClause: any = { role: 'USER' }
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
	} catch (error) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al obtener clientes',
		})
	}
})
