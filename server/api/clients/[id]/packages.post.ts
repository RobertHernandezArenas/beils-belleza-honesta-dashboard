import { prisma } from '../../../utils/prisma'
import { parsePackageAssignment } from '../../../utils/package-validation'
import { assignClientPackage } from '../../../modules/client-packages/assign-client-package'
import { createPrismaClientPackagesRepository } from '../../../modules/client-packages/prisma-client-packages-repository'

export default defineEventHandler(async event => {
	try {
		const clientId = getRouterParam(event, 'id')
		if (!clientId) {
			throw createError({ statusCode: 400, statusMessage: 'Client ID required' })
		}

		const input = parsePackageAssignment(await readBody(event))

		return await assignClientPackage(
			{ clientPackages: createPrismaClientPackagesRepository(prisma) },
			{ clientId, input },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		console.error('Error assigning client package:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al asignar paquete al cliente',
		})
	}
})
