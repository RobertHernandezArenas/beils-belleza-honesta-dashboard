import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { ClientPackage, CatalogItem } from '../shared/types/domain'

/**
 * Helper to resolve the effective price of a client package.
 */
function getEffectivePackagePrice(cp: Partial<ClientPackage>, catalogPrice: number = 0): number {
	if (cp.custom_price !== null && cp.custom_price !== undefined) {
		return cp.custom_price
	}
	return cp.package?.price ?? catalogPrice
}

/**
 * Helper to calculate package session progress.
 */
function calculatePackageProgress(total: number, remaining: number): { completed: number; percentage: number } {
	const completed = Math.max(0, total - remaining)
	const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
	return { completed, percentage }
}

/**
 * Helper to compute expiry date from months or custom date string.
 */
function computeExpiryDate(options: { expiry_date?: string | null; expiry_months?: number | null; baseDate?: Date }): Date | null {
	if (options.expiry_date) {
		return new Date(options.expiry_date)
	}
	if (options.expiry_months === null || options.expiry_months === 0) {
		return null
	}
	const months = options.expiry_months !== undefined && options.expiry_months !== null ? Number(options.expiry_months) : 6
	const date = options.baseDate ? new Date(options.baseDate) : new Date()
	date.setMonth(date.getMonth() + months)
	return date
}

describe('Client Packages Personalization & Management Logic', () => {
	it('should prioritize custom_price when set over catalog price', () => {
		const pkgWithCustom: Partial<ClientPackage> = {
			custom_price: 150,
			package: {
				package_id: 'p1',
				name: 'Bono 5 Sesiones',
				price: 200,
				total_sessions: 5,
				type: 'INDIVIDUAL'
			}
		}

		assert.equal(getEffectivePackagePrice(pkgWithCustom), 150)
	})

	it('should fallback to catalog price when custom_price is null or undefined', () => {
		const pkgStandard: Partial<ClientPackage> = {
			custom_price: null,
			package: {
				package_id: 'p1',
				name: 'Bono 5 Sesiones',
				price: 200,
				total_sessions: 5,
				type: 'INDIVIDUAL'
			}
		}

		assert.equal(getEffectivePackagePrice(pkgStandard), 200)

		const pkgUndefined: Partial<ClientPackage> = {
			custom_price: undefined,
			package: {
				package_id: 'p1',
				name: 'Bono 5 Sesiones',
				price: 180,
				total_sessions: 5,
				type: 'INDIVIDUAL'
			}
		}

		assert.equal(getEffectivePackagePrice(pkgUndefined), 180)
	})

	it('should allow custom_price of 0 (e.g. promotional / free package)', () => {
		const freePkg: Partial<ClientPackage> = {
			custom_price: 0,
			package: {
				package_id: 'p1',
				name: 'Bono Amigo',
				price: 120,
				total_sessions: 3,
				type: 'INDIVIDUAL'
			}
		}

		assert.equal(getEffectivePackagePrice(freePkg), 0)
	})

	it('should calculate accurate completed sessions and percentage', () => {
		const progress1 = calculatePackageProgress(10, 3)
		assert.equal(progress1.completed, 7)
		assert.equal(progress1.percentage, 70)

		const progress2 = calculatePackageProgress(5, 5)
		assert.equal(progress2.completed, 0)
		assert.equal(progress2.percentage, 0)

		const progress3 = calculatePackageProgress(6, 0)
		assert.equal(progress3.completed, 6)
		assert.equal(progress3.percentage, 100)
	})

	it('should accurately compute expiry dates from months or exact date', () => {
		const baseDate = new Date(2026, 0, 15) // 15 Jan 2026

		// 6 months
		const date6m = computeExpiryDate({ expiry_months: 6, baseDate })
		assert.ok(date6m)
		assert.equal(date6m.getFullYear(), 2026)
		assert.equal(date6m.getMonth(), 6) // July (0-indexed)

		// 12 months
		const date12m = computeExpiryDate({ expiry_months: 12, baseDate })
		assert.ok(date12m)
		assert.equal(date12m.getFullYear(), 2027)
		assert.equal(date12m.getMonth(), 0) // Jan 2027

		// Exact date
		const exact = computeExpiryDate({ expiry_date: '2026-12-31T23:59:59.000Z' })
		assert.ok(exact)
		assert.equal(exact.toISOString(), '2026-12-31T23:59:59.000Z')

		// Sin caducidad
		const noExpiry = computeExpiryDate({ expiry_months: null })
		assert.equal(noExpiry, null)
	})
})
