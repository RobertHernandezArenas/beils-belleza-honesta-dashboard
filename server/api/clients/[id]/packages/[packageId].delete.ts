import { prisma } from '../../../../utils/prisma'
import { deleteClientPackage } from '../../../../modules/client-packages/delete-client-package'
import { createPrismaClientPackagesRepository } from '../../../../modules/client-packages/prisma-client-packages-repository'

export default defineEventHandler(async event => {
	try {
		const clientId = getRouterParam(event, 'id')
		const packageId = getRouterParam(event, 'packageId')

		if (!clientId || !packageId) {
			throw createError({ statusCode: 400, statusMessage: 'Client ID and Package ID required' })
		}

		return await deleteClientPackage(
			{ clientPackages: createPrismaClientPackagesRepository(prisma) },
			{ clientId, packageId },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error deleting client package:', error)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al desasignar el bono',
		})
	}
})
