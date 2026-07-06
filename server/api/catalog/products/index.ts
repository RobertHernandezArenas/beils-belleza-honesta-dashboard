

export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const search = query.search as string | undefined

		const whereClause: any = {}

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
		const body = await readBody(event)
		const product = await prisma.product.create({
			data: body,
		})

		return product
	}
})
