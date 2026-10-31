import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { parsePagination } from '../../utils/pagination'
import { listClients } from '../../modules/clients/list-clients'
import { createPrismaClientsRepository } from '../../modules/clients/prisma-clients-repository'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)

		const query = getQuery(event)
		const search = ((query.search as string) || '').trim()
		const status = ((query.status as string) || '').trim().toUpperCase()
		const { page, limit, skip } = parsePagination(query)

		return await listClients(
			{ clients: createPrismaClientsRepository(prisma) },
			{ search, status, page, limit, skip },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al obtener clientes',
		})
	}
})
