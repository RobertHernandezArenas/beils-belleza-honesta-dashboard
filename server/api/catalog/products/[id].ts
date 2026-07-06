

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Product ID is required' })
	}

	if (method === 'GET') {
		const product = await prisma.product.findUnique({
			where: { product_id: id },
		})

		if (!product) {
			throw createError({ statusCode: 404, statusMessage: 'Product not found' })
		}

		return product
	}

	if (method === 'PUT') {
		const body = await readBody(event)

		const updatedProduct = await prisma.product.update({
			where: { product_id: id },
			data: body,
		})

		return updatedProduct
	}

	if (method === 'DELETE') {
		await prisma.product.delete({ where: { product_id: id } })

		return { success: true }
	}
})
