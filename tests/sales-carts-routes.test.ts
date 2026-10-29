/* eslint-disable @typescript-eslint/no-explicit-any -- loose fakes standing in for prisma rows and tx */
import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createError } from 'h3'

/**
 * Drives the real cart route handlers with a fake H3 event and an in-memory prisma.
 * Nuxt auto-imports (defineEventHandler, readBody, prisma...) are plain globals here, so
 * they are stubbed on globalThis BEFORE the handlers are imported; no production seam needed.
 */

type Row = Record<string, any>
type Handler = (event: unknown) => Promise<any>

interface Db {
	coupons: Row[]
	carts: Row[]
	cartItems: Row[]
	couponTouched: number
	/** Simulates losing the race on the conditional coupon update. */
	raceLost: boolean
	cartRow: Row | null
}

let db: Db
let postHandler: Handler
let putHandler: Handler

const product = { product_id: 'p1', price: 50, tax_rate: 21 }

const newDb = (): Db => ({ coupons: [], carts: [], cartItems: [], couponTouched: 0, raceLost: false, cartRow: null })

const buildPrisma = () => {
	// Writes go to a draft that is only committed when the transaction callback resolves
	const makeTx = (draft: { coupons: Row[]; carts: Row[]; cartItems: Row[] }) => ({
		booking: { findFirst: async () => null, update: async () => ({}) },
		coupon: {
			findUnique: async ({ where }: Row) => draft.coupons.find(c => c.code === where.code) ?? null,
			updateMany: async ({ where }: Row) => {
				db.couponTouched++
				if (db.raceLost) return { count: 0 }
				const row = draft.coupons.find(c => c.coupon_id === where.coupon_id)
				if (!row) return { count: 0 }
				row.current_uses += 1
				return { count: 1 }
			},
		},
		cart: {
			create: async ({ data }: Row) => {
				const { items: _items, ...rest } = data
				const cart = { cart_id: 'cart-1', ...rest }
				draft.carts.push(cart)
				return cart
			},
			update: async ({ where, data }: Row) => {
				db.cartRow = { ...db.cartRow, ...data }
				return { ...db.cartRow, cart_id: where.cart_id, debts: [] }
			},
		},
		cartItem: {
			deleteMany: async () => {
				draft.cartItems.length = 0
				return { count: 0 }
			},
			createMany: async ({ data }: Row) => {
				draft.cartItems.push(...data)
				return { count: data.length }
			},
		},
		debt: { update: async () => ({}) },
	})

	return {
		product: { findMany: async () => [product] },
		service: { findMany: async () => [] },
		package: { findMany: async () => [] },
		cart: { findUnique: async () => db.cartRow },
		// Coupons must never be read outside a transaction
		coupon: {
			findUnique: async () => {
				db.couponTouched++
				return null
			},
		},
		$transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
			const draft = {
				coupons: db.coupons.map(c => ({ ...c })),
				carts: [...db.carts],
				cartItems: [...db.cartItems],
			}
			const result = await fn(makeTx(draft))
			Object.assign(db, draft)
			return result
		},
	}
}

const g = globalThis as Record<string, unknown>

before(async () => {
	g.defineEventHandler = (fn: unknown) => fn
	g.readBody = async (event: Row) => event.body
	g.getQuery = () => ({})
	g.getRouterParam = (event: Row, name: string) => event.params?.[name]
	g.createError = createError
	g.useRuntimeConfig = () => ({ salonNif: 'X', salonName: 'Salon' })
	// Set before the import so server/utils/prisma.ts reuses it instead of opening a connection
	g.prisma = buildPrisma()
	postHandler = (await import('../server/api/sales/carts/index')).default as Handler
	putHandler = (await import('../server/api/sales/carts/[id]')).default as Handler
})

const event = (method: string, body: Row, params: Row = {}) => ({ node: { req: { method } }, body, params })

const statusOf = async (fn: () => Promise<unknown>) => {
	try {
		await fn()
		return 'ok'
	} catch (err) {
		return (err as { statusCode?: number }).statusCode
	}
}

