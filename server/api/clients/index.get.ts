import type { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { maskDocument } from '../../utils/privacy'

export default defineEventHandler(async event => {
	try {
		// Only admins can list clients
		requireAdmin(event)

		const query = getQuery(event)
		const search = ((query.search as string) || '').trim()
		const page = parseInt(query.page as string) || 1
		const limit = parseInt(query.limit as string) || 10
		const skip = (page - 1) * limit

		const whereClause: Prisma.UserWhereInput = { role: 'CLIENT' }
		if (search) {
			// Multi-term search: split the query into words and require EVERY word to
			// match at least one field (AND across words, OR across fields). This lets
			// "antonella delli" match name="Antonella" + surname="Delli Gatti", and
			// keeps digit-only terms matching the phone/document. Much more precise
			// than a single OR-contains over the whole string.
			const terms = search.split(/\s+/).filter(Boolean).slice(0, 6)
			whereClause.AND = terms.map(term => ({
				OR: [
					{ name: { contains: term } },
					{ surname: { contains: term } },
					{ email: { contains: term } },
					{ phone: { contains: term } },
					{ document_number: { contains: term } },
				],
			}))
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
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al obtener clientes',
		})
	}
})

