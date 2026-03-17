import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { maskDocument } from '../../utils/privacy'

export default defineEventHandler(async event => {
	try {
		// Only admins can list clients
		requireAdmin(event)

		const query = getQuery(event)
		const search = query.search as string
		const page = parseInt(query.page as string) || 1
		const limit = parseInt(query.limit as string) || 10
		const skip = (page - 1) * limit

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

		// Use transaction to get total and data in one go
		const [total, clients] = await Promise.all([
			prisma.user.count({ where: whereClause }),
			prisma.user.findMany({
				where: whereClause,
				orderBy: { created_at: 'desc' },
				skip,
				take: limit,
				select: {
					user_id: true,
					name: true,
					surname: true,
					email: true,
					phone: true,
					document_type: true,
					document_number: true,
					status: true,
					avatar: true,
					_count: {
						select: { client_bookings: true, consents: true },
					},
				},
			}),
		])

		return {
			data: clients.map(client => ({
				...client,
				document_number: maskDocument(client.document_number),
			})),
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		}
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al obtener clientes',
		})
	}
})

