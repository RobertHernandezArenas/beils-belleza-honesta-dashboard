

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Cart ID is required' })
	}

	if (method === 'GET') {
		const cart = await prisma.cart.findUnique({
			where: { cart_id: id },
			include: {
				user: { select: { name: true, surname: true, email: true, phone: true } },
				items: true,
				debts: true,
			},
		})

		if (!cart) {
			throw createError({ statusCode: 404, statusMessage: 'Cart not found' })
		}

		return cart
	}

	if (method === 'PUT') {
		const body = await readBody(event)
		// Usually a cart shouldn't be fully mutable after creation in TPV, just status updates
		const updatedCart = await prisma.cart.update({
			where: { cart_id: id },
			data: {
				status: body.status,
				payment_method: body.payment_method,
				notes: body.notes,
			},
		})

		return updatedCart
	}

	if (method === 'DELETE') {
		// Because it cascades items but not debts (SetNull), check if it has debts
		await prisma.cart.delete({ where: { cart_id: id } })
		return { success: true }
	}
})
