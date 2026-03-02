import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Product ID is required' })
	}

	if (method === 'GET') {
		const product = await prisma.product.findUnique({
			where: { product_id: id },
			include: {
				brand: true,
				category: true,
				subcategory: true,
				tags: { include: { tag: true } },
			},
		})

		if (!product) {
			throw createError({ statusCode: 404, statusMessage: 'Product not found' })
		}

		return product
	}

	if (method === 'PUT') {
		const body = await readBody(event)
		const { tags, ...productData } = body

		if (productData.brand_id === '') productData.brand_id = null
		if (productData.category_id === '') productData.category_id = null
		if (productData.subcategory_id === '') productData.subcategory_id = null

		// En un entorno productivo robusto con Prisma, lo mejor es vaciar la tabla joiner y reescribir
		const updatedProduct = await prisma.$transaction(async tx => {
			if (tags !== undefined) {
				await tx.productTag.deleteMany({ where: { product_id: id } })
			}

			return await tx.product.update({
				where: { product_id: id },
				data: {
					...productData,
					...(tags && {
						tags: {
							create: tags.map((tagId: string) => ({
								tag: { connect: { tag_id: tagId } },
							})),
						},
					}),
				},
				include: {
					brand: { select: { name: true } },
					category: { select: { name: true } },
					subcategory: { select: { name: true } },
					tags: { include: { tag: true } },
				},
			})
		})

		return updatedProduct
	}

	if (method === 'DELETE') {
		// Prisma cascade on schema should handle productTags, packItems, cartItems deletion but double check if defined.
		await prisma.productTag.deleteMany({ where: { product_id: id } })
		await prisma.product.delete({ where: { product_id: id } })

		return { success: true }
	}
})
