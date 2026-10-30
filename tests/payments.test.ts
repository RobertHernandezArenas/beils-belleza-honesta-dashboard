import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	paymentMethodLabel,
	parsePaymentBreakdown,
	validatePaymentBreakdown,
	describePayment,
	receivedParts,
	collectedParts,
	salePaymentStatus,
	paymentStatusLabel,
	buildDebtReceipt,
	breakdownFromAmounts,
	breakdownDifference,
} from '../shared/utils/payments'

describe('paymentMethodLabel', () => {
	it('labels every method with one shared map', () => {
		assert.equal(paymentMethodLabel('cash'), 'Efectivo')
		assert.equal(paymentMethodLabel('card'), 'Tarjeta')
		assert.equal(paymentMethodLabel('bizum'), 'Bizum')
		assert.equal(paymentMethodLabel('transfer'), 'Transferencia')
		assert.equal(paymentMethodLabel('mixed'), 'Mixto')
		assert.equal(paymentMethodLabel('debt'), 'A deber')
		assert.equal(paymentMethodLabel('stripe'), 'Stripe')
	})

	it('is case-insensitive and tolerant of unknown or missing values', () => {
		assert.equal(paymentMethodLabel('BIZUM'), 'Bizum')
		assert.equal(paymentMethodLabel('paypal'), 'paypal')
		assert.equal(paymentMethodLabel(null), 'Sin especificar')
	})
})

describe('validatePaymentBreakdown', () => {
	it('accepts parts whose sum equals the total in cents', () => {
		const res = validatePaymentBreakdown([{ method: 'cash', amount: 30 }, { method: 'card', amount: 20 }], 50)
		assert.deepEqual(res, { parts: [{ method: 'cash', amount: 30 }, { method: 'card', amount: 20 }] })
	})

	it('compares in cents so float noise does not reject a valid split', () => {
		const res = validatePaymentBreakdown([{ method: 'cash', amount: 0.1 }, { method: 'card', amount: 0.2 }], 0.3)
		assert.ok('parts' in res)
	})

	it('rejects a sum that differs from the total', () => {
		const res = validatePaymentBreakdown([{ method: 'cash', amount: 30 }, { method: 'card', amount: 19.99 }], 50)
		assert.ok('error' in res)
	})

	it('reports both amounts and the expected total when the sum differs', () => {
		const res = validatePaymentBreakdown([{ method: 'cash', amount: 30 }, { method: 'card', amount: 19.99 }], 50)
		assert.ok('error' in res)
		assert.equal(res.error, 'El desglose del pago mixto (49,99 EUR) no coincide con el total de la venta (50,00 EUR)')
		assert.equal(res.expected_total, 50)
		const debt = validatePaymentBreakdown([{ method: 'cash', amount: 10 }], 50, 'importe a cobrar')
		assert.ok('error' in debt)
		assert.match(debt.error, /con el importe a cobrar \(50,00 EUR\)$/)
	})

	it('rejects zero, negative, unknown-method, duplicate and non-array input', () => {
		const bad = (raw: unknown) => 'error' in validatePaymentBreakdown(raw, 50)
		assert.ok(bad([{ method: 'cash', amount: 50 }, { method: 'card', amount: 0 }]))
		assert.ok(bad([{ method: 'cash', amount: 60 }, { method: 'card', amount: -10 }]))
		assert.ok(bad([{ method: 'debt', amount: 25 }, { method: 'card', amount: 25 }]))
		assert.ok(bad([{ method: 'cash', amount: 25 }, { method: 'cash', amount: 25 }]))
		assert.ok(bad(undefined))
		assert.ok(bad([]))
	})
})

describe('parsePaymentBreakdown (lenient read)', () => {
	it('reads an array, a JSON string or nothing', () => {
		const parts = [{ method: 'cash', amount: 10 }]
		assert.deepEqual(parsePaymentBreakdown(parts), parts)
		assert.deepEqual(parsePaymentBreakdown(JSON.stringify(parts)), parts)
		assert.equal(parsePaymentBreakdown(null), null)
		assert.equal(parsePaymentBreakdown('not json'), null)
	})
})

describe('describePayment', () => {
	it('prints the breakdown for mixed payments', () => {
		const parts = [{ method: 'cash', amount: 30 }, { method: 'card', amount: 20 }]
		assert.equal(describePayment('mixed', parts), 'Mixto: Efectivo 30,00 € · Tarjeta 20,00 €')
	})

	it('falls back to the label when there is no breakdown or the method is single', () => {
		assert.equal(describePayment('mixed', null), 'Mixto')
		assert.equal(describePayment('bizum', null), 'Bizum')
		assert.equal(describePayment('card', [{ method: 'cash', amount: 1 }]), 'Tarjeta')
	})
})

