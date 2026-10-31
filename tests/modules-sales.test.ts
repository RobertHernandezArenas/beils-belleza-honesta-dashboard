/* eslint-disable @typescript-eslint/no-explicit-any -- loose fakes standing in for repository rows */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createSale, type CreateSaleDeps } from '../server/modules/sales/create-sale'
import { getCart } from '../server/modules/sales/get-cart'
import { deleteCart } from '../server/modules/sales/delete-cart'
import { listCarts } from '../server/modules/sales/list-carts'
import { updateCart } from '../server/modules/sales/update-cart'
import type { SalesRepository, SaleUnitOfWork, NewCart, NewDebt } from '../server/modules/sales/ports'

/**
 * The sales use cases against plain in-memory ports: no globals, no Prisma, no Nuxt.
 */

type Row = Record<string, any>

interface Store {
	carts: (NewCart & { cart_id: string; [k: string]: any })[]
	debts: NewDebt[]
	coupon: Row | null
	couponRaced: boolean
	invoiced: Row[]
	invoiceErrors: string[]
	events: string[]
}

let store: Store

const product = { price: 50, tax_rate: 21 }

const buildRepository = (): SalesRepository<Row> => ({
	loadCatalog: async () => ({
		products: new Map([['p1', product]]),
		services: new Map(),
		packages: new Map(),
	}),
	transaction: async work => {
		const draft = {
			carts: [...store.carts],
			debts: [...store.debts],
			coupon: store.coupon ? { ...store.coupon } : null,
		}
		store.events.push('begin')
		const uow = {
			couponTx: {
				coupon: {
					findUnique: async () => draft.coupon,
					updateMany: async () => {
						if (store.couponRaced) return { count: 0 }
						draft.coupon!.current_uses += 1
						return { count: 1 }
					},
					deleteMany: async () => ({ count: 0 }),
				},
			},
			consumptionTx: {},
			completeBooking: async () => ({}),
			findUnlinkedBookingAround: async () => null,
			createCart: async ({ ...cart }: NewCart) => {
				const created = { cart_id: `cart-${draft.carts.length + 1}`, ...cart }
				draft.carts.push(created)
				return created
			},
			createDebt: async (debt: NewDebt) => {
				draft.debts.push(debt)
			},
			deleteCartItems: async () => ({ count: 0 }),
			createCartItems: async (items: any[]) => {
				const cart = draft.carts[0]
				if (cart) cart.items = items
				return { count: items.length }
			},
			updateCart: async (cartId: string, data: any) => {
				const idx = draft.carts.findIndex(c => c.cart_id === cartId)
				if (idx !== -1) {
					draft.carts[idx] = { ...draft.carts[idx], ...data }
					return draft.carts[idx]
				}
				return data
			},
			updateDebt: async (debtId: string, data: any) => {
				const idx = draft.debts.findIndex(d => (d as any).debt_id === debtId)
				if (idx !== -1) {
					draft.debts[idx] = { ...draft.debts[idx], ...data }
				}
			},
			findCatalogPackage: async () => null,
			createClientPackage: async () => ({ client_package_id: 'cp-1' }),
			createClientPackageItems: async () => ({ count: 1 }),
		} as unknown as SaleUnitOfWork
		const result = await work(uow)
		Object.assign(store, draft)
		store.events.push('commit')
		return result
	},
	findUserDocument: async () => ({ document_number: null }),
	saveInvoice: async (cartId, data) => {
		store.events.push('invoice')
		store.invoiced.push({ cart_id: cartId, ...data })
	},
	markInvoiceError: async cartId => {
		store.invoiceErrors.push(cartId)
	},
	findCartView: async cartId => ({
		...store.carts.find(c => c.cart_id === cartId)!,
		invoice: store.invoiced.find(i => i.cart_id === cartId) ?? null,
	}),
	findCartById: async cartId => {
		const cart = store.carts.find(c => c.cart_id === cartId)
		return (cart ? { ...cart } : null) as any
	},
	findCartForUpdate: async cartId => {
		const cart = store.carts.find(c => c.cart_id === cartId)
		return (cart ? { ...cart } : null) as any
	},
	deleteCart: async cartId => {
		store.carts = store.carts.filter(c => c.cart_id !== cartId)
	},
	listCarts: async () => store.carts as any,
})

const buildDeps = (): CreateSaleDeps<Row> => ({
	sales: buildRepository(),
	verifactu: {
		generateInvoiceNumber: async type => `${type}-0001`,
		submit: async () => ({ hash: 'h', qrUrl: 'qr', aeatStatus: 'submitted' }),
	},
	issuer: { nif: 'X', name: 'Salon' },
	now: () => new Date('2026-03-10T10:00:00Z'),
})

