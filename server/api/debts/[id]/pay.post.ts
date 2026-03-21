import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const debtId = getRouterParam(event, 'id')
		if (!debtId) {
			throw createError({ statusCode: 400, statusMessage: 'ID de la deuda requerido' })
		}

		const body = await readBody(event)
		const { amount, payment_method, notes } = body

		if (!amount || typeof amount !== 'number' || amount <= 0) {
			throw createError({ statusCode: 400, statusMessage: 'El importe del pago debe ser mayor a 0' })
		}

		const result = await prisma.$transaction(async tx => {
			const debt = await tx.debt.findUnique({ where: { debt_id: debtId } })

			if (!debt) throw createError({ statusCode: 404, statusMessage: 'Deuda no encontrada' })
			if (debt.status === 'paid' || debt.remaining <= 0) {
				throw createError({ statusCode: 400, statusMessage: 'Esta deuda ya está completamente pagada' })
			}

			// Don't overpay
			const paymentAmount = Math.min(amount, debt.remaining)
			const newRemaining = debt.remaining - paymentAmount
			const newStatus = newRemaining <= 0 ? 'paid' : 'partial'

			const updatedDebt = await tx.debt.update({
				where: { debt_id: debtId },
				data: {
					remaining: newRemaining,
					status: newStatus,
				},
			})

			const payment = await tx.debtPayment.create({
				data: {
					debt_id: debtId,
					amount: paymentAmount,
					payment_method: payment_method || 'transfer',
					notes: notes || null,
				},
			})

			return { debt: updatedDebt, payment }
		})

		return { success: true, data: result }
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			statusMessage: error.statusMessage || String(error),
		})
	}
})
