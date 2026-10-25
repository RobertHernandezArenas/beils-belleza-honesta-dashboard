import { prisma } from '../../utils/prisma'
import { parseCatalogPackage, catalogPackageSessions } from '../../utils/package-validation'

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
		const input = parseCatalogPackage(await readBody(event))
		const { name, description, type, price, service_id, items } = input
		const calculatedSessions = catalogPackageSessions(input)

		const updated = await prisma.$transaction(async (tx) => {
			if (items) {
				await tx.packageItem.deleteMany({
					where: { package_id: id }
				})
			}

			return await tx.package.update({
				where: { package_id: id },
				data: {
					name,
					description,
					type,
					price,
					total_sessions: calculatedSessions,
					service_id,
					items: items ? { create: items } : undefined
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
