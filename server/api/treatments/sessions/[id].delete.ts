import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { toApiError } from '../../../utils/errors'
import { deleteSession } from '../../../modules/treatments/delete-session'
import { createPrismaTreatmentsRepository } from '../../../modules/treatments/prisma-treatments-repository'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const sessionId = getRouterParam(event, 'id')
		if (!sessionId) {
			throw createError({ statusCode: 400, statusMessage: 'ID de sesión requerido' })
		}

		return await deleteSession(
			{ treatments: createPrismaTreatmentsRepository(prisma) },
			{ sessionId },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al eliminar sesión de tratamiento',
		})
	}
})
