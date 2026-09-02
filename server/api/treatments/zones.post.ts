import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { toApiError } from '../../utils/errors'
import { z } from 'zod'

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

		const zone = await prisma.treatmentZone.create({
			data: {
				user_id: validated.user_id,
				treatment_type: validated.treatment_type,
				zone_name: validated.zone_name.trim(),
				phototype: validated.phototype?.trim() || null,
				hair_thickness: validated.hair_thickness?.trim() || null,
				hair_color: validated.hair_color?.trim() || null,
				hair_density: validated.hair_density?.trim() || null,
				notes: validated.notes?.trim() || null,
				status: 'ACTIVE'
			},
			include: {
				sessions: true
			}
		})

		return zone
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos al crear zona de tratamiento'
		})
	}
})
