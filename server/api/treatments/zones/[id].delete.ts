import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { toApiError } from '../../../utils/errors'
import { deleteZone } from '../../../modules/treatments/delete-zone'
import { createPrismaTreatmentsRepository } from '../../../modules/treatments/prisma-treatments-repository'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const zoneId = getRouterParam(event, 'id')
		if (!zoneId) {
			throw createError({ statusCode: 400, statusMessage: 'ID de zona requerido' })
		}

		return await deleteZone(
			{ treatments: createPrismaTreatmentsRepository(prisma) },
			{ zoneId },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al eliminar zona de tratamiento',
		})
	}
})
