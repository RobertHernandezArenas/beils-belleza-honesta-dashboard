import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Service ID is required' })
	}

	if (method === 'GET') {
		const service = await prisma.service.findUnique({
			where: { service_id: id },
		})

		if (!service) {
			throw createError({ statusCode: 404, statusMessage: 'Service not found' })
		}

		return service
	}

	if (method === 'PUT') {
		const body = await readBody(event)

		const updatedService = await prisma.service.update({
			where: { service_id: id },
			data: body,
		})

		return updatedService
	}

	if (method === 'DELETE') {
		await prisma.service.delete({ where: { service_id: id } })
		return { success: true }
	}
})
