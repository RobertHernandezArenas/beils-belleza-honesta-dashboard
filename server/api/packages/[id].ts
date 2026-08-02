import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Package ID required' })
	}

	if (method === 'GET') {
		const pkg = await prisma.package.findUnique({
			where: { package_id: id },
			include: { items: true }
		})
		if (!pkg) throw createError({ statusCode: 404, statusMessage: 'Paquete no encontrado' })
		return pkg
	}

	if (method === 'PUT') {
		const body = await readBody(event)
		const { name, description, type, price, total_sessions, service_id, items } = body

		const calculatedSessions = type === 'MIXTO' && Array.isArray(items)
			? items.filter((it: any) => (it.item_type || 'SERVICE') === 'SERVICE').reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0)
			: Number(total_sessions || 1)

		const updated = await prisma.$transaction(async (tx) => {
			if (items && Array.isArray(items)) {
				await tx.packageItem.deleteMany({
					where: { package_id: id }
				})
			}

			return await tx.package.update({
				where: { package_id: id },
				data: {
					name,
					description,
					type: type || 'INDIVIDUAL',
					price: Number(price),
					total_sessions: calculatedSessions,
					service_id: service_id || null,
					items: items && Array.isArray(items) ? {
						create: items.map((it: any) => ({
							item_type: it.item_type || 'SERVICE',
							item_id: it.item_id,
							name: it.name,
							quantity: Number(it.quantity || 1),
							duration: Number(it.duration || 30)
						}))
					} : undefined
				},
				include: { items: true }
			})
		})

		return updated
	}

	if (method === 'DELETE') {
		await prisma.package.update({
			where: { package_id: id },
			data: { status: 'inactivo' }
		})
		return { success: true }
	}
})
