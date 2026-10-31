import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { toApiError } from '../../utils/errors'
import { z } from 'zod'
import { createZone } from '../../modules/treatments/create-zone'
import { createPrismaTreatmentsRepository } from '../../modules/treatments/prisma-treatments-repository'

const createZoneSchema = z.object({
	user_id: z.string().min(1, 'El cliente es obligatorio'),
	treatment_type: z.enum(['LASER_SHR', 'INDIBA']),
	zone_name: z.string().min(2, 'El nombre de la zona es obligatorio'),
	phototype: z.string().optional().nullable(),
	hair_thickness: z.string().optional().nullable(),
	hair_color: z.string().optional().nullable(),
	hair_density: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
})

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const body = await readBody(event)
		const validated = createZoneSchema.parse(body)

		return await createZone(
			{ treatments: createPrismaTreatmentsRepository(prisma) },
			validated,
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos al crear zona de tratamiento',
		})
	}
})
