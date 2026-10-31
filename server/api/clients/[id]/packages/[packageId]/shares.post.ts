import { prisma } from '../../../../../utils/prisma'
import { requireAdmin } from '../../../../../utils/auth'
import { toApiError } from '../../../../../utils/errors'
import { z } from 'zod'
import { shareClientPackage } from '../../../../../modules/client-packages/share-client-package'
import { createPrismaClientPackagesRepository } from '../../../../../modules/client-packages/prisma-client-packages-repository'

const shareSchema = z.object({
	user_ids: z.array(z.string().min(1).max(100)).min(1, 'Selecciona al menos una persona').max(20),
})

/** Shares the client's bono with other registered clients (they consume from the same balance). */
export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const clientId = getRouterParam(event, 'id')
		const packageId = getRouterParam(event, 'packageId')
		if (!clientId || !packageId) {
			throw createError({ statusCode: 400, statusMessage: 'Cliente y bono requeridos' })
		}

		const { user_ids } = shareSchema.parse(await readBody(event))

		return await shareClientPackage(
			{ clientPackages: createPrismaClientPackagesRepository(prisma) },
			{ clientId, packageId, user_ids },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error sharing client package:', error)
		if (error.statusCode) throw error
		throw createError({ statusCode: 500, statusMessage: 'Error al compartir el bono' })
	}
})
