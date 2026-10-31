import { prisma } from '../../../utils/prisma'
import { parseProductCreate } from '../../../utils/catalog-validation'
import { listProducts } from '../../../modules/catalog/list-products'
import { createProduct } from '../../../modules/catalog/create-product'
import { createPrismaProductsRepository } from '../../../modules/catalog/prisma-catalog-repository'

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const repo = createPrismaProductsRepository(prisma)

	if (method === 'GET') {
		const query = getQuery(event)
		const search = query.search as string | undefined
		return await listProducts({ products: repo }, { search })
	}

	if (method === 'POST') {
		const data = parseProductCreate(await readBody(event))
		return await createProduct({ products: repo }, data)
	}
})
