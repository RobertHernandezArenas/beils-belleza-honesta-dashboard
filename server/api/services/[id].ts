import { parseServiceUpdate } from '../../utils/catalog-validation'


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
		const data = parseServiceUpdate(await readBody(event))
		try {
			return await prisma.service.update({ where: { service_id: id }, data })
		} catch (rawError) {
			const code = (rawError as { code?: string }).code
			if (code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Ya existe un servicio con ese código' })
			if (code === 'P2025') throw createError({ statusCode: 404, statusMessage: 'Service not found' })
			throw rawError
		}
	}

	if (method === 'DELETE') {
		await prisma.service.delete({ where: { service_id: id } })
		return { success: true }
	}
})
