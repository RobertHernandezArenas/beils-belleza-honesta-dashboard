import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	parseCouponCreate,
	parseCouponUpdate,
	assertCouponRules,
	couponRejection,
	isCouponRedeemable,
	redeemCouponForSale,
	removeOrDeactivateCoupon,
	type CouponRow,
	type CouponTx,
} from '../server/utils/coupons'

const statusOf = async (fn: () => unknown) => {
	try {
		await fn()
		return 'ok'
	} catch (err) {
		return (err as { statusCode?: number }).statusCode
	}
}

const now = new Date('2026-06-15T12:00:00Z')

const coupon = (overrides: Partial<CouponRow> = {}): CouponRow => ({
	coupon_id: 'c1',
	code: 'VERANO10',
	discount_type: 'percentage',
	discount_value: 10,
	min_purchase: null,
	max_uses: null,
	current_uses: 0,
	valid_from: null,
	valid_until: null,
	status: 'activo',
	...overrides,
})

describe('parseCouponCreate', () => {
	const body = { code: ' verano10 ', description: '', discount_type: 'percentage', discount_value: 10 }

	it('normalizes the code to upper case and blank descriptions to null', () => {
		const parsed = parseCouponCreate(body)
		assert.equal(parsed.code, 'VERANO10')
		assert.equal(parsed.description, null)
	})

	it('accepts the coupon form payload, mapping the legacy fixed_amount type', () => {
		const parsed = parseCouponCreate({
			...body,
			discount_type: 'fixed_amount',
			discount_value: 5,
			min_purchase: null,
			max_uses: 100,
			valid_from: '2026-06-01T00:00:00.000Z',
			valid_until: null,
			status: 'inactivo',
		})
		assert.equal(parsed.discount_type, 'fixed')
		assert.ok(parsed.valid_from instanceof Date)
		assert.equal(parsed.status, 'inactivo')
	})

	it('rejects bad codes, values, types and unknown fields', async () => {
		assert.equal(await statusOf(() => parseCouponCreate({ ...body, code: '' })), 400)
		assert.equal(await statusOf(() => parseCouponCreate({ ...body, code: 'TWO WORDS' })), 400)
		assert.equal(await statusOf(() => parseCouponCreate({ ...body, discount_value: 0 })), 400)
		assert.equal(await statusOf(() => parseCouponCreate({ ...body, discount_value: 120 })), 400)
		assert.equal(await statusOf(() => parseCouponCreate({ ...body, discount_type: 'bogo' })), 400)
		assert.equal(await statusOf(() => parseCouponCreate({ ...body, max_uses: 1.5 })), 400)
		assert.equal(await statusOf(() => parseCouponCreate({ ...body, current_uses: 0 })), 400)
	})

	it('rejects an end date before the start date', async () => {
		assert.equal(
			await statusOf(() => parseCouponCreate({ ...body, valid_from: '2026-07-01T00:00:00.000Z', valid_until: '2026-06-01T00:00:00.000Z' })),
			400,
		)
	})
})

describe('parseCouponUpdate / assertCouponRules', () => {
	it('accepts partial updates', () => {
		assert.deepEqual(parseCouponUpdate({ status: 'inactivo' }), { status: 'inactivo' })
	})

	it('checks the merged coupon (e.g. a percentage over 100 after switching type)', async () => {
		const merged = { ...coupon({ discount_type: 'fixed', discount_value: 150 }), ...parseCouponUpdate({ discount_type: 'percentage' }) }
		assert.equal(await statusOf(() => assertCouponRules(merged)), 400)
	})
})

describe('couponRejection', () => {
	it('accepts an active coupon within its window and limits', () => {
		assert.equal(couponRejection(coupon(), { now, subtotal: 20 }), null)
		assert.equal(isCouponRedeemable(coupon({ max_uses: 5, current_uses: 4 }), now), true)
	})

	it('rejects inactive, not yet valid, expired and exhausted coupons', () => {
		assert.match(couponRejection(coupon({ status: 'inactivo' }), { now })!, /activo/)
		assert.match(couponRejection(coupon({ valid_from: new Date('2026-07-01') }), { now })!, /todavía/)
		assert.match(couponRejection(coupon({ valid_until: new Date('2026-06-01') }), { now })!, /caducado/)
		assert.match(couponRejection(coupon({ max_uses: 3, current_uses: 3 }), { now })!, /límite/)
		assert.equal(isCouponRedeemable(coupon({ max_uses: 3, current_uses: 3 }), now), false)
	})

	it('checks the minimum purchase against the subtotal', () => {
		assert.match(couponRejection(coupon({ min_purchase: 50 }), { now, subtotal: 49.99 })!, /compra mínima/)
		assert.equal(couponRejection(coupon({ min_purchase: 50 }), { now, subtotal: 50 }), null)
	})
})

