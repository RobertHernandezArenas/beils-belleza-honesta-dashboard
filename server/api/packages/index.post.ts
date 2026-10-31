import { prisma } from '../../utils/prisma'
import { parseCatalogPackage } from '../../utils/package-validation'
import { createPackage } from '../../modules/packages/create-package'
import { createPrismaPackagesRepository } from '../../modules/packages/prisma-packages-repository'

export default defineEventHandler(async event => {
	try {
		const input = parseCatalogPackage(await readBody(event))
		return await createPackage(
			{ packages: createPrismaPackagesRepository(prisma) },
			input,
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		console.error('Error creating package:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al crear el paquete',
		})
	}
})
