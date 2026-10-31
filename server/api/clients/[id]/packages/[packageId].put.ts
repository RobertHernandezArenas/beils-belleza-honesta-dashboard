import { prisma } from '../../../../utils/prisma'
import { parseClientPackageUpdate } from '../../../../utils/package-validation'
import { updateClientPackage } from '../../../../modules/client-packages/update-client-package'
import { createPrismaClientPackagesRepository } from '../../../../modules/client-packages/prisma-client-packages-repository'

export default defineEventHandler(async event => {
	try {
		const clientId = getRouterParam(event, 'id')
		const packageId = getRouterParam(event, 'packageId')

		if (!clientId || !packageId) {
			throw createError({ statusCode: 400, statusMessage: 'Client ID and Package ID required' })
		}

		const input = parseClientPackageUpdate(await readBody(event))

		return await updateClientPackage(
			{ clientPackages: createPrismaClientPackagesRepository(prisma) },
			{ clientId, packageId, input },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error updating client package:', error)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al actualizar el bono',
		})
	}
})
