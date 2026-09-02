import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { toApiError } from '../../utils/errors'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const query = getQuery(event)
		const clientId = query.clientId as string
		const treatmentType = query.treatmentType as string | undefined

		if (!clientId) {
			throw createError({ statusCode: 400, statusMessage: 'El ID de cliente es obligatorio' })
		}

		const whereClause: Record<string, unknown> = { user_id: clientId }
		if (treatmentType && ['LASER_SHR', 'INDIBA'].includes(treatmentType)) {
			whereClause.treatment_type = treatmentType
		}

		const zones = await prisma.treatmentZone.findMany({
			where: whereClause,
			include: {
				sessions: {
					orderBy: { session_number: 'desc' },
					include: {
						staff: { select: { user_id: true, name: true, surname: true } },
						client_package: {
							include: {
								package: { select: { name: true, type: true } }
							}
						},
						booking: { select: { booking_date: true, start_time: true } }
					}
				}
			},
			orderBy: { created_at: 'asc' }
		})

		return zones
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al obtener zonas de tratamiento'
		})
	}
})
