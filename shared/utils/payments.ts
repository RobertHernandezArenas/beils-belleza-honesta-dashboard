/**
 * Payment helpers shared by the server (validation) and the browser (labels, tickets,
 * /ventas, receipts). Pure: no imports, so both sides and the tests can use it.
 */

export interface PaymentPart {
	method: string
	amount: number
}

/** One label for every method, used by tickets, invoices, receipts, badges and filters. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
	cash: 'Efectivo',
	card: 'Tarjeta',
	bizum: 'Bizum',
	transfer: 'Transferencia',
	mixed: 'Mixto',
	debt: 'A deber',
	stripe: 'Stripe',
}

/** Methods a mixed payment can be split into. */
export const BREAKDOWN_METHODS = ['cash', 'card', 'bizum', 'transfer'] as const

export const paymentMethodLabel = (method?: string | null): string => {
	if (!method) return 'Sin especificar'
	return PAYMENT_METHOD_LABELS[method.toLowerCase()] ?? method
}

export const toCents = (value: number): number => Math.round((value + Number.EPSILON) * 100)

export const formatEuro = (value: number): string => `${(toCents(value) / 100).toFixed(2).replace('.', ',')} €`

/** Lenient read of a stored breakdown (JSON text or array); null when absent or unreadable. */
export function parsePaymentBreakdown(raw: unknown): PaymentPart[] | null {
	let value = raw
	if (typeof value === 'string') {
		try {
			value = JSON.parse(value)
		} catch {
			return null
		}
	}
	if (!Array.isArray(value)) return null
	const parts: PaymentPart[] = []
	for (const part of value) {
		if (!part || typeof part !== 'object') return null
		const { method, amount } = part as Record<string, unknown>
		if (typeof method !== 'string' || typeof amount !== 'number') return null
		parts.push({ method, amount })
	}
	return parts.length > 0 ? parts : null
}

