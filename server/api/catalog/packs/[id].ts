import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Pack ID is required' })
	}

	if (method === 'GET') {
		const pack = await prisma.pack.findUnique({
			where: { pack_id: id },
			include: {
				products: { include: { product: true } },
				services: { include: { service: true } },
			},
		})

		if (!pack) {
			throw createError({ statusCode: 404, statusMessage: 'Pack not found' })
		}

		return pack
	}

	if (method === 'PUT') {
		const body = await readBody(event)
		const { products, services, ...packData } = body

		// Clean relations then recreate arrays within transaction
		const updatedPack = await prisma.$transaction(async tx => {
			if (products !== undefined) {
				await tx.packItemProduct.deleteMany({ where: { pack_id: id } })
			}

			if (services !== undefined) {
				await tx.packItemService.deleteMany({ where: { pack_id: id } })
			}

			return await tx.pack.update({
				where: { pack_id: id },
				data: {
					...packData,
					...(products && {
						products: {
							create: products.map((p: any) => ({
								quantity: p.quantity,
								product: { connect: { product_id: p.product_id } },
							})),
						},
					}),
					...(services && {
						services: {
							create: services.map((s: any) => ({
								quantity: s.quantity,
								service: { connect: { service_id: s.service_id } },
							})),
						},
					}),
				},
				include: {
					products: { include: { product: { select: { name: true } } } },
					services: { include: { service: { select: { name: true } } } },
				},
			})
		})

		return updatedPack
	}

	if (method === 'DELETE') {
		await prisma.packItemProduct.deleteMany({ where: { pack_id: id } })
		await prisma.packItemService.deleteMany({ where: { pack_id: id } })
		await prisma.pack.delete({ where: { pack_id: id } })

		return { success: true }
	}
})
