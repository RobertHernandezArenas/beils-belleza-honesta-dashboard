

export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const search = query.search as string | undefined

		const whereClause: any = {}

		if (search) {
			whereClause.OR = [{ name: { contains: search } }, { description: { contains: search } }]
		}

		const bonuses = await prisma.bonus.findMany({
			where: whereClause,
			include: { service: { select: { name: true } } },
			orderBy: { created_at: 'desc' },
		})

		return bonuses
	}

	if (method === 'POST') {
		const body = await readBody(event)

		const bonus = await prisma.bonus.create({
			data: body,
			include: { service: { select: { name: true } } },
		})

		return bonus
	}
})
