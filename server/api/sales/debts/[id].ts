import { parseDebtUpdate } from '../../../utils/catalog-validation'
import { requireAdmin } from '../../../utils/auth'
import type { Prisma } from '@prisma/client'


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
		// Adjusting a debt by hand (e.g. writing it off) is an admin decision; payments go through /pay
		requireAdmin(event)
		const body = parseDebtUpdate(await readBody(event))

		const current = await prisma.debt.findUnique({ where: { debt_id: id }, select: { amount: true } })
		if (!current) throw createError({ statusCode: 404, statusMessage: 'Deuda no encontrada' })

		const payload: Prisma.DebtUncheckedUpdateInput = { status: body.status, notes: body.notes }

		if (body.remaining !== undefined) {
			if (body.remaining > current.amount) {
				throw createError({ statusCode: 400, statusMessage: 'El saldo pendiente no puede superar el importe de la deuda' })
			}
			payload.remaining = Number(body.remaining.toFixed(2))
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



		return updatedDebt
	}

	if (method === 'DELETE') {
		requireAdmin(event)
		await prisma.debt.delete({ where: { debt_id: id } })
		return { success: true }
	}
})
