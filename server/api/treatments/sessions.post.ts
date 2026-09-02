import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { toApiError } from '../../utils/errors'
import { z } from 'zod'

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
	decrement_package: z.boolean().optional().default(false)
})

export default defineEventHandler(async event => {
	try {
		const adminUser = requireAdmin(event)
		const body = await readBody(event)
		const validated = createSessionSchema.parse(body)

		// 1. Verify zone belongs to client
		const zone = await prisma.treatmentZone.findFirst({
			where: {
				zone_id: validated.zone_id,
				user_id: validated.client_id
			}
		})

		if (!zone) {
			throw createError({
				statusCode: 404,
				statusMessage: 'Zona de tratamiento no encontrada para este cliente'
			})
		}

		// 2. Determine session number if not explicitly specified
		let sessionNumber = validated.session_number
		if (!sessionNumber) {
			const count = await prisma.treatmentSession.count({
				where: { zone_id: validated.zone_id }
			})
			sessionNumber = count + 1
		}

		// 3. Create session in a transaction (with optional package decrement)
		const result = await prisma.$transaction(async tx => {
			if (validated.client_package_id && validated.decrement_package) {
				const clientPkg = await tx.clientPackage.findUnique({
					where: { client_package_id: validated.client_package_id }
				})

				if (clientPkg && clientPkg.remaining_sessions > 0) {
					await tx.clientPackage.update({
						where: { client_package_id: validated.client_package_id },
						data: {
							remaining_sessions: { decrement: 1 }
						}
					})
				}
			}

			const session = await tx.treatmentSession.create({
				data: {
					zone_id: validated.zone_id,
					client_id: validated.client_id,
					staff_id: validated.staff_id || adminUser.userId || null,
					client_package_id: validated.client_package_id || null,
					booking_id: validated.booking_id || null,
					session_number: sessionNumber,
					session_date: new Date(validated.session_date),
					parameters: validated.parameters.trim(),
					skin_reaction: validated.skin_reaction?.trim() || null,
					observations: validated.observations?.trim() || null
				},
				include: {
					staff: { select: { user_id: true, name: true, surname: true } },
					client_package: {
						include: {
							package: { select: { name: true, type: true } }
						}
					},
					booking: { select: { booking_date: true, start_time: true } }
				}
			})

			return session
		})

		return result
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Error al registrar sesión de tratamiento'
		})
	}
})
