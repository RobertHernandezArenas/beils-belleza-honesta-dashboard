

export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const search = query.search as string | undefined

		const whereClause: any = {}

		if (search) {
			whereClause.OR = [{ code: { contains: search } }, { description: { contains: search } }]
		}

		const coupons = await prisma.coupon.findMany({
			where: whereClause,
			orderBy: { created_at: 'desc' },
		})

		return coupons
	}

	if (method === 'POST') {
		const body = await readBody(event)

		const coupon = await prisma.coupon.create({
			data: {
				...body,
				valid_from: body.valid_from ? new Date(body.valid_from) : null,
				valid_until: body.valid_until ? new Date(body.valid_until) : null,
			},
		})

		return coupon
	}
})
