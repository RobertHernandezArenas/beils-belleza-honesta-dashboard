import { prisma } from '../../utils/prisma'
import { parseServiceUpdate } from '../../utils/catalog-validation'
import { getService } from '../../modules/catalog/get-service'
import { updateService } from '../../modules/catalog/update-service'
import { deleteService } from '../../modules/catalog/delete-service'
import { createPrismaServicesRepository } from '../../modules/catalog/prisma-catalog-repository'

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Service ID is required' })
	}

	const repo = createPrismaServicesRepository(prisma)

	if (method === 'GET') {
		return await getService({ services: repo }, { id })
	}

	if (method === 'PUT') {
		const data = parseServiceUpdate(await readBody(event))
		return await updateService({ services: repo }, { id, data })
	}

	if (method === 'DELETE') {
		return await deleteService({ services: repo }, { id })
	}
})
