import { parseProductUpdate } from '../../../utils/catalog-validation'


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
		const data = parseProductUpdate(await readBody(event))
		try {
			return await prisma.product.update({ where: { product_id: id }, data })
		} catch (rawError) {
			const code = (rawError as { code?: string }).code
			if (code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Ya existe un producto con ese SKU o código de barras' })
			if (code === 'P2025') throw createError({ statusCode: 404, statusMessage: 'Product not found' })
			throw rawError
		}
	}

	if (method === 'DELETE') {
		await prisma.product.delete({ where: { product_id: id } })

		return { success: true }
	}
})