const coupon = (overrides: Row = {}): Row => ({
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

const postBody = (overrides: Row = {}) => ({
	status: 'pending',
	payment_method: 'card',
	coupon_code: 'verano10',
	items: [{ item_id: 'p1', item_type: 'product', name: 'Crema', quantity: 2, unit_price: 0.01 }],
	...overrides,
})

describe('POST /api/sales/carts with a coupon', () => {
	beforeEach(() => {
		db = newDb()
		const fake = buildPrisma()
		// POST re-reads the created cart after the transaction
		fake.cart.findUnique = async () => db.carts[0] ?? null
		g.prisma = fake
	})

	it('counts the use inside the sale transaction and stores the coupon snapshot', async () => {
		db.coupons = [coupon()]
		const cart = await postHandler(event('POST', postBody()))

		assert.equal(db.coupons[0]!.current_uses, 1)
		assert.equal(cart.coupon_id, 'c1')
		assert.equal(cart.coupon_code, 'VERANO10')
		assert.equal(cart.coupon_discount_type, 'percentage')
		assert.equal(cart.coupon_discount_value, 10)
		assert.equal(cart.coupon_discount_amount, 10)
		// Catalog price (50 x 2), not the client's 0.01
		assert.equal(cart.subtotal, 100)
		assert.equal(cart.discount, 10)
		assert.equal(cart.total, 90)
	})

	it('also redeems the coupon on a debt sale (pending)', async () => {
		db.coupons = [coupon({ max_uses: 3 })]
		const cart = await postHandler(event('POST', postBody({ payment_method: 'debt', status: 'pending' })))

		assert.equal(db.coupons[0]!.current_uses, 1)
		assert.equal(cart.status, 'pending')
		assert.equal(cart.coupon_code, 'VERANO10')
	})

	it('fails with 409 and creates no cart when the coupon was exhausted by a concurrent sale', async () => {
		db.coupons = [coupon({ max_uses: 5, current_uses: 4 })]
		db.raceLost = true

		assert.equal(await statusOf(() => postHandler(event('POST', postBody()))), 409)
		assert.equal(db.carts.length, 0)
		assert.equal(db.coupons[0]!.current_uses, 4)
	})

	it('rejects an already exhausted coupon with 400 and keeps its usage', async () => {
		db.coupons = [coupon({ max_uses: 5, current_uses: 5 })]

		assert.equal(await statusOf(() => postHandler(event('POST', postBody()))), 400)
		assert.equal(db.carts.length, 0)
		assert.equal(db.coupons[0]!.current_uses, 5)
	})

	it('does not touch coupons when the sale has no coupon', async () => {
		db.coupons = [coupon()]
		const cart = await postHandler(event('POST', postBody({ coupon_code: undefined })))

		assert.equal(db.couponTouched, 0)
		assert.equal(cart.coupon_code, null)
		assert.equal(cart.total, 100)
	})
})

describe('PUT /api/sales/carts/:id with a locked coupon', () => {
	const stored = (): Row => ({
		cart_id: 'cart-1',
		user_id: null,
		status: 'pending',
		subtotal: 100,
		discount: 10,
		total: 90,
		invoice_number: null,
		aeat_status: null,
		coupon_id: 'c1',
		coupon_code: 'VERANO10',
		coupon_discount_type: 'percentage',
		coupon_discount_value: 10,
		coupon_discount_amount: 10,
		manual_discount_type: null,
		manual_discount_value: null,
		manual_discount_amount: null,
		items: [],
		user: null,
	})

	let updates: Row[]

	beforeEach(() => {
		db = newDb()
		db.cartRow = stored()
		updates = []
		const fake = buildPrisma()
		const baseTransaction = fake.$transaction
		fake.$transaction = (fn: (tx: any) => Promise<unknown>) =>
			baseTransaction(async (tx: any) => {
				const update = tx.cart.update
				tx.cart.update = async (args: Row) => {
					updates.push(args.data)
					return update(args)
				}
				return fn(tx)
			})
		g.prisma = fake
	})

	const put = (body: Row) => putHandler(event('PUT', body, { id: 'cart-1' }))

	it('reprices edited items from the stored coupon snapshot without reading or counting the live coupon', async () => {
		db.coupons = [coupon({ discount_value: 50, current_uses: 7 })] // live coupon changed since the sale
		const cart = await put({ items: [{ item_id: 'p1', item_type: 'product', name: 'Crema', quantity: 3 }] })

		assert.equal(cart.subtotal, 150)
		assert.equal(cart.coupon_discount_amount, 15) // 10% from the snapshot, not the live 50%
		assert.equal(cart.discount, 15)
		assert.equal(cart.total, 135)
		assert.equal(db.couponTouched, 0)
		assert.equal(db.coupons[0]!.current_uses, 7)
		assert.equal(db.cartItems.length, 1)
	})

	it('does not recompute totals when only non-pricing fields change', async () => {
		await put({ notes: 'Entregado en mano' })

		assert.equal(updates.length, 1)
		const data = updates[0]!
		assert.equal(data.notes, 'Entregado en mano')
		assert.equal(data.subtotal, 100)
		assert.equal(data.total, 90)
		for (const key of ['discount', 'coupon_discount_amount', 'manual_discount_amount']) {
			assert.equal(key in data, false, `${key} must not be written`)
		}
		assert.equal(db.cartItems.length, 0)
	})

	it('rejects a different coupon_code with 400', async () => {
		let error: { statusCode?: number; statusMessage?: string } | undefined
		try {
			await put({ coupon_code: 'OTRO20' })
		} catch (err) {
			error = err as typeof error
		}
		assert.equal(error?.statusCode, 400)
		assert.equal(error?.statusMessage, 'El cupón de una venta no se puede cambiar')
		assert.equal(updates.length, 0)
	})

	it('rejects clearing the coupon (null / blank code) with 400', async () => {
		assert.equal(await statusOf(() => put({ coupon_code: null })), 400)
		assert.equal(await statusOf(() => put({ coupon_code: '  ' })), 400)
	})

	it('accepts the same coupon_code, ignoring case and spaces', async () => {
		const cart = await put({ coupon_code: ' verano10 ', notes: 'ok' })
		assert.equal(cart.notes, 'ok')
		assert.equal(updates.length, 1)
	})
})
