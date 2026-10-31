import { prisma } from '../../../utils/prisma'
import { z } from 'zod'
import { createRevoke } from '../../../modules/compliance/create-revoke'
import { createPrismaRevokesRepository } from '../../../modules/compliance/prisma-compliance-repository'

const revokeSchema = z.object({
	user_id: z.string().min(1, 'El cliente es obligatorio'),
	reason: z.string().optional(),
	date_revoked: z.string().optional(),
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const parsedData = revokeSchema.parse(body)

		return await createRevoke(
			{ revokes: createPrismaRevokesRepository(prisma) },
			parsedData,
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al registrar revocación',
		})
	}
})
