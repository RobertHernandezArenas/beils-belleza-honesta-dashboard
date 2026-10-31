import { prisma } from '../../utils/prisma'
import { parseServiceCreate } from '../../utils/catalog-validation'
import { listServices } from '../../modules/catalog/list-services'
import { createService } from '../../modules/catalog/create-service'
import { createPrismaServicesRepository } from '../../modules/catalog/prisma-catalog-repository'

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const repo = createPrismaServicesRepository(prisma)

	if (method === 'GET') {
		const query = getQuery(event)
		const search = query.search as string | undefined
		return await listServices({ services: repo }, { search })
	}

	if (method === 'POST') {
		const parsedData = parseServiceCreate(await readBody(event))
		return await createService({ services: repo }, parsedData)
	}
})