/** Strict check of a request breakdown: known methods once each, every amount > 0, sum == total (cents). */
export function validatePaymentBreakdown(
	raw: unknown,
	total: number,
	totalLabel = 'total de la venta',
): { parts: PaymentPart[] } | { error: string; expected_total?: number } {
	if (!Array.isArray(raw) || raw.length === 0) {
		return { error: 'El pago mixto necesita el desglose por método' }
	}
	const seen = new Set<string>()
	const parts: PaymentPart[] = []
	for (const part of raw) {
		const { method, amount } = (part ?? {}) as Record<string, unknown>
		if (typeof method !== 'string' || !(BREAKDOWN_METHODS as readonly string[]).includes(method)) {
			return { error: 'Método no válido en el desglose del pago mixto' }
		}
		if (typeof amount !== 'number' || !Number.isFinite(amount) || toCents(amount) <= 0) {
			return { error: 'Cada importe del pago mixto debe ser mayor que 0' }
		}
		if (seen.has(method)) return { error: 'Un método aparece repetido en el pago mixto' }
		seen.add(method)
		parts.push({ method, amount: toCents(amount) / 100 })
	}
	const sum = parts.reduce((acc, part) => acc + toCents(part.amount), 0)
	if (sum !== toCents(total)) {
		// "EUR" rather than the symbol: statusMessage only carries latin-1 characters
		const eur = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} EUR`
		return {
			error: `El desglose del pago mixto (${eur(sum)}) no coincide con el ${totalLabel} (${eur(toCents(total))})`,
			expected_total: toCents(total) / 100,
		}
	}
	return { parts }
}

/** "Mixto: Efectivo 30,00 € · Tarjeta 20,00 €" for mixed payments, otherwise the plain label. */
export function describePayment(method: string | null | undefined, breakdown: unknown): string {
	const label = paymentMethodLabel(method)
	if ((method || '').toLowerCase() !== 'mixed') return label
	const parts = parsePaymentBreakdown(breakdown)
	if (!parts) return label
	return `${label}: ${parts.map(p => `${paymentMethodLabel(p.method)} ${formatEuro(p.amount)}`).join(' · ')}`
}

/** Money received by method for one payment (a mixed payment is split by its breakdown). */
export function receivedParts(method: string | null | undefined, breakdown: unknown, amount: number): PaymentPart[] {
	const key = (method || '').toLowerCase()
	if (key === 'mixed') {
		const parts = parsePaymentBreakdown(breakdown)
		if (parts) return parts
	}
	return [{ method: key || 'unknown', amount }]
}

interface DebtLike {
	amount: number
	remaining: number
	payments?: { amount: number }[] | null
}

interface SaleLike {
	payment_method?: string | null
	payment_breakdown?: unknown
	total: number
	debts?: DebtLike[] | null
}

/**
 * Money received at the moment of the sale. A debt sale collects nothing then: its money
 * arrives through the debt payments (which also covers legacy debts whose cart method was
 * overwritten when they were paid off).
 */
export function collectedParts(sale: SaleLike): PaymentPart[] {
	if (sale.debts && sale.debts.length > 0) return []
	if ((sale.payment_method || '').toLowerCase() === 'debt') return []
	return receivedParts(sale.payment_method, sale.payment_breakdown, sale.total)
}

export interface SalePaymentStatus {
	state: 'pending' | 'partial' | 'paid'
	paymentsCount: number
	paid: number
	remaining: number
}

/** Payment status of a sale derived from its debt(s); null when it was paid on the spot. */
export function salePaymentStatus(sale: { debts?: DebtLike[] | null }): SalePaymentStatus | null {
	const debts = sale.debts
	if (!debts || debts.length === 0) return null
	const payments = debts.flatMap(d => d.payments ?? [])
	const paid = payments.reduce((sum, p) => sum + p.amount, 0)
	const remaining = debts.reduce((sum, d) => sum + d.remaining, 0)
	const state = remaining < 0.005 ? 'paid' : payments.length > 0 ? 'partial' : 'pending'
	return { state, paymentsCount: payments.length, paid, remaining }
}

export function paymentStatusLabel(status: SalePaymentStatus): string {
	const count = `${status.paymentsCount} ${status.paymentsCount === 1 ? 'pago' : 'pagos'}`
	if (status.state === 'pending') return 'A deber'
	if (status.state === 'partial') return `Parcial · ${count}`
	return status.paymentsCount > 0 ? `Pagada · ${count}` : 'Pagada'
}

export interface DebtReceiptPayment {
	payment_id: string
	amount: number
	payment_method: string
	payment_breakdown?: unknown
	payment_date: string
}

export interface DebtReceipt {
	payment: DebtReceiptPayment
	/** Position of this payment among the debt's payments (by date), 1-based. */
	number: number
	/** Payments made so far. */
	total: number
	paidSoFar: number
	remaining: number
}

/** Numbering and balance shown on the receipt of one debt payment. */
export function buildDebtReceipt(
	debt: { amount: number; payments?: DebtReceiptPayment[] | null },
	paymentId: string,
): DebtReceipt | null {
	const sorted = [...(debt.payments ?? [])].sort(
		(a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime(),
	)
	const index = sorted.findIndex(p => p.payment_id === paymentId)
	if (index < 0) return null
	const paidSoFar = sorted.slice(0, index + 1).reduce((sum, p) => sum + p.amount, 0)
	return {
		payment: sorted[index]!,
		number: index + 1,
		total: sorted.length,
		paidSoFar,
		remaining: Math.max(0, toCents(debt.amount - paidSoFar) / 100),
	}
}

/** Parts typed in the TPV: one amount per method, empty and zero ones dropped. */
export function breakdownFromAmounts(amounts: Record<string, number | null | undefined>): PaymentPart[] {
	return BREAKDOWN_METHODS.flatMap(method => {
		const amount = Number(amounts[method])
		return Number.isFinite(amount) && toCents(amount) > 0 ? [{ method, amount }] : []
	})
}

/** What is still missing (positive) or exceeded (negative) to match the total. */
export function breakdownDifference(parts: PaymentPart[], total: number): number {
	const sum = parts.reduce((acc, part) => acc + toCents(part.amount), 0)
	return (toCents(total) - sum) / 100
}