function fakeCouponTx(row: CouponRow | null, { updateCount = 1, deleteCount = 1 } = {}) {
	const calls: { op: string; args: unknown }[] = []
	const tx: CouponTx = {
		coupon: {
			findUnique: async args => {
				calls.push({ op: 'findUnique', args })
				return row
			},
			updateMany: async args => {
				calls.push({ op: 'updateMany', args })
				return { count: updateCount }
			},
			deleteMany: async args => {
				calls.push({ op: 'deleteMany', args })
				return { count: deleteCount }
			},
		},
	}
	return { tx, calls }
}

describe('redeemCouponForSale', () => {
	it('looks the code up case-insensitively and returns the snapshot rule', async () => {
		const { tx, calls } = fakeCouponTx(coupon())
		const redeemed = await redeemCouponForSale(tx, { code: ' verano10', subtotal: 40, now })
		assert.deepEqual(redeemed, { coupon_id: 'c1', code: 'VERANO10', rule: { type: 'percentage', value: 10 } })
		assert.deepEqual(calls[0]!.args, { where: { code: 'VERANO10' } })
	})

	it('increments usage with a conditional update guarded by the usage limit', async () => {
		const { tx, calls } = fakeCouponTx(coupon({ max_uses: 5, current_uses: 2 }))
		await redeemCouponForSale(tx, { code: 'VERANO10', subtotal: 40, now })
		assert.deepEqual(calls[1], {
			op: 'updateMany',
			args: {
				where: { coupon_id: 'c1', status: 'activo', max_uses: 5, current_uses: { lt: 5 } },
				data: { current_uses: { increment: 1 } },
			},
		})
	})

	it('guards unlimited coupons on staying unlimited', async () => {
		const { tx, calls } = fakeCouponTx(coupon())
		await redeemCouponForSale(tx, { code: 'VERANO10', subtotal: 40, now })
		assert.deepEqual((calls[1]!.args as { where: unknown }).where, { coupon_id: 'c1', status: 'activo', max_uses: null })
	})

	it('fails the sale with 409 when the coupon was used up concurrently', async () => {
		const { tx } = fakeCouponTx(coupon({ max_uses: 1 }), { updateCount: 0 })
		assert.equal(await statusOf(() => redeemCouponForSale(tx, { code: 'VERANO10', subtotal: 40, now })), 409)
	})

	it('fails with 400 for unknown or ineligible coupons, without touching usage', async () => {
		const missing = fakeCouponTx(null)
		assert.equal(await statusOf(() => redeemCouponForSale(missing.tx, { code: 'NOPE', subtotal: 40, now })), 400)

		const expired = fakeCouponTx(coupon({ valid_until: new Date('2026-01-01') }))
		assert.equal(await statusOf(() => redeemCouponForSale(expired.tx, { code: 'VERANO10', subtotal: 40, now })), 400)
		assert.equal(expired.calls.some(c => c.op === 'updateMany'), false)

		const tooSmall = fakeCouponTx(coupon({ min_purchase: 100 }))
		assert.equal(await statusOf(() => redeemCouponForSale(tooSmall.tx, { code: 'VERANO10', subtotal: 40, now })), 400)
	})
})

describe('removeOrDeactivateCoupon', () => {
	it('hard-deletes a coupon that was never used', async () => {
		const { tx, calls } = fakeCouponTx(coupon())
		assert.deepEqual(await removeOrDeactivateCoupon(tx, 'c1'), { deleted: true, deactivated: false })
		assert.deepEqual(calls[0]!.args, { where: { coupon_id: 'c1', current_uses: 0 } })
	})

	it('deactivates a coupon that has been used instead of deleting it', async () => {
		const { tx, calls } = fakeCouponTx(coupon({ current_uses: 3 }), { deleteCount: 0 })
		assert.deepEqual(await removeOrDeactivateCoupon(tx, 'c1'), { deleted: false, deactivated: true })
		assert.deepEqual(calls[1]!.args, { where: { coupon_id: 'c1' }, data: { status: 'inactivo' } })
	})

	it('returns 404 when the coupon does not exist', async () => {
		const { tx } = fakeCouponTx(null, { deleteCount: 0, updateCount: 0 })
		assert.equal(await statusOf(() => removeOrDeactivateCoupon(tx, 'ghost')), 404)
	})
})
