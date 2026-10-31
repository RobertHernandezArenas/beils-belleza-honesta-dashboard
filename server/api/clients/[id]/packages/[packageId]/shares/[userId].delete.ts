import { prisma } from '../../../../../../utils/prisma'
import { requireAdmin } from '../../../../../../utils/auth'
import { toApiError } from '../../../../../../utils/errors'
import { revokeClientPackageShare } from '../../../../../../modules/client-packages/revoke-client-package-share'
import { createPrismaClientPackagesRepository } from '../../../../../../modules/client-packages/prisma-client-packages-repository'

/**
 * Revokes a beneficiary's access to the owner's bono. Sessions they already consumed keep
 * their own history (treatment sessions / tickets reference the client, not the share).
 */
export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const clientId = getRouterParam(event, 'id')
		const packageId = getRouterParam(event, 'packageId')
		const userId = getRouterParam(event, 'userId')
		if (!clientId || !packageId || !userId) {
			throw createError({ statusCode: 400, statusMessage: 'Cliente, bono y beneficiaria requeridos' })
		}

		return await revokeClientPackageShare(
			{ clientPackages: createPrismaClientPackagesRepository(prisma) },
			{ clientId, packageId, userId },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error revoking client package share:', error)
		if (error.statusCode) throw error
		throw createError({ statusCode: 500, statusMessage: 'Error al quitar el acceso al bono' })
	}
})
