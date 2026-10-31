import type { DebtTx } from '../../utils/debt-payment'
import type { CartInvoiceStore } from '../shared/invoicing'

/** What the debt payment use case needs from storage. Plain TypeScript: no Prisma, no h3. */

export interface DebtRecord {
	debt_id: string
	status: string
	remaining: number
	cart_id: string | null
	amount?: number
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

export interface DebtListItem {
	debt_id: string
	user_id: string
	cart_id: string | null
	amount: number
	remaining: number
	status: string
	notes: string | null
	due_date: Date | null
	created_at: Date
	user?: {
		name?: string | null
		surname?: string | null
		phone?: string | null
	} | null
	payments?: unknown[]
	cart?: {
		total: number
		created_at: Date
		invoice_number: string | null
		payment_method: string | null
		items: unknown[]
	} | null
	[column: string]: unknown
}

export interface DebtDetailRecord {
	debt_id: string
	user_id: string
	cart_id: string | null
	amount: number
	remaining: number
	status: string
	notes: string | null
	due_date: Date | null
	created_at: Date
	user?: {
		name?: string | null
		surname?: string | null
		email?: string | null
		phone?: string | null
	} | null
	cart?: unknown
	[column: string]: unknown
}

export interface DebtPaymentWithDebtRecord {
	payment_id: string
	debt_id: string
	amount: number
	payment_method: string
	payment_date: Date
	debt: {
		debt_id: string
		user?: {
			name?: string | null
			surname?: string | null
			email?: string | null
			phone?: string | null
			document_number?: string | null
		} | null
		payments?: unknown[]
		cart?: unknown
		[column: string]: unknown
	}
	[column: string]: unknown
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
	listDebts(filter: { status?: string }): Promise<DebtListItem[]>
	findCartForDebt(cartId: string): Promise<{ user_id: string | null; total: number } | null>
	createDebt(data: {
		user_id: string
		cart_id: string | null
		amount: number
		remaining: number
		status: string
		notes: string | null
		due_date: Date | null
	}): Promise<DebtDetailRecord>
	findDebtById(id: string): Promise<DebtDetailRecord | null>
	findDebtAmount(id: string): Promise<{ amount: number } | null>
	updateDebt(id: string, data: Record<string, unknown>): Promise<DebtDetailRecord>
	deleteDebt(id: string): Promise<void>
	listDebtPayments(range?: { gte?: Date; lte?: Date }): Promise<DebtPaymentWithDebtRecord[]>
}