describe('receivedParts / collectedParts (Cobrado)', () => {
	it('splits mixed by breakdown and keeps single methods whole', () => {
		assert.deepEqual(receivedParts('card', null, 40), [{ method: 'card', amount: 40 }])
		assert.deepEqual(
			receivedParts('mixed', [{ method: 'cash', amount: 10 }, { method: 'bizum', amount: 5 }], 15),
			[{ method: 'cash', amount: 10 }, { method: 'bizum', amount: 5 }],
		)
		assert.deepEqual(receivedParts('mixed', null, 15), [{ method: 'mixed', amount: 15 }])
	})

	it('counts nothing at sale time for a debt sale, even if a legacy payoff overwrote its method', () => {
		const debt = { amount: 100, remaining: 100, payments: [] }
		assert.deepEqual(collectedParts({ payment_method: 'debt', total: 100, debts: [debt] }), [])
		assert.deepEqual(collectedParts({ payment_method: 'card', total: 100, debts: [debt] }), [])
	})

	it('counts an immediate sale by its method', () => {
		assert.deepEqual(collectedParts({ payment_method: 'cash', total: 25, debts: [] }), [{ method: 'cash', amount: 25 }])
	})

	it('counts nothing for a debt method without a debt row yet', () => {
		assert.deepEqual(collectedParts({ payment_method: 'debt', total: 25 }), [])
	})
})

describe('salePaymentStatus', () => {
	const pay = (amount: number) => ({ amount })

	it('is null for a sale without debts', () => {
		assert.equal(salePaymentStatus({ debts: [] }), null)
		assert.equal(salePaymentStatus({}), null)
	})

	it('derives pending / partial / paid and the number of payments', () => {
		assert.deepEqual(salePaymentStatus({ debts: [{ amount: 100, remaining: 100, payments: [] }] }), {
			state: 'pending',
			paymentsCount: 0,
			paid: 0,
			remaining: 100,
		})
		assert.deepEqual(salePaymentStatus({ debts: [{ amount: 100, remaining: 60, payments: [pay(40)] }] }), {
			state: 'partial',
			paymentsCount: 1,
			paid: 40,
			remaining: 60,
		})
		assert.equal(
			salePaymentStatus({ debts: [{ amount: 100, remaining: 0, payments: [pay(40), pay(60)] }] })?.state,
			'paid',
		)
	})
})

describe('paymentStatusLabel', () => {
	it('words the badge', () => {
		assert.equal(paymentStatusLabel({ state: 'pending', paymentsCount: 0, paid: 0, remaining: 10 }), 'A deber')
		assert.equal(paymentStatusLabel({ state: 'partial', paymentsCount: 1, paid: 5, remaining: 5 }), 'Parcial · 1 pago')
		assert.equal(paymentStatusLabel({ state: 'partial', paymentsCount: 2, paid: 5, remaining: 5 }), 'Parcial · 2 pagos')
		assert.equal(paymentStatusLabel({ state: 'paid', paymentsCount: 3, paid: 10, remaining: 0 }), 'Pagada · 3 pagos')
	})
})

describe('buildDebtReceipt', () => {
	const payments = [
		{ payment_id: 'p2', amount: 30, payment_method: 'card', payment_date: '2026-02-01T10:00:00Z' },
		{ payment_id: 'p1', amount: 20, payment_method: 'cash', payment_date: '2026-01-01T10:00:00Z' },
		{ payment_id: 'p3', amount: 50, payment_method: 'bizum', payment_date: '2026-03-01T10:00:00Z' },
	]

	it('numbers a payment by date and reports the balance at that moment', () => {
		const receipt = buildDebtReceipt({ amount: 100, payments }, 'p2')
		assert.equal(receipt?.number, 2)
		assert.equal(receipt?.total, 3)
		assert.equal(receipt?.paidSoFar, 50)
		assert.equal(receipt?.remaining, 50)
	})

	it('handles the last payment and unknown ids', () => {
		const last = buildDebtReceipt({ amount: 100, payments }, 'p3')
		assert.equal(last?.remaining, 0)
		assert.equal(buildDebtReceipt({ amount: 100, payments }, 'nope'), null)
	})
})

describe('breakdownFromAmounts / breakdownDifference (TPV inputs)', () => {
	it('keeps only the methods with an amount, in a fixed order', () => {
		assert.deepEqual(breakdownFromAmounts({ card: 20, cash: 30, bizum: 0, transfer: null }), [
			{ method: 'cash', amount: 30 },
			{ method: 'card', amount: 20 },
		])
		assert.deepEqual(breakdownFromAmounts({}), [])
	})

	it('reports what is still missing (positive) or exceeded (negative) in cents', () => {
		assert.equal(breakdownDifference([{ method: 'cash', amount: 0.1 }, { method: 'card', amount: 0.2 }], 0.3), 0)
		assert.equal(breakdownDifference([{ method: 'cash', amount: 30 }], 50), 20)
		assert.equal(breakdownDifference([{ method: 'cash', amount: 60 }], 50), -10)
	})
})
