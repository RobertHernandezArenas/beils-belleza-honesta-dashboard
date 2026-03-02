

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Giftcard ID is required' })
	}

	if (method === 'GET') {
		const giftcard = await prisma.giftcard.findUnique({
			where: { giftcard_id: id },
		})

		if (!giftcard) {
			throw createError({ statusCode: 404, statusMessage: 'Giftcard not found' })
		}

		return giftcard
	}

	if (method === 'PUT') {
		const body = await readBody(event)

		const updatedGiftcard = await prisma.giftcard.update({
			where: { giftcard_id: id },
			data: {
				...body,
				issue_date: body.issue_date ? new Date(body.issue_date) : undefined,
				expiration_date: body.expiration_date ? new Date(body.expiration_date) : null,
			},
		})

		return updatedGiftcard
	}

	if (method === 'DELETE') {
		await prisma.giftcard.delete({ where: { giftcard_id: id } })
		return { success: true }
	}
})
