import { parseProductCreate } from '../../../utils/catalog-validation'
import type { Prisma } from '@prisma/client'


export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const search = query.search as string | undefined

		const whereClause: Prisma.ProductWhereInput = {}

		if (search) {
			whereClause.OR = [
				{ name: { contains: search } },
				{ description: { contains: search } },
				{ sku: { contains: search } },
				{ barcode: { contains: search } },
			]
		}

		const products = await prisma.product.findMany({
			where: whereClause,
			select: {
				product_id: true,
				name: true,
				sku: true,
				barcode: true,
				image_url: true,
				price: true,
				stock: true,
				min_stock: true,
				status: true,
			},
			orderBy: { created_at: 'desc' },
		})

		return products
	}

	if (method === 'POST') {
		// Allow-listed, validated fields only (no mass assignment of ids or timestamps)
		const data = parseProductCreate(await readBody(event))
		try {
			return await prisma.product.create({ data })
		} catch (rawError) {
			if ((rawError as { code?: string }).code === 'P2002') {
				throw createError({ statusCode: 409, statusMessage: 'Ya existe un producto con ese SKU o código de barras' })
			}
			throw rawError
		}
	}
})
