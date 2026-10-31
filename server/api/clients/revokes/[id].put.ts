import { prisma } from '../../../utils/prisma'
import { z } from 'zod'
import { updateRevoke } from '../../../modules/compliance/update-revoke'
import { createPrismaRevokesRepository } from '../../../modules/compliance/prisma-compliance-repository'

const revokeUpdateSchema = z.object({
	reason: z.string().optional().nullable(),
	date_revoked: z.string().optional(),
})

export default defineEventHandler(async event => {
	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		const body = await readBody(event)
		const parsedData = revokeUpdateSchema.parse(body)

		return await updateRevoke(
			{ revokes: createPrismaRevokesRepository(prisma) },
			{ id, data: parsedData },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Revocación no encontrada' })
		}
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al actualizar revocación',
		})
	}
})
