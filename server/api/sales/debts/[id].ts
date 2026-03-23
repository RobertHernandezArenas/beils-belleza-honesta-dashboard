

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Debt ID is required' })
	}

	if (method === 'GET') {
		const debt = await prisma.debt.findUnique({
			where: { debt_id: id },
			include: { user: { select: { name: true, surname: true, email: true } }, cart: true },
		})

		if (!debt) {
			throw createError({ statusCode: 404, statusMessage: 'Debt not found' })
		}

		return debt
	}

	if (method === 'PUT') {
		const body = await readBody(event)

		const payload: any = { status: body.status, notes: body.notes }

		if (body.remaining !== undefined) {
			payload.remaining = Number(Number(body.remaining).toFixed(2))
			if (Number(payload.remaining.toFixed(2)) <= 0) {
				payload.remaining = 0
				payload.status = 'paid'
			}
		}

		if (body.due_date) {
			payload.due_date = new Date(body.due_date)
		}

		const updatedDebt = await prisma.debt.update({
			where: { debt_id: id },
			data: payload,
			include: { cart: true }
		})

		// Si se ha pagado totalmente y viene de un pago a plazos de Stripe
		if (updatedDebt.status === 'paid' && updatedDebt.cart_id && updatedDebt.cart?.status === 'pending_installments') {
			await prisma.cart.update({
				where: { cart_id: updatedDebt.cart_id },
				data: { status: 'completed' }
			})
		}

		return updatedDebt
	}

	if (method === 'DELETE') {
		await prisma.debt.delete({ where: { debt_id: id } })
		return { success: true }
	}
})
