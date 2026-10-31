import { prisma } from '../../../utils/prisma'
import { parseProductUpdate } from '../../../utils/catalog-validation'
import { getProduct } from '../../../modules/catalog/get-product'
import { updateProduct } from '../../../modules/catalog/update-product'
import { deleteProduct } from '../../../modules/catalog/delete-product'
import { createPrismaProductsRepository } from '../../../modules/catalog/prisma-catalog-repository'

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Product ID is required' })
	}

	const repo = createPrismaProductsRepository(prisma)

	if (method === 'GET') {
		return await getProduct({ products: repo }, { id })
	}

	if (method === 'PUT') {
		const data = parseProductUpdate(await readBody(event))
		return await updateProduct({ products: repo }, { id, data })
	}

	if (method === 'DELETE') {
		return await deleteProduct({ products: repo }, { id })
	}
})
