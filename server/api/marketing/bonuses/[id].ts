

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Bonus ID is required' })
	}

	if (method === 'GET') {
		const bonus = await prisma.bonus.findUnique({
			where: { bonus_id: id },
			include: { service: { select: { name: true, price: true } } },
		})

		if (!bonus) {
			throw createError({ statusCode: 404, statusMessage: 'Bonus not found' })
		}

		return bonus
	}

	if (method === 'PUT') {
		const body = await readBody(event)

		const updatedBonus = await prisma.bonus.update({
			where: { bonus_id: id },
			data: body,
			include: { service: { select: { name: true } } },
		})

		return updatedBonus
	}

	if (method === 'DELETE') {
		await prisma.bonus.delete({ where: { bonus_id: id } })
		return { success: true }
	}
})
