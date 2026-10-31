import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { toApiError } from '../../utils/errors'
import { z } from 'zod'
import { createSession } from '../../modules/treatments/create-session'
import { createPrismaTreatmentsRepository } from '../../modules/treatments/prisma-treatments-repository'

const createSessionSchema = z.object({
	zone_id: z.string().min(1, 'La zona es obligatoria'),
	client_id: z.string().min(1, 'El cliente es obligatorio'),
	staff_id: z.string().optional().nullable(),
	client_package_id: z.string().optional().nullable(),
	booking_id: z.string().optional().nullable(),
	session_number: z.number().int().positive().optional(),
	session_date: z.string().min(1, 'La fecha de la sesión es obligatoria'),
	parameters: z.string().min(1, 'Los parámetros técnicos son obligatorios'),
	skin_reaction: z.string().optional().nullable(),
	observations: z.string().optional().nullable(),
	decrement_package: z.boolean().optional().default(false),
})

export default defineEventHandler(async event => {
	try {
		const adminUser = requireAdmin(event)
		const body = await readBody(event)
		const validated = createSessionSchema.parse(body)

		return await createSession(
			{ treatments: createPrismaTreatmentsRepository(prisma) },
			validated,
			adminUser.userId,
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Error al registrar sesión de tratamiento',
		})
	}
})
