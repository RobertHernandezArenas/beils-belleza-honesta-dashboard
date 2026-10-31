import { prisma } from '../../../utils/prisma'
import { listRevokes } from '../../../modules/compliance/list-revokes'
import { createPrismaRevokesRepository } from '../../../modules/compliance/prisma-compliance-repository'

export default defineEventHandler(async event => {
	try {
		const query = getQuery(event)
		const userId = query.user_id as string | undefined

		return await listRevokes(
			{ revokes: createPrismaRevokesRepository(prisma) },
			{ userId },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al obtener revocaciones',
		})
	}
})
