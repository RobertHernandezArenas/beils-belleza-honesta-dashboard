import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { getClient } from '../../modules/clients/get-client'
import { createPrismaClientsRepository } from '../../modules/clients/prisma-clients-repository'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const query = getQuery(event)
		const reveal = query.reveal === 'true'

		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		return await getClient(
			{ clients: createPrismaClientsRepository(prisma) },
			{ id, reveal },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error in GET /api/clients/[id]:', error)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al obtener el cliente',
		})
	}
})
