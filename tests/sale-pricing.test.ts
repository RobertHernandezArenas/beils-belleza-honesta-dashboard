import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	parseSaleLines,
	priceSaleLines,
	validateDiscount,
	parseSaleDiscountRequest,
	priceSaleDiscounts,
	type SaleCatalog,
} from '../server/utils/sale-pricing'

const statusOf = (fn: () => unknown) => {
	try {
		fn()
		return 'ok'
	} catch (err) {
		return (err as { statusCode?: number }).statusCode
	}
}

const catalog: SaleCatalog = {
	products: new Map([['p1', { price: 12.5, tax_rate: 21 }]]),
	services: new Map([['s1', { price: 60, tax_rate: 10 }]]),
	packages: new Map([['k1', { price: 500 }]]),
}

describe('parseSaleLines', () => {
	const line = { item_id: 'p1', item_type: 'product', name: 'Crema', quantity: 2 }

	it('accepts valid lines and ignores client prices', () => {
		const [parsed] = parseSaleLines([{ ...line, unit_price: 0.01, tax_rate: 0 }])
		assert.equal('unit_price' in parsed!, false)
		assert.equal('tax_rate' in parsed!, false)
	})

	it('rejects bad quantities, unknown types and empty carts', () => {
		assert.equal(statusOf(() => parseSaleLines([{ ...line, quantity: -1 }])), 400)
		assert.equal(statusOf(() => parseSaleLines([{ ...line, quantity: 1.5 }])), 400)
		assert.equal(statusOf(() => parseSaleLines([{ ...line, quantity: 0 }])), 400)
		assert.equal(statusOf(() => parseSaleLines([{ ...line, item_type: 'giftcard' }])), 400)
		assert.equal(statusOf(() => parseSaleLines([])), 400)
		assert.equal(statusOf(() => parseSaleLines('nope')), 400)
	})
})

describe('priceSaleLines', () => {
	it('prices products, services and bono sales from the catalog', () => {
		const priced = priceSaleLines(
			parseSaleLines([
				{ item_id: 'p1', item_type: 'product', name: 'Crema', quantity: 2 },
				{ item_id: 's1', item_type: 'service', name: 'Indiba', quantity: 1 },
				{ item_id: 'k1', item_type: 'package_sale', name: 'Bono', quantity: 1 },
			]),
			catalog,
		)
		assert.deepEqual(
			priced.map(l => [l.unit_price, l.tax_rate]),
			[
				[12.5, 21],
				[60, 10],
				[500, 21],
			],
		)
	})

	it('charges nothing for a bono session (it consumes the bono instead)', () => {
		const [priced] = priceSaleLines(parseSaleLines([{ item_id: 'cp1', item_type: 'package', name: '[SESIÓN BONO] X', quantity: 1 }]), catalog)
		assert.equal(priced!.unit_price, 0)
	})

	it('rejects items that are not in the catalog', () => {
		assert.equal(
			statusOf(() => priceSaleLines(parseSaleLines([{ item_id: 'ghost', item_type: 'product', name: 'X', quantity: 1 }]), catalog)),
			400,
		)
	})
})

describe('validateDiscount', () => {
	it('accepts 0..subtotal', () => {
		assert.equal(validateDiscount(undefined, 100), 0)
		assert.equal(validateDiscount(15.555, 100), 15.56)
		assert.equal(validateDiscount(100, 100), 100)
	})

	it('rejects negative, non-numeric or larger-than-subtotal discounts', () => {
		assert.equal(statusOf(() => validateDiscount(-5, 100)), 400)
		assert.equal(statusOf(() => validateDiscount('10', 100)), 400)
		assert.equal(statusOf(() => validateDiscount(150, 100)), 400)
	})
})

describe('parseSaleDiscountRequest', () => {
	it('reads a coupon code and a typed manual discount', () => {
		assert.deepEqual(parseSaleDiscountRequest({ coupon_code: ' verano10 ', manual_discount_type: 'percentage', manual_discount_value: 10 }), {
			couponCode: 'VERANO10',
			manual: { type: 'percentage', value: 10 },
		})
	})

	it('keeps accepting the legacy fixed `discount` field', () => {
		assert.deepEqual(parseSaleDiscountRequest({ discount: 5 }), { couponCode: null, manual: { type: 'fixed', value: 5 } })
	})

	it('reports an absent manual discount as undefined and a zero one as null', () => {
		assert.deepEqual(parseSaleDiscountRequest({}), { couponCode: null, manual: undefined })
		assert.deepEqual(parseSaleDiscountRequest({ coupon_code: '', manual_discount_type: 'fixed', manual_discount_value: 0 }), {
			couponCode: null,
			manual: null,
		})
	})

	it('rejects invalid manual discounts', () => {
		assert.equal(statusOf(() => parseSaleDiscountRequest({ manual_discount_type: 'percentage', manual_discount_value: 101 })), 400)
		assert.equal(statusOf(() => parseSaleDiscountRequest({ manual_discount_type: 'fixed', manual_discount_value: -1 })), 400)
		assert.equal(statusOf(() => parseSaleDiscountRequest({ manual_discount_type: 'bogus', manual_discount_value: 1 })), 400)
		assert.equal(statusOf(() => parseSaleDiscountRequest({ discount: '10' })), 400)
	})
})

describe('priceSaleDiscounts', () => {
	it('stacks the coupon and the manual discount', () => {
		const pricing = priceSaleDiscounts(100, { type: 'percentage', value: 10 }, { type: 'fixed', value: 5 })
		assert.deepEqual([pricing.couponAmount, pricing.manualAmount, pricing.totalDiscount, pricing.total], [10, 5, 15, 85])
	})

	it('rejects a fixed manual discount larger than what the coupon leaves', () => {
		assert.equal(statusOf(() => priceSaleDiscounts(100, { type: 'fixed', value: 30 }, { type: 'fixed', value: 80 })), 400)
		assert.equal(priceSaleDiscounts(100, { type: 'fixed', value: 30 }, { type: 'fixed', value: 70 }).total, 0)
	})

	it('caps a locked coupon at the subtotal instead of failing (edited carts)', () => {
		assert.equal(priceSaleDiscounts(20, { type: 'fixed', value: 25 }, null).total, 0)
	})
})
