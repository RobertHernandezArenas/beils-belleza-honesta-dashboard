

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
				{ code: { contains: search } },
			]
		}

		const packs = await prisma.pack.findMany({
			where: whereClause,
			include: {
				products: {
					include: { product: { select: { name: true, price: true } } },
				},
				services: {
					include: { service: { select: { name: true, price: true } } },
				},
			},
			orderBy: { created_at: 'desc' },
		})

		return packs
	}

	if (method === 'POST') {
		const body = await readBody(event)
		const { products, services, ...packData } = body

		// Wrap in transaction to ensure all items are inserted or none
		const pack = await prisma.$transaction(async tx => {
			return await tx.pack.create({
				data: {
					...packData,
					products:
						products && products.length > 0
							? {
									create: products.map((p: any) => ({
										quantity: p.quantity,
										product: { connect: { product_id: p.product_id } },
									})),
								}
							: undefined,
					services:
						services && services.length > 0
							? {
									create: services.map((s: any) => ({
										quantity: s.quantity,
										service: { connect: { service_id: s.service_id } },
									})),
								}
							: undefined,
				},
				include: {
					products: { include: { product: true } },
					services: { include: { service: true } },
				},
			})
		})

		return pack
	}
})
