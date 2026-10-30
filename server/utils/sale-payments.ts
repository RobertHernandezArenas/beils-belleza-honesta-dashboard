import { createError } from 'h3'
import { validatePaymentBreakdown } from '../../shared/utils/payments'

/**
 * How a payment is stored: the method plus, for "mixed", the validated per-method split
 * (JSON text). Shared by sales and debt payments so both reject the same bad input.
 */
export function resolvePaymentRecord(method: string, breakdown: unknown, total: number, totalLabel?: string) {
	if (method !== 'mixed') return { payment_method: method, payment_breakdown: null }
	const res = validatePaymentBreakdown(breakdown, total, totalLabel)
	if ('error' in res) throw createError({
			statusCode: 400,
			statusMessage: res.error,
			data: res.expected_total === undefined ? undefined : { expected_total: res.expected_total },
		})
	return { payment_method: method, payment_breakdown: JSON.stringify(res.parts) }
}
