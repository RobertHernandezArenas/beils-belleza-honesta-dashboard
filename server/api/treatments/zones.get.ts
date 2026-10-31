import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { toApiError } from '../../utils/errors'
import { listZones } from '../../modules/treatments/list-zones'
import { createPrismaTreatmentsRepository } from '../../modules/treatments/prisma-treatments-repository'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const query = getQuery(event)
		const clientId = query.clientId as string | undefined
		const treatmentType = query.treatmentType as string | undefined

		return await listZones(
			{ treatments: createPrismaTreatmentsRepository(prisma) },
			{ clientId, treatmentType },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al obtener zonas de tratamiento',
		})
	}
})