const input = (cartData: Row = {}, extra: Row = {}) => ({
	userId: 'u1',
	rawItems: [{ item_id: 'p1', item_type: 'product', name: 'Crema', quantity: 2 }],
	cartData: { payment_method: 'card', status: 'pending', ...cartData },
	...extra,
})

const rejection = async (fn: () => Promise<unknown>) => {
	try {
		await fn()
	} catch (err) {
		return err as { statusCode?: number; statusMessage?: string; data?: Row }
	}
	assert.fail('expected the use case to throw')
}

beforeEach(() => {
	store = { carts: [], debts: [], coupon: null, couponRaced: false, invoiced: [], invoiceErrors: [], events: [] }
})

describe('createSale', () => {
	it('creates a normal sale priced from the catalog and leaves it pending without an invoice', async () => {
		const view = await createSale(buildDeps(), input({}, { rawItems: [{ item_id: 'p1', item_type: 'product', name: 'Crema', quantity: 2, unit_price: 0.01 }] }))

		assert.equal(view.total, 100)
		assert.equal(view.status, 'pending')
		assert.equal(view.payment_method, 'card')
		assert.equal(view.items[0].unit_price, 50)
		assert.equal(store.debts.length, 0)
		assert.equal(store.invoiced.length, 0)
	})

	it('invoices a completed sale only after the transaction committed', async () => {
		const view = await createSale(buildDeps(), input({ status: 'completed' }))

		assert.deepEqual(store.events, ['begin', 'commit', 'invoice'])
		assert.equal(view.invoice.invoice_number, 'I-0001')
		assert.equal(view.invoice.aeat_status, 'submitted')
	})

	it('flags the cart with an AEAT error but keeps the sale when Verifactu fails', async () => {
		const deps = buildDeps()
		deps.verifactu.submit = async () => { throw new Error('AEAT down') }
		const logged = console.error
		console.error = () => {}
		try {
			await createSale(deps, input({ status: 'completed' }))
		} finally {
			console.error = logged
		}

		assert.equal(store.carts.length, 1)
		assert.deepEqual(store.invoiceErrors, ['cart-1'])
	})

	it('creates a debt sale: completed cart plus its debt in the same transaction, then invoiced', async () => {
		const view = await createSale(buildDeps(), input({ payment_method: 'debt' }))

		assert.equal(view.status, 'completed')
		assert.deepEqual(store.debts, [{ user_id: 'u1', cart_id: 'cart-1', amount: 100, remaining: 100, status: 'pending' }])
		assert.deepEqual(store.events, ['begin', 'commit', 'invoice'])
	})

	it('rolls the cart back when the debt cannot be created', async () => {
		const deps = buildDeps()
		const uowDebtFails = deps.sales.transaction
		deps.sales.transaction = work => uowDebtFails(async uow => work({ ...uow, createDebt: async () => { throw new Error('debt insert failed') } }))

		await assert.rejects(() => createSale(deps, input({ payment_method: 'debt' })), /debt insert failed/)
		assert.equal(store.carts.length, 0)
		assert.equal(store.debts.length, 0)
	})

	it('requires a registered client for a debt sale', async () => {
		const err = await rejection(() => createSale(buildDeps(), { ...input({ payment_method: 'debt' }), userId: undefined }))
		assert.equal(err.statusCode, 400)
		assert.equal(err.statusMessage, 'Selecciona un cliente para dejar a deber.')
		assert.equal(store.carts.length, 0)
	})

	it('answers 409 and creates no cart when the coupon was just exhausted', async () => {
		store.coupon = {
			coupon_id: 'c1', code: 'PROMO', discount_type: 'percentage', discount_value: 10,
			min_purchase: null, max_uses: 1, current_uses: 0, valid_from: null, valid_until: null, status: 'activo',
		}
		store.couponRaced = true
		const deps = buildDeps()

		const err = await rejection(() => createSale(deps, input({ coupon_code: 'promo' })))
		assert.equal(err.statusCode, 409)
		assert.equal(store.carts.length, 0)
		assert.equal(store.events.includes('commit'), false)
	})

	it('answers 400 with the server total in data.expected_total for a mixed split that does not add up', async () => {
		const err = await rejection(() => createSale(buildDeps(), input({
			status: 'completed',
			payment_method: 'mixed',
			payment_breakdown: [{ method: 'cash', amount: 30 }, { method: 'card', amount: 60 }],
		})))

		assert.equal(err.statusCode, 400)
		assert.deepEqual(err.data, { expected_total: 100 })
		assert.equal(store.carts.length, 0)
	})

	it('stores a valid mixed breakdown', async () => {
		const view = await createSale(buildDeps(), input({
			payment_method: 'mixed',
			payment_breakdown: [{ method: 'cash', amount: 30 }, { method: 'card', amount: 70 }],
		}))

		assert.equal(view.payment_method, 'mixed')
		assert.deepEqual(JSON.parse(view.payment_breakdown), [{ method: 'cash', amount: 30 }, { method: 'card', amount: 70 }])
	})
})

