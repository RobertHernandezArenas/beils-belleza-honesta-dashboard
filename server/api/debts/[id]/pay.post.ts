import type { Prisma } from '@prisma/client'
import { prisma } from '../../../utils/prisma'
import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { generateInvoiceNumber, processVerifactuInvoice } from '../../../utils/verifactu'
import { computeDebtPayment, commitDebtPayment, asDebtTx } from '../../../utils/debt-payment'
import { resolvePaymentRecord } from '../../../utils/sale-payments'
import type { IInvoice } from '~~/shared/types/invoice'

const paymentSchema = z.object({
	amount: z.number().finite().positive('El importe debe ser mayor a 0'),
	payment_method: z.string().trim().min(1).max(30).default('transfer'),
	// Split of a "mixed" payment; it must add up to the amount actually paid
	payment_breakdown: z.unknown().optional(),
	notes: z.string().max(2000).optional(),
})

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const debtId = getRouterParam(event, 'id')
		if (!debtId) {
			throw createError({ statusCode: 400, statusMessage: 'ID de la deuda requerido' })
		}

		const body = await readBody(event)
		const parsedBody = paymentSchema.parse(body)
		const { amount, payment_method, payment_breakdown, notes } = parsedBody

		const result = await prisma.$transaction(async tx => {
			const debt = await tx.debt.findUnique({ where: { debt_id: debtId } })

			if (!debt) throw createError({ statusCode: 404, statusMessage: 'Deuda no encontrada' })
			if (debt.status === 'paid' || debt.remaining <= 0) {
				throw createError({ statusCode: 400, statusMessage: 'Esta deuda ya está completamente pagada' })
			}

			// Don't overpay; the update only applies if no other payment changed the balance meanwhile
			const { paymentAmount, newRemaining, newStatus } = computeDebtPayment(debt.remaining, amount)
			const record = resolvePaymentRecord(payment_method, payment_breakdown, paymentAmount, 'importe a cobrar')
			await commitDebtPayment(asDebtTx(tx), {
				debtId,
				expected: { remaining: debt.remaining, status: debt.status },
				newRemaining,
				newStatus,
			})

			const payment = await tx.debtPayment.create({
				data: {
					debt_id: debtId,
					amount: paymentAmount,
					payment_method: record.payment_method,
					payment_breakdown: record.payment_breakdown,
					notes: notes || null,
				},
			})
			// All payments so far: the receipt shows "Pago X de N" and the running balance
			const payments = await tx.debtPayment.findMany({
				where: { debt_id: debtId },
				orderBy: { payment_date: 'asc' },
			})
			const updatedDebt = { ...debt, remaining: newRemaining, status: newStatus, payments }

			// Legacy debts only: a cart still pending (no invoice yet) is completed and invoiced at payoff.
			// A debt sale created with the current flow is already invoiced and stays as it was sold.
			let needsVerifactu = false
			let cartToUpdate: Prisma.CartGetPayload<{
				include: { user: { select: { document_number: true; user_id: true } } }
			}> | null = null

			if (newStatus === 'paid' && debt.cart_id) {
				const currentCart = await tx.cart.findUnique({
					where: { cart_id: debt.cart_id },
					include: { user: { select: { document_number: true, user_id: true } } },
				})

				if (currentCart && currentCart.status !== 'completed') {
					needsVerifactu = !currentCart.invoice_number
					cartToUpdate = currentCart
					
					await tx.cart.update({
						where: { cart_id: debt.cart_id },
						data: {
							status: 'completed',
							payment_method: payment_method || currentCart.payment_method,
							payment_breakdown: record.payment_breakdown,
							created_at: new Date(),
						},
					})
				}
			}

			return { debt: updatedDebt, payment, needsVerifactu, cartToUpdate }
		})

		// Perform VeriFactu submission OUTSIDE the transaction
		if (result.needsVerifactu && result.cartToUpdate) {
			try {
				const { cartToUpdate } = result
				const config = useRuntimeConfig()
				const invoiceType = cartToUpdate.user?.document_number ? 'F1' : 'I'

				const invoiceNumber = await generateInvoiceNumber(invoiceType as 'F1' | 'I')
				
				const verifactuPayload: IInvoice = {
					id: cartToUpdate.cart_id,
					invoiceNumber,
					issueDate: new Date().toISOString(),
					issuer: {
						nif: config.salonNif,
						name: config.salonName
					},
					totalAmount: cartToUpdate.total
				}

				const { hash, qrUrl, aeatStatus } = await processVerifactuInvoice(verifactuPayload)

				await prisma.cart.update({
					where: { cart_id: cartToUpdate.cart_id },
					data: {
						invoice_number: invoiceNumber,
						invoice_type: invoiceType,
						qr_content: qrUrl,
						hash: hash,
						aeat_status: aeatStatus,
					}
				})
			} catch (vError) {
				console.error('VeriFactu processing failed for debt payment post-transaction:', vError)
				await prisma.cart.update({
					where: { cart_id: result.cartToUpdate.cart_id },
					data: { aeat_status: 'error' }
				}).catch(() => {})
			}
		}

		return { success: true, data: { debt: result.debt, payment: result.payment } }
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error instanceof z.ZodError) {
			throw createError({ statusCode: 400, statusMessage: error.message })
		}
		throw createError({
			statusCode: error.statusCode || 500,
			statusMessage: error.statusMessage || String(error),
			data: error.data,
		})
	}
})
