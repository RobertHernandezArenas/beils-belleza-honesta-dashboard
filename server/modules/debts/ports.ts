import type { DebtTx } from '../../utils/debt-payment'
import type { CartInvoiceStore } from '../shared/invoicing'

/** What the debt payment use case needs from storage. Plain TypeScript: no Prisma, no h3. */

export interface DebtRecord {
	debt_id: string
	status: string
	remaining: number
	cart_id: string | null
	/** Rows keep their other columns: they are returned to the caller as stored */
	[column: string]: unknown
}

export type DebtPaymentRecord = Record<string, unknown>

export interface NewDebtPayment {
	debt_id: string
	amount: number
	payment_method: string
	payment_breakdown: string | null
	notes: string | null
}

export interface PayoffCart {
	cart_id: string
	status: string
	total: number
	invoice_number: string | null
	payment_method: string | null
	user: { document_number: string | null; user_id: string } | null
}

/** Everything that must commit or roll back together with the payment. */
export interface DebtUnitOfWork {
	/** Narrow view handed to the shared optimistic-lock helper */
	debtTx: DebtTx

	findDebt(debtId: string): Promise<DebtRecord | null>
	createPayment(payment: NewDebtPayment): Promise<DebtPaymentRecord>
	/** Oldest first */
	listPayments(debtId: string): Promise<DebtPaymentRecord[]>

	findCartForPayoff(cartId: string): Promise<PayoffCart | null>
	completeCart(cartId: string, data: {
		status: string
		payment_method: string | null
		payment_breakdown: string | null
		created_at: Date
	}): Promise<unknown>
}

export interface DebtsRepository extends CartInvoiceStore {
	/** The callback commits only if it resolves; any throw rolls everything back */
	transaction<T>(work: (uow: DebtUnitOfWork) => Promise<T>): Promise<T>
}