describe('getCart', () => {
	it('throws 400 when cart ID is missing', async () => {
		const repo = buildRepository()
		const err = await rejection(() => getCart({ sales: repo }, ''))
		assert.equal(err.statusCode, 400)
		assert.equal(err.statusMessage, 'Cart ID is required')
	})

	it('throws 404 when cart is not found', async () => {
		const repo = buildRepository()
		const err = await rejection(() => getCart({ sales: repo }, 'non-existent'))
		assert.equal(err.statusCode, 404)
		assert.equal(err.statusMessage, 'Cart not found')
	})

	it('returns cart when found', async () => {
		store.carts.push({
			cart_id: 'cart-1',
			user_id: 'u1',
			booking_id: null,
			status: 'completed',
			payment_method: 'cash',
			payment_breakdown: null,
			notes: 'Test',
			subtotal: 50,
			discount: 0,
			total: 50,
			coupon_id: null,
			coupon_code: null,
			coupon_discount_type: null,
			coupon_discount_value: null,
			coupon_discount_amount: null,
			manual_discount_type: null,
			manual_discount_value: null,
			manual_discount_amount: null,
			items: [],
		})
		const repo = buildRepository()
		const res = await getCart({ sales: repo }, 'cart-1')
		assert.equal(res.cart_id, 'cart-1')
		assert.equal(res.total, 50)
	})
})

describe('deleteCart', () => {
	it('deletes cart and returns success', async () => {
		store.carts.push({
			cart_id: 'cart-1',
			user_id: 'u1',
			booking_id: null,
			status: 'pending',
			payment_method: 'card',
			payment_breakdown: null,
			notes: undefined,
			subtotal: 50,
			discount: 0,
			total: 50,
			coupon_id: null,
			coupon_code: null,
			coupon_discount_type: null,
			coupon_discount_value: null,
			coupon_discount_amount: null,
			manual_discount_type: null,
			manual_discount_value: null,
			manual_discount_amount: null,
			items: [],
		})
		const repo = buildRepository()
		const res = await deleteCart({ sales: repo }, 'cart-1')
		assert.deepEqual(res, { success: true })
		assert.equal(store.carts.length, 0)
	})
})

describe('listCarts', () => {
	it('returns list of carts', async () => {
		store.carts.push({
			cart_id: 'cart-1',
			user_id: 'u1',
			booking_id: null,
			status: 'pending',
			payment_method: 'card',
			payment_breakdown: null,
			notes: undefined,
			subtotal: 50,
			discount: 0,
			total: 50,
			coupon_id: null,
			coupon_code: null,
			coupon_discount_type: null,
			coupon_discount_value: null,
			coupon_discount_amount: null,
			manual_discount_type: null,
			manual_discount_value: null,
			manual_discount_amount: null,
			items: [],
		})
		const repo = buildRepository()
		const res = await listCarts({ sales: repo }, {})
		assert.equal(res.length, 1)
	})
})

describe('updateCart', () => {
	it('throws 400 if coupon code changed', async () => {
		store.carts.push({
			cart_id: 'cart-1',
			user_id: 'u1',
			booking_id: null,
			status: 'pending',
			payment_method: 'card',
			payment_breakdown: null,
			notes: undefined,
			subtotal: 50,
			discount: 0,
			total: 50,
			coupon_id: null,
			coupon_code: 'CODE1',
			coupon_discount_type: null,
			coupon_discount_value: null,
			coupon_discount_amount: null,
			manual_discount_type: null,
			manual_discount_value: null,
			manual_discount_amount: null,
			items: [],
		})
		const repo = buildRepository()
		const err = await rejection(() => updateCart({ sales: repo }, 'cart-1', { coupon_code: 'DIFFERENT' }))
		assert.equal(err.statusCode, 400)
		assert.equal(err.statusMessage, 'El cupón de una venta no se puede cambiar')
	})

	it('updates cart successfully', async () => {
		store.carts.push({
			cart_id: 'cart-1',
			user_id: 'u1',
			booking_id: null,
			status: 'pending',
			payment_method: 'card',
			payment_breakdown: null,
			notes: undefined,
			subtotal: 50,
			discount: 0,
			total: 50,
			coupon_id: null,
			coupon_code: 'CODE1',
			coupon_discount_type: null,
			coupon_discount_value: null,
			coupon_discount_amount: null,
			manual_discount_type: null,
			manual_discount_value: null,
			manual_discount_amount: null,
			items: [],
		})
		const repo = buildRepository()
		const res = await updateCart({ sales: repo }, 'cart-1', { coupon_code: 'CODE1', notes: 'Updated notes' })
		assert.equal(res.notes, 'Updated notes')
	})
})
