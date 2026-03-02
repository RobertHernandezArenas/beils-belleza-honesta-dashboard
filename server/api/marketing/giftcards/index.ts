

export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const search = query.search as string | undefined

		const whereClause: any = {}

		if (search) {
			whereClause.OR = [{ code: { contains: search } }]
		}

		const giftcards = await prisma.giftcard.findMany({
			where: whereClause,
			orderBy: { created_at: 'desc' },
		})

		return giftcards
	}

	if (method === 'POST') {
		const body = await readBody(event)

		const giftcard = await prisma.giftcard.create({
			data: {
				...body,
				issue_date: body.issue_date ? new Date(body.issue_date) : new Date(),
				expiration_date: body.expiration_date ? new Date(body.expiration_date) : null,
				current_balance: body.initial_balance, // By default current = initial
			},
		})

		return giftcard
	}
})
