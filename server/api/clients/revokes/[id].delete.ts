import { prisma } from '../../../utils/prisma'
import { deleteRevoke } from '../../../modules/compliance/delete-revoke'
import { createPrismaRevokesRepository } from '../../../modules/compliance/prisma-compliance-repository'

export default defineEventHandler(async event => {
	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		return await deleteRevoke(
			{ revokes: createPrismaRevokesRepository(prisma) },
			{ id },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Revocación no encontrada' })
		}
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al eliminar revocación',
		})
	}
})
