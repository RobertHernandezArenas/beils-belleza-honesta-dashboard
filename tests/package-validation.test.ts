import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	parseCatalogPackage,
	catalogPackageSessions,
	parsePackageAssignment,
	resolveExpiryDate,
	parseClientPackageUpdate,
} from '../server/utils/package-validation'

const statusOf = (fn: () => unknown) => {
	try {
		fn()
		return 'ok'
	} catch (err) {
		return (err as { statusCode?: number }).statusCode
	}
}

describe('catalog packages', () => {
	const base = { name: 'Bono Indiba x10', description: '', type: 'INDIVIDUAL', price: 500, total_sessions: 10, service_id: 's1', items: [] }

	it('accepts what the package form sends', () => {
		assert.equal(parseCatalogPackage(base).price, 500)
	})

	it('rejects negative/NaN prices, bad types and bad item quantities', () => {
		assert.equal(statusOf(() => parseCatalogPackage({ ...base, price: -1 })), 400)
		assert.equal(statusOf(() => parseCatalogPackage({ ...base, price: Number.NaN })), 400)
		assert.equal(statusOf(() => parseCatalogPackage({ ...base, type: 'VIP' })), 400)
		assert.equal(
			statusOf(() => parseCatalogPackage({ ...base, type: 'MIXTO', items: [{ item_type: 'SERVICE', item_id: 's1', name: 'X', quantity: -2, duration: 30 }] })),
			400,
		)
	})

	it('counts only service items as sessions for MIXTO packages', () => {
		const pkg = parseCatalogPackage({
			...base,
			type: 'MIXTO',
			items: [
				{ item_type: 'SERVICE', item_id: 's1', name: 'Indiba', quantity: 4, duration: 45 },
				{ item_type: 'PRODUCT', item_id: 'p1', name: 'Crema', quantity: 2, duration: 0 },
			],
		})
		assert.equal(catalogPackageSessions(pkg), 4)
		assert.equal(catalogPackageSessions({ ...pkg, type: 'INDIVIDUAL' }), 10)
	})
})

describe('package assignment', () => {
	const NOW = new Date('2026-10-25T10:00:00Z')

	it('requires a package and rejects invalid numbers and dates', () => {
		assert.equal(statusOf(() => parsePackageAssignment({})), 400)
		assert.equal(statusOf(() => parsePackageAssignment({ package_id: 'k1', custom_price: -5 })), 400)
		assert.equal(statusOf(() => parsePackageAssignment({ package_id: 'k1', expiry_date: 'not-a-date' })), 400)
		assert.equal(statusOf(() => parsePackageAssignment({ package_id: 'k1', total_sessions: 1.5 })), 400)
	})

	it('treats an empty custom price as "no custom price"', () => {
		assert.equal(parsePackageAssignment({ package_id: 'k1', custom_price: '' }).custom_price, null)
	})

	it('resolves expiry: explicit date, months, none, default 6 months', () => {
		assert.equal(resolveExpiryDate({ expiry_date: '2027-01-31' }, NOW)?.toISOString().slice(0, 10), '2027-01-31')
		assert.equal(resolveExpiryDate({ expiry_months: 3 }, NOW)?.toISOString().slice(0, 7), '2027-01')
		assert.equal(resolveExpiryDate({ expiry_months: null }, NOW), null)
		assert.equal(resolveExpiryDate({ expiry_months: 0 }, NOW), null)
		assert.equal(resolveExpiryDate({}, NOW)?.toISOString().slice(0, 7), '2027-04')
	})
})

describe('client package update', () => {
	it('accepts the edit modal payload', () => {
		const data = parseClientPackageUpdate({
			custom_price: 450,
			total_sessions: 10,
			remaining_sessions: 4,
			expiry_date: null,
			status: 'ACTIVE',
			items: [{ client_package_item_id: 'i1', quantity_total: 5, quantity_remaining: 2 }],
		})
		assert.equal(data.remaining_sessions, 4)
	})

	it('rejects unknown statuses and impossible balances', () => {
		assert.equal(statusOf(() => parseClientPackageUpdate({ status: 'FREE' })), 400)
		assert.equal(statusOf(() => parseClientPackageUpdate({ total_sessions: 5, remaining_sessions: 9 })), 400)
		assert.equal(statusOf(() => parseClientPackageUpdate({ remaining_sessions: -1 })), 400)
		assert.equal(
			statusOf(() => parseClientPackageUpdate({ items: [{ client_package_item_id: 'i1', quantity_total: 2, quantity_remaining: 5 }] })),
			400,
		)
	})
})
