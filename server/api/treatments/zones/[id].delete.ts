import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { toApiError } from '../../../utils/errors'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const zoneId = getRouterParam(event, 'id')
		if (!zoneId) {
			throw createError({ statusCode: 400, statusMessage: 'ID de zona requerido' })
		}

		await prisma.treatmentZone.delete({
			where: { zone_id: zoneId }
		})

		return { success: true, message: 'Zona eliminada correctamente' }
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al eliminar zona de tratamiento'
		})
	}
})
