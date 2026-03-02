

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Coupon ID is required' })
	}

	if (method === 'GET') {
		const coupon = await prisma.coupon.findUnique({
			where: { coupon_id: id },
		})

		if (!coupon) {
			throw createError({ statusCode: 404, statusMessage: 'Coupon not found' })
		}

		return coupon
	}

	if (method === 'PUT') {
		const body = await readBody(event)

		const updatedCoupon = await prisma.coupon.update({
			where: { coupon_id: id },
			data: {
				...body,
				valid_from: body.valid_from ? new Date(body.valid_from) : null,
				valid_until: body.valid_until ? new Date(body.valid_until) : null,
			},
		})

		return updatedCoupon
	}

	if (method === 'DELETE') {
		await prisma.coupon.delete({ where: { coupon_id: id } })
		return { success: true }
	}
})
