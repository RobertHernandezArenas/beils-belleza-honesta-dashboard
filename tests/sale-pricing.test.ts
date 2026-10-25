import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseSaleLines, priceSaleLines, validateDiscount, type SaleCatalog } from '../server/utils/sale-pricing'

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
