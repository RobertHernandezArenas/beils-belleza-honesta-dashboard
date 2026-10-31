import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { deleteClient } from '../../modules/clients/delete-client'
import { createPrismaClientsRepository } from '../../modules/clients/prisma-clients-repository'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		return await deleteClient(
			{ clients: createPrismaClientsRepository(prisma) },
			{ id },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
		}
		console.error('Error deleting client:', error)
		throw createError({
			statusCode: 500,
			statusMessage: error?.message || 'Error al eliminar cliente',
		})
	}
})
