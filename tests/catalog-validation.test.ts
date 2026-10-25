import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	parseProductCreate,
	parseProductUpdate,
	parseServiceCreate,
	parseServiceUpdate,
	parseDebtCreate,
	parseDebtUpdate,
	resolveDebtAmount,
} from '../server/utils/catalog-validation'

const statusOf = (fn: () => unknown) => {
	try {
		fn()
		return 'ok'
	} catch (err) {
		return (err as { statusCode?: number }).statusCode
	}
}

describe('products', () => {
	const valid = { name: 'Crema', price: 12.5, tax_rate: 21, stock: 3, min_stock: 1, status: 'activo' }

	it('accepts what the product form sends', () => {
		assert.equal(parseProductCreate(valid).price, 12.5)
	})

	it('drops fields that are not part of the product (no mass assignment)', () => {
		const data = parseProductCreate({ ...valid, product_id: 'forced-id', created_at: '2000-01-01' }) as Record<string, unknown>
		assert.equal('product_id' in data, false)
		assert.equal('created_at' in data, false)
	})

	it('rejects negative or non-finite prices and stock', () => {
		assert.equal(statusOf(() => parseProductCreate({ ...valid, price: -1 })), 400)
		assert.equal(statusOf(() => parseProductCreate({ ...valid, price: Number.NaN })), 400)
		assert.equal(statusOf(() => parseProductCreate({ ...valid, stock: 1.5 })), 400)
		assert.equal(statusOf(() => parseProductUpdate({ price: -5 })), 400)
	})

	it('stores empty unique codes as null so two products without SKU do not collide', () => {
		const data = parseProductCreate({ ...valid, sku: '', barcode: '  ' })
		assert.equal(data.sku, null)
		assert.equal(data.barcode, null)
	})

	it('accepts partial updates', () => {
		assert.deepEqual(parseProductUpdate({ stock: 7 }), { stock: 7 })
	})
})

describe('services', () => {
	const valid = { name: 'Indiba facial', price: 60, tax_rate: 21, duration: 45, status: 'activo' }

	it('keeps tax_rate on create (it used to be silently dropped)', () => {
		assert.equal(parseServiceCreate({ ...valid, tax_rate: 10 }).tax_rate, 10)
	})

	it('rejects invalid prices and durations, and strips unknown fields', () => {
		assert.equal(statusOf(() => parseServiceCreate({ ...valid, price: -1 })), 400)
		assert.equal(statusOf(() => parseServiceUpdate({ duration: 0 })), 400)
		assert.equal('service_id' in (parseServiceUpdate({ name: 'X1', service_id: 'forced' }) as Record<string, unknown>), false)
	})
})

describe('debts', () => {
	it('requires a client and a valid amount when not linked to a ticket', () => {
		assert.equal(statusOf(() => parseDebtCreate({ amount: 10 })), 400)
		assert.equal(statusOf(() => parseDebtCreate({ user_id: 'u1', amount: -10 })), 400)
		assert.equal(parseDebtCreate({ user_id: 'u1', amount: 10 }).amount, 10)
	})

	it('takes the amount from the ticket, never from the request', () => {
		assert.equal(resolveDebtAmount({ userId: 'u1', requestedAmount: 1, cart: { user_id: 'u1', total: 80 } }), 80)
	})

	it('rejects linking a debt to another client\'s ticket', () => {
		assert.equal(statusOf(() => resolveDebtAmount({ userId: 'u1', requestedAmount: 80, cart: { user_id: 'u2', total: 80 } })), 400)
	})

	it('requires an amount for a manual debt', () => {
		assert.equal(statusOf(() => resolveDebtAmount({ userId: 'u1', requestedAmount: undefined, cart: null })), 400)
		assert.equal(resolveDebtAmount({ userId: 'u1', requestedAmount: 25, cart: null }), 25)
	})

	it('only lets an update change notes, due date, status and a bounded remaining', () => {
		assert.equal(statusOf(() => parseDebtUpdate({ remaining: -1 })), 400)
		assert.equal(statusOf(() => parseDebtUpdate({ status: 'forgiven' })), 400)
		assert.equal('amount' in (parseDebtUpdate({ notes: 'x', amount: 0 }) as Record<string, unknown>), false)
	})
})
