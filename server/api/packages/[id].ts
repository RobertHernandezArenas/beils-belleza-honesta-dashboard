import { prisma } from '../../utils/prisma'
import { parseCatalogPackage } from '../../utils/package-validation'
import { getPackage } from '../../modules/packages/get-package'
import { updatePackage } from '../../modules/packages/update-package'
import { deletePackage } from '../../modules/packages/delete-package'
import { createPrismaPackagesRepository } from '../../modules/packages/prisma-packages-repository'

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Package ID required' })
	}

	const repo = createPrismaPackagesRepository(prisma)

	if (method === 'GET') {
		return await getPackage({ packages: repo }, { id })
	}

	if (method === 'PUT') {
		const input = parseCatalogPackage(await readBody(event))
		return await updatePackage({ packages: repo }, { id, input })
	}

	if (method === 'DELETE') {
		return await deletePackage({ packages: repo }, { id })
	}
})
