import { prisma } from '../../utils/prisma'
import { listPackages } from '../../modules/packages/list-packages'
import { createPrismaPackagesRepository } from '../../modules/packages/prisma-packages-repository'

export default defineEventHandler(async () => {
	try {
		return await listPackages({
			packages: createPrismaPackagesRepository(prisma),
		})
	} catch (rawError) {
		const error = toApiError(rawError)
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al obtener paquetes',
		})
	}
})
