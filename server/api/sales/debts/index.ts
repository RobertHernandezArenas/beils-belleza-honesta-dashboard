

export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const status = query.status as string | undefined

		const whereClause: any = {}
		if (status) whereClause.status = status

		const debts = await prisma.debt.findMany({
			where: whereClause,
			include: {
				user: { select: { name: true, surname: true, phone: true } },
				cart: { select: { total: true, created_at: true } },
			},
			orderBy: { created_at: 'desc' },
		})

		return debts
	}

	if (method === 'POST') {
		const body = await readBody(event)

		const debt = await prisma.debt.create({
			data: {
				...body,
				remaining: body.amount,
				due_date: body.due_date ? new Date(body.due_date) : null,
			},
			include: { user: { select: { name: true, surname: true } } },
		})

		return debt
	}
})
