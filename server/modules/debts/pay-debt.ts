import { createError } from 'h3'
import { computeDebtPayment, commitDebtPayment } from '../../utils/debt-payment'
import { resolvePaymentRecord } from '../../utils/sale-payments'
import { invoiceCart, type InvoiceType, type InvoicingDeps } from '../shared/invoicing'
import type { DebtsRepository, PayoffCart } from './ports'

export interface PayDebtInput {
	debtId: string
	amount: number
	paymentMethod: string
	/** Split of a "mixed" payment; it must add up to the amount actually paid */
	paymentBreakdown?: unknown
	notes?: string
}

export interface PayDebtDeps extends InvoicingDeps {
	debts: DebtsRepository
}

/**
 * Registers a (partial or final) payment on a debt. The balance update is optimistic: a
 * concurrent payment makes it a 409 that rolls the payment record back too. A legacy debt
 * whose cart is still pending is completed and invoiced when the last payment arrives.
 */
export async function payDebt(deps: PayDebtDeps, input: PayDebtInput) {
	const { debts } = deps
	const { debtId, amount, paymentMethod, paymentBreakdown, notes } = input

	const result = await debts.transaction(async uow => {
		const debt = await uow.findDebt(debtId)

		if (!debt) throw createError({ statusCode: 404, statusMessage: 'Deuda no encontrada' })
		if (debt.status === 'paid' || debt.remaining <= 0) {
			throw createError({ statusCode: 400, statusMessage: 'Esta deuda ya está completamente pagada' })
		}

		// Don't overpay; the update only applies if no other payment changed the balance meanwhile
		const { paymentAmount, newRemaining, newStatus } = computeDebtPayment(debt.remaining, amount)
		const record = resolvePaymentRecord(paymentMethod, paymentBreakdown, paymentAmount, 'importe a cobrar')
		await commitDebtPayment(uow.debtTx, {
			debtId,
			expected: { remaining: debt.remaining, status: debt.status },
			newRemaining,
			newStatus,
		})

		const payment = await uow.createPayment({
			debt_id: debtId,
			amount: paymentAmount,
			payment_method: record.payment_method,
			payment_breakdown: record.payment_breakdown,
			notes: notes || null,
		})
		// All payments so far: the receipt shows "Pago X de N" and the running balance
		const payments = await uow.listPayments(debtId)
		const updatedDebt = { ...debt, remaining: newRemaining, status: newStatus, payments }

		// Legacy debts only: a cart still pending (no invoice yet) is completed and invoiced at payoff.
		// A debt sale created with the current flow is already invoiced and stays as it was sold.
		let needsVerifactu = false
		let cartToUpdate: PayoffCart | null = null

		if (newStatus === 'paid' && debt.cart_id) {
			const currentCart = await uow.findCartForPayoff(debt.cart_id)

			if (currentCart && currentCart.status !== 'completed') {
				needsVerifactu = !currentCart.invoice_number
				cartToUpdate = currentCart

				await uow.completeCart(debt.cart_id, {
					status: 'completed',
					payment_method: paymentMethod || currentCart.payment_method,
					payment_breakdown: record.payment_breakdown,
					created_at: deps.now(),
				})
			}
		}

		return { debt: updatedDebt, payment, needsVerifactu, cartToUpdate }
	})

	// Perform VeriFactu submission OUTSIDE the transaction
	if (result.needsVerifactu && result.cartToUpdate) {
		const cart = result.cartToUpdate
		await invoiceCart(
			{ ...deps, store: debts },
			cart,
			async (): Promise<InvoiceType> => (cart.user?.document_number ? 'F1' : 'I'),
			'VeriFactu processing failed for debt payment post-transaction:',
		)
	}

	return { success: true, data: { debt: result.debt, payment: result.payment } }
}
