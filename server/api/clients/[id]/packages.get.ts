import { prisma } from '../../../utils/prisma'
import { listClientPackages } from '../../../modules/client-packages/list-client-packages'
import { createPrismaClientPackagesRepository } from '../../../modules/client-packages/prisma-client-packages-repository'

export default defineEventHandler(async event => {
	try {
		const clientId = getRouterParam(event, 'id')
		if (!clientId) {
			throw createError({ statusCode: 400, statusMessage: 'Client ID required' })
		}

		return await listClientPackages(
			{ clientPackages: createPrismaClientPackagesRepository(prisma) },
			{ clientId, now: new Date() },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error fetching client packages:', error)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error fetching client packages',
		})
	}
})
