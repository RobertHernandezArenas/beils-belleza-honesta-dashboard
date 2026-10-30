import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Sale } from '../shared/types/domain'
import { buildSalesLedger, collectedInRange, type DebtPaymentRow } from '../app/utils/salesLedger'

const cart = (overrides: Partial<Sale> = {}): Sale => ({
	cart_id: 'c1',
	status: 'completed',
	subtotal: 100,
	discount: 0,
	total: 100,
	payment_method: 'card',
	invoice_number: 'BBH-01-2026-0001',
	created_at: '2026-01-10T10:00:00.000Z',
	items: [],
	debts: [],
	...overrides,
})

const debtSale = (overrides: Partial<Sale> = {}) =>
	cart({
		cart_id: 'c2',
		payment_method: 'debt',
		total: 100,
		invoice_number: 'BBH-01-2026-0002',
		debts: [
			{
				debt_id: 'd1',
				user_id: 'u1',
				cart_id: 'c2',
				amount: 100,
				remaining: 60,
				status: 'partial',
				payments: [{ payment_id: 'p1', debt_id: 'd1', amount: 40, payment_method: 'cash', payment_date: '2026-02-05T10:00:00.000Z' }],
			},
		],
		...overrides,
	})

const paymentRow = (sale: Sale | null, overrides: Partial<DebtPaymentRow> = {}): DebtPaymentRow => ({
	payment_id: 'p1',
	debt_id: 'd1',
	amount: 40,
	payment_method: 'cash',
	payment_date: '2026-02-05T10:00:00.000Z',
	debt: { debt_id: 'd1', user_id: 'u1', amount: 100, remaining: 60, status: 'partial', cart_id: sale?.cart_id ?? null, cart: sale, user: { name: 'Ana', surname: 'Lopez' } },
	...overrides,
})

describe('buildSalesLedger', () => {
	it('lists each sale once, including debt sales, and each debt payment as its own row', () => {
		const sale = debtSale()
		const { entries } = buildSalesLedger([cart(), sale], [paymentRow(sale)])

		assert.equal(entries.length, 3)
		assert.deepEqual(entries.map(e => e.row_kind).sort(), ['debt_payment', 'sale', 'sale'])
		const row = entries.find(e => e.row_kind === 'debt_payment')!
		assert.equal(row.total, 40)
		assert.equal(row.payment_method, 'cash')
		assert.equal(row.created_at, '2026-02-05T10:00:00.000Z')
		assert.equal(row.invoice_number, 'BBH-01-2026-0002')
		assert.equal(row.user?.name, 'Ana')
		assert.equal(row.source_sale?.cart_id, 'c2')
	})

	it('renders a payment row whose sale is outside the fetched carts, using the sale carried by the payment', () => {
		const olderSale = debtSale({ created_at: '2025-06-01T10:00:00.000Z' })
		const { entries, invoiced } = buildSalesLedger([], [paymentRow(olderSale)])

		assert.equal(invoiced.length, 0)
		assert.equal(entries.length, 1)
		assert.equal(entries[0]!.row_kind, 'debt_payment')
		assert.equal(entries[0]!.source_sale?.cart_id, 'c2')
		assert.equal(entries[0]!.invoice_number, 'BBH-01-2026-0002')
	})

	it('invoiced sales (Facturado) are completed carts only; a legacy unpaid debt cart is listed but not invoiced', () => {
		const legacy = cart({ cart_id: 'c3', status: 'pending', payment_method: 'debt', invoice_number: null })
		const abandoned = cart({ cart_id: 'c4', status: 'pending', payment_method: 'card' })
		const { entries, invoiced } = buildSalesLedger([cart(), legacy, abandoned], [])

		assert.deepEqual(entries.map(e => e.cart_id), ['c1', 'c3'])
		assert.deepEqual(invoiced.map(s => s.cart_id), ['c1'])
	})

	it('payment rows of a manual debt (no sale) still appear', () => {
		const { entries } = buildSalesLedger([], [paymentRow(null)])
		assert.equal(entries.length, 1)
		assert.equal(entries[0]!.source_sale, null)
		assert.equal(entries[0]!.user?.name, 'Ana')
	})
})

describe('collectedInRange (Cobrado)', () => {
	const start = new Date('2026-01-01T00:00:00.000Z')
	const end = new Date('2026-12-31T23:59:59.000Z')

	it('counts immediate sales by method, debt sales as 0 and debt payments by their own method, with no double counting', () => {
		const sale = debtSale()
		const mixed = cart({
			cart_id: 'c5',
			payment_method: 'mixed',
			total: 50,
			payment_breakdown: JSON.stringify([{ method: 'cash', amount: 30 }, { method: 'card', amount: 20 }]),
		})
		const { entries } = buildSalesLedger([cart(), sale, mixed], [paymentRow(sale)])
		const collected = collectedInRange(entries, start, end)

		assert.equal(collected.total, 190) // 100 card + 50 mixed + 40 debt payment (the debt sale itself: 0)
		const byMethod = Object.fromEntries(collected.byMethod.map(p => [p.method, p.amount]))
		assert.deepEqual(byMethod, { card: 120, cash: 70 })
	})

	it('only counts what falls in the range, and a payment counts on its own date', () => {
		const sale = debtSale()
		const { entries } = buildSalesLedger([sale], [paymentRow(sale)])

		// January: the debt sale was invoiced but nothing was collected yet
		assert.equal(collectedInRange(entries, start, new Date('2026-01-31T23:59:59.000Z')).total, 0)
		// February: the payment
		assert.equal(collectedInRange(entries, new Date('2026-02-01T00:00:00.000Z'), end).total, 40)
	})

	it('a legacy paid-off debt is collected only through its payments', () => {
		const legacy = cart({
			cart_id: 'c6',
			payment_method: 'card', // overwritten by the last payment at payoff
			total: 100,
			debts: [
				{
					debt_id: 'd9',
					user_id: 'u1',
					amount: 100,
					remaining: 0,
					status: 'paid',
					payments: [
						{ payment_id: 'p8', debt_id: 'd9', amount: 60, payment_method: 'cash', payment_date: '2026-03-01T10:00:00.000Z' },
						{ payment_id: 'p9', debt_id: 'd9', amount: 40, payment_method: 'card', payment_date: '2026-03-02T10:00:00.000Z' },
					],
				},
			],
		})
		const rows = [
			paymentRow(legacy, { payment_id: 'p8', amount: 60, payment_method: 'cash', payment_date: '2026-03-01T10:00:00.000Z' }),
			paymentRow(legacy, { payment_id: 'p9', amount: 40, payment_method: 'card', payment_date: '2026-03-02T10:00:00.000Z' }),
		]
		const { entries } = buildSalesLedger([legacy], rows)
		assert.equal(collectedInRange(entries, start, end).total, 100)
	})
})
