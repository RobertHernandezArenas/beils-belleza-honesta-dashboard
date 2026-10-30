import type { Debt, DebtPayment, Sale } from '../../shared/types/domain'
import { collectedParts, receivedParts, type PaymentPart } from '../../shared/utils/payments'

/** A debt payment as returned by /api/sales/debt-payments (with its debt and the sold cart). */
export type DebtPaymentRow = DebtPayment & { debt: Debt }

/**
 * One row of /ventas. It is shaped like a Sale so the existing filters, sorting and search
 * work on it unchanged: a debt payment row carries the payment's date, amount and method.
 */
export interface LedgerEntry extends Sale {
	row_kind: 'sale' | 'debt_payment'
	payment?: DebtPayment
	debt?: Debt
	/** The sale a payment belongs to (null for a manual debt). */
	source_sale?: Sale | null
}

export interface SalesLedger {
	/** Every row to list: sales (debt sales included) and debt payments. */
	entries: LedgerEntry[]
	/** Sales issued as invoices: what "Facturado" adds up. */
	invoiced: Sale[]
}

export function buildSalesLedger(carts: Sale[], payments: DebtPaymentRow[]): SalesLedger {
	const invoiced = carts.filter(c => c.status === 'completed')
	// A legacy debt cart that is still unpaid has no invoice yet, but it is a sale on the books
	const listed = carts.filter(c => c.status === 'completed' || (c.status === 'pending' && c.payment_method === 'debt'))

	const saleEntries: LedgerEntry[] = listed.map(sale => ({ ...sale, row_kind: 'sale' }))
	const paymentEntries: LedgerEntry[] = payments.map(({ debt, ...payment }) => {
		const sale = debt.cart ?? null
		return {
			cart_id: payment.payment_id,
			user_id: debt.user_id,
			status: 'completed',
			subtotal: payment.amount,
			discount: 0,
			total: payment.amount,
			payment_method: payment.payment_method,
			payment_breakdown: payment.payment_breakdown,
			invoice_number: sale?.invoice_number ?? null,
			created_at: payment.payment_date,
			items: [],
			user: sale?.user ?? debt.user ?? null,
			row_kind: 'debt_payment',
			payment,
			debt,
			source_sale: sale,
		}
	})

	return { entries: [...saleEntries, ...paymentEntries], invoiced }
}

/** Money actually received in [start, end], by method: no double counting between a debt sale and its payments. */
export function collectedInRange(entries: LedgerEntry[], start: Date, end: Date) {
	const byMethod = new Map<string, number>()
	for (const entry of entries) {
		const date = new Date(entry.created_at)
		if (date < start || date > end) continue
		const parts: PaymentPart[] =
			entry.row_kind === 'debt_payment'
				? receivedParts(entry.payment_method, entry.payment_breakdown, entry.total)
				: collectedParts(entry)
		for (const part of parts) byMethod.set(part.method, (byMethod.get(part.method) ?? 0) + part.amount)
	}
	const parts = [...byMethod].map(([method, amount]) => ({ method, amount: Math.round(amount * 100) / 100 }))
	return { total: Math.round(parts.reduce((sum, p) => sum + p.amount, 0) * 100) / 100, byMethod: parts }
}
