import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { generateInvoiceNumber, processVerifactuInvoice } from '../../../utils/verifactu'
import type { IInvoice } from '~~/shared/types/invoice'

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
			let newRemaining = Number((debt.remaining - paymentAmount).toFixed(2))
			if (newRemaining < 0.01) newRemaining = 0
			
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

			// If debt is fully paid and has an associated cart, mark cart as completed and generate Invoice
			if (newStatus === 'paid' && debt.cart_id) {
				const currentCart = await tx.cart.findUnique({
					where: { cart_id: debt.cart_id },
					include: { user: { select: { document_number: true } } },
				})

				if (currentCart && currentCart.status !== 'completed') {
					let verifactuData: any = {}

					if (!currentCart.invoice_number) {
						const config = useRuntimeConfig()
						const nif = currentCart.user?.document_number || '00000000T'
						const invoiceType = currentCart.user?.document_number ? 'F1' : 'I'

						const invoiceNumber = await generateInvoiceNumber(invoiceType as 'F1' | 'I')
						
						const verifactuPayload: IInvoice = {
							id: currentCart.cart_id,
							invoiceNumber,
							issueDate: new Date().toISOString(),
							issuer: {
								nif: config.salonNif,
								name: config.salonName
							},
							totalAmount: currentCart.total
						}

						const { hash, qrUrl, aeatStatus } = await processVerifactuInvoice(verifactuPayload)

						verifactuData = {
							invoice_number: invoiceNumber,
							invoice_type: invoiceType,
							qr_content: qrUrl,
							hash: hash,
							aeat_status: aeatStatus,
						}
					}

					await tx.cart.update({
						where: { cart_id: debt.cart_id },
						data: {
							status: 'completed',
							payment_method: payment_method || currentCart.payment_method, // Last payment method used
							...verifactuData,
						},
					})
				}
			}

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
