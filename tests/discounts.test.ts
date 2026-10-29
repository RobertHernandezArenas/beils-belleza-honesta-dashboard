import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	computeSaleDiscounts,
	couponRuleOf,
	manualRuleOf,
	describeSaleDiscounts,
	prorateDiscountByTaxRate,
} from '../shared/utils/discounts'

describe('computeSaleDiscounts', () => {
	it('applies no discount when there are no rules', () => {
		assert.deepEqual(computeSaleDiscounts(100, {}), {
			subtotal: 100,
			couponAmount: 0,
			manualAmount: 0,
			totalDiscount: 0,
			total: 100,
		})
	})

	it('applies the coupon on the subtotal first, then the manual discount on the remainder', () => {
		const result = computeSaleDiscounts(100, {
			coupon: { type: 'percentage', value: 10 },
			manual: { type: 'percentage', value: 10 },
		})
		assert.equal(result.couponAmount, 10)
		assert.equal(result.manualAmount, 9)
		assert.equal(result.totalDiscount, 19)
		assert.equal(result.total, 81)
	})

	it('supports fixed amounts for both rules', () => {
		const result = computeSaleDiscounts(50, { coupon: { type: 'fixed', value: 5 }, manual: { type: 'fixed', value: 5 } })
		assert.deepEqual([result.couponAmount, result.manualAmount, result.total], [5, 5, 40])
	})

	it('never discounts more than the subtotal', () => {
		const result = computeSaleDiscounts(30, { coupon: { type: 'fixed', value: 25 }, manual: { type: 'fixed', value: 25 } })
		assert.deepEqual([result.couponAmount, result.manualAmount, result.totalDiscount, result.total], [25, 5, 30, 0])
		assert.equal(computeSaleDiscounts(30, { coupon: { type: 'percentage', value: 150 } }).total, 0)
	})

	it('rounds every amount to cents', () => {
		const result = computeSaleDiscounts(33.33, { coupon: { type: 'percentage', value: 15 } })
		assert.equal(result.couponAmount, 5)
		assert.equal(result.total, 28.33)
		assert.equal(computeSaleDiscounts(10.01, { manual: { type: 'percentage', value: 50 } }).manualAmount, 5.01)
	})

	it('ignores zero or negative rule values', () => {
		assert.equal(computeSaleDiscounts(40, { manual: { type: 'fixed', value: 0 } }).totalDiscount, 0)
		assert.equal(computeSaleDiscounts(40, { manual: { type: 'fixed', value: -5 } }).totalDiscount, 0)
	})
})

describe('cart snapshot rules', () => {
	it('reads the coupon rule from the snapshot', () => {
		assert.deepEqual(couponRuleOf({ discount: 5, coupon_code: 'VERANO10', coupon_discount_type: 'percentage', coupon_discount_value: 10 }), {
			type: 'percentage',
			value: 10,
		})
		assert.equal(couponRuleOf({ discount: 5 }), null)
	})

	it('reads the manual rule from the snapshot', () => {
		assert.deepEqual(manualRuleOf({ discount: 3, manual_discount_type: 'fixed', manual_discount_value: 3 }), { type: 'fixed', value: 3 })
	})

	it('treats the discount of an old cart (no snapshot) as a fixed manual discount', () => {
		assert.deepEqual(manualRuleOf({ discount: 7.5 }), { type: 'fixed', value: 7.5 })
		assert.equal(manualRuleOf({ discount: 0 }), null)
	})

	it('does not mistake a coupon-only discount for a manual one', () => {
		assert.equal(
			manualRuleOf({ discount: 5, coupon_code: 'X', coupon_discount_type: 'fixed', coupon_discount_value: 5, manual_discount_type: null }),
			null,
		)
	})
})

describe('describeSaleDiscounts', () => {
	it('labels the coupon and the manual discount with their rule', () => {
		assert.deepEqual(
			describeSaleDiscounts({
				discount: 9.5,
				coupon_code: 'VERANO10',
				coupon_discount_type: 'percentage',
				coupon_discount_value: 10,
				coupon_discount_amount: 5,
				manual_discount_type: 'fixed',
				manual_discount_value: 4.5,
				manual_discount_amount: 4.5,
			}),
			[
				{ label: 'Cupón VERANO10 (−10%)', amount: 5 },
				{ label: 'Descuento (−4,50 €)', amount: 4.5 },
			],
		)
	})

	it('formats whole fixed values without decimals', () => {
		assert.deepEqual(describeSaleDiscounts({ discount: 5, manual_discount_type: 'fixed', manual_discount_value: 5, manual_discount_amount: 5 }), [
			{ label: 'Descuento (−5 €)', amount: 5 },
		])
	})

	it('shows a single plain line for old carts that only have a discount', () => {
		assert.deepEqual(describeSaleDiscounts({ discount: 12 }), [{ label: 'Descuento', amount: 12 }])
		assert.deepEqual(describeSaleDiscounts({ discount: 0 }), [])
	})
})

describe('prorateDiscountByTaxRate', () => {
	it('returns the VAT breakdown unchanged when there is no discount', () => {
		assert.deepEqual(prorateDiscountByTaxRate([{ tax_rate: 21, total: 121 }], 0), [
			{ rate: 21, gross: 121, discount: 0, net: 121, base: 100, vat: 21 },
		])
	})

	it('spreads the discount proportionally over each VAT rate', () => {
		const rows = prorateDiscountByTaxRate(
			[
				{ tax_rate: 21, total: 60 },
				{ tax_rate: 10, total: 50 },
				{ tax_rate: 21, total: 40 },
			],
			15,
		)
		assert.deepEqual(rows, [
			{ rate: 10, gross: 50, discount: 5, net: 45, base: 40.91, vat: 4.09 },
			{ rate: 21, gross: 100, discount: 10, net: 90, base: 74.38, vat: 15.62 },
		])
	})

	it('keeps the discounted totals equal to gross minus discount despite rounding', () => {
		const rows = prorateDiscountByTaxRate(
			[
				{ tax_rate: 21, total: 10 },
				{ tax_rate: 10, total: 10 },
				{ tax_rate: 4, total: 10 },
			],
			10,
		)
		const sum = (key: 'discount' | 'net') => Math.round(rows.reduce((acc, r) => acc + r[key], 0) * 100) / 100
		assert.equal(sum('discount'), 10)
		assert.equal(sum('net'), 20)
		for (const r of rows) assert.equal(Math.round((r.base + r.vat) * 100) / 100, r.net)
	})

	it('skips zero-value rates (bono sessions) and never discounts more than the gross', () => {
		const rows = prorateDiscountByTaxRate(
			[
				{ tax_rate: 21, total: 20 },
				{ tax_rate: 0, total: 0 },
			],
			50,
		)
		assert.deepEqual(rows, [{ rate: 21, gross: 20, discount: 20, net: 0, base: 0, vat: 0 }])
	})
})
