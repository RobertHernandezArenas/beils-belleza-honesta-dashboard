/* eslint-disable @typescript-eslint/no-explicit-any -- loose fakes standing in for prisma rows and tx */
import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createError } from 'h3'
import { toApiError } from '../server/utils/errors'

/**
 * Debt sales are invoiced at creation (one atomic POST) and their partial payments never
 * rewrite the sale. Legacy debts (cart without invoice) keep being invoiced at payoff.
 * Same approach as sales-carts-routes.test.ts: Nuxt auto-imports stubbed on globalThis and
 * an in-memory prisma whose transaction only commits when the callback resolves.
 */

type Row = Record<string, any>
type Handler = (event: unknown) => Promise<any>

interface Db {
	carts: Row[]
	debts: Row[]
	payments: Row[]
	failDebtCreate: boolean
	nextInvoice: number
}

let db: Db
let postCart: Handler
let payDebt: Handler

const product = { product_id: 'p1', price: 50, tax_rate: 21 }

const buildPrisma = () => {
	const makeTx = (draft: Pick<Db, 'carts' | 'debts' | 'payments'>) => ({
		booking: { findFirst: async () => null, update: async () => ({}) },
		cart: {
			create: async ({ data }: Row) => {
				const { items: _items, ...rest } = data
				const cart = { cart_id: `cart-${draft.carts.length + 1}`, created_at: new Date('2026-01-01'), ...rest }
				draft.carts.push(cart)
				return cart
			},
			findUnique: async ({ where }: Row) => {
				const cart = draft.carts.find(c => c.cart_id === where.cart_id)
				return cart ? { ...cart, user: { document_number: null, user_id: cart.user_id } } : null
			},
			update: async ({ where, data }: Row) => {
				const cart = draft.carts.find(c => c.cart_id === where.cart_id)!
				Object.assign(cart, data)
				return cart
			},
		},
		debt: {
			create: async ({ data }: Row) => {
				if (db.failDebtCreate) throw new Error('debt insert failed')
				const debt = { debt_id: `debt-${draft.debts.length + 1}`, ...data }
				draft.debts.push(debt)
				return debt
			},
			findUnique: async ({ where }: Row) => draft.debts.find(d => d.debt_id === where.debt_id) ?? null,
			updateMany: async ({ where, data }: Row) => {
				const debt = draft.debts.find(
					d => d.debt_id === where.debt_id && d.remaining === where.remaining && d.status === where.status,
				)
				if (!debt) return { count: 0 }
				Object.assign(debt, data)
				return { count: 1 }
			},
		},
		debtPayment: {
			create: async ({ data }: Row) => {
				const payment = { payment_id: `pay-${draft.payments.length + 1}`, payment_date: new Date(), ...data }
				draft.payments.push(payment)
				return payment
			},
			findMany: async ({ where }: Row) => draft.payments.filter(p => p.debt_id === where.debt_id),
		},
	})

	return {
		product: { findMany: async () => [product] },
		service: { findMany: async () => [] },
		package: { findMany: async () => [] },
		user: { findUnique: async () => null },
		sequence: {
			upsert: async () => ({ last_value: db.nextInvoice++ }),
		},
		cart: {
			findFirst: async () => null,
			findUnique: async ({ where }: Row) => {
				const cart = db.carts.find(c => c.cart_id === where.cart_id)
				if (!cart) return null
				return { ...cart, debts: db.debts.filter(d => d.cart_id === cart.cart_id) }
			},
			update: async ({ where, data }: Row) => {
				const cart = db.carts.find(c => c.cart_id === where.cart_id)!
				Object.assign(cart, data)
				return cart
			},
		},
		$transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
			const draft = {
				carts: db.carts.map(c => ({ ...c })),
				debts: db.debts.map(d => ({ ...d })),
				payments: [...db.payments],
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
	g.toApiError = toApiError
	g.useRuntimeConfig = () => ({ salonNif: 'X', salonName: 'Salon', public: {} })
	g.prisma = buildPrisma()
	postCart = (await import('../server/api/sales/carts/index')).default as Handler
	payDebt = (await import('../server/api/debts/[id]/pay.post')).default as Handler
})

beforeEach(() => {
	db = { carts: [], debts: [], payments: [], failDebtCreate: false, nextInvoice: 1 }
	g.prisma = buildPrisma()
})

const postEvent = (body: Row) => ({ node: { req: { method: 'POST' } }, body, params: {} })
const payEvent = (body: Row, id = 'debt-1') => ({ node: { req: { method: 'POST' } }, body, params: { id }, context: { user: { role: 'ADMIN' } } })

const statusOf = async (fn: () => Promise<unknown>) => {
	try {
		await fn()
		return 'ok'
	} catch (err) {
		return (err as { statusCode?: number }).statusCode
	}
}

const sale = (overrides: Row = {}) => ({
	user_id: 'u1',
	status: 'pending',
	payment_method: 'card',
	items: [{ item_id: 'p1', item_type: 'product', name: 'Crema', quantity: 2, unit_price: 0.01 }],
	...overrides,
})

describe('POST /api/sales/carts with payment_method debt', () => {
	it('creates the cart and its debt atomically, invoiced at creation, with the amount from server totals', async () => {
		const cart = await postCart(postEvent(sale({ payment_method: 'debt', amount: 1, debt_amount: 1 })))

		assert.equal(cart.total, 100)
		assert.equal(cart.status, 'completed')
		assert.equal(cart.payment_method, 'debt')
		assert.match(cart.invoice_number, /^BBH-\d{2}-\d{4}-0001$/)
		assert.equal(db.debts.length, 1)
		assert.deepEqual(
			{ user_id: db.debts[0]!.user_id, cart_id: db.debts[0]!.cart_id, amount: db.debts[0]!.amount, remaining: db.debts[0]!.remaining, status: db.debts[0]!.status },
			{ user_id: 'u1', cart_id: cart.cart_id, amount: 100, remaining: 100, status: 'pending' },
		)
		assert.equal(cart.debts.length, 1)
	})

	it('rolls the cart back when the debt cannot be created', async () => {
		db.failDebtCreate = true
		await assert.rejects(() => postCart(postEvent(sale({ payment_method: 'debt' }))), /debt insert failed/)
		assert.equal(db.carts.length, 0)
		assert.equal(db.debts.length, 0)
	})

	it('requires a registered client', async () => {
		assert.equal(await statusOf(() => postCart(postEvent(sale({ payment_method: 'debt', user_id: undefined })))), 400)
		assert.equal(db.carts.length, 0)
		assert.equal(db.debts.length, 0)
	})
})

describe('POST /api/sales/carts with a mixed payment', () => {
	const mixed = (breakdown: unknown) => sale({ status: 'completed', payment_method: 'mixed', payment_breakdown: breakdown })

	it('stores the validated per-method breakdown', async () => {
		const cart = await postCart(postEvent(mixed([{ method: 'cash', amount: 30 }, { method: 'card', amount: 70 }])))
		assert.equal(cart.payment_method, 'mixed')
		assert.deepEqual(JSON.parse(cart.payment_breakdown), [
			{ method: 'cash', amount: 30 },
			{ method: 'card', amount: 70 },
		])
	})

	it('rejects a sum different from the server total and creates nothing', async () => {
		assert.equal(await statusOf(() => postCart(postEvent(mixed([{ method: 'cash', amount: 30 }, { method: 'card', amount: 60 }])))), 400)
		assert.equal(db.carts.length, 0)
	})

	it('answers 400 with the server total in the message and in data.expected_total', async () => {
		const err = await postCart(postEvent(mixed([{ method: 'cash', amount: 30 }, { method: 'card', amount: 60 }]))).catch((e: any) => e)
		assert.equal(err.statusCode, 400)
		assert.equal(err.statusMessage, 'El desglose del pago mixto (90,00 EUR) no coincide con el total de la venta (100,00 EUR)')
		assert.equal(err.data.expected_total, 100)
	})

	it('rejects a missing breakdown and zero amounts', async () => {
		assert.equal(await statusOf(() => postCart(postEvent(mixed(undefined)))), 400)
		assert.equal(await statusOf(() => postCart(postEvent(mixed([{ method: 'cash', amount: 100 }, { method: 'card', amount: 0 }])))), 400)
	})

	it('ignores a breakdown sent with a single method', async () => {
		const cart = await postCart(
			postEvent(sale({ status: 'completed', payment_method: 'bizum', payment_breakdown: [{ method: 'cash', amount: 100 }] })),
		)
		assert.equal(cart.payment_breakdown ?? null, null)
	})
})

describe('POST /api/debts/:id/pay', () => {
	const invoicedDebtSale = () => {
		db.carts.push({
			cart_id: 'cart-1',
			user_id: 'u1',
			status: 'completed',
			payment_method: 'debt',
			total: 100,
			invoice_number: 'BBH-01-2026-0001',
			created_at: new Date('2026-01-01'),
		})
		db.debts.push({ debt_id: 'debt-1', user_id: 'u1', cart_id: 'cart-1', amount: 100, remaining: 100, status: 'pending' })
	}

	it('records a partial payment with its method and never rewrites an invoiced sale', async () => {
		invoicedDebtSale()
		const res = await payDebt(payEvent({ amount: 40, payment_method: 'bizum' }))

		assert.equal(res.data.debt.remaining, 60)
		assert.equal(res.data.debt.status, 'partial')
		assert.equal(res.data.debt.payments.length, 1)
		assert.equal(db.payments[0]!.payment_method, 'bizum')
		assert.equal(db.carts[0]!.payment_method, 'debt')
		assert.equal(db.carts[0]!.status, 'completed')
		assert.equal(+db.carts[0]!.created_at, +new Date('2026-01-01'))
	})

	it('keeps the sale untouched when the last payment settles an invoiced debt', async () => {
		invoicedDebtSale()
		await payDebt(payEvent({ amount: 40, payment_method: 'cash' }))
		const res = await payDebt(payEvent({ amount: 60, payment_method: 'card' }))

		assert.equal(res.data.debt.status, 'paid')
		assert.equal(res.data.debt.payments.length, 2)
		assert.equal(db.carts[0]!.payment_method, 'debt')
		assert.equal(db.carts[0]!.invoice_number, 'BBH-01-2026-0001')
		assert.equal(+db.carts[0]!.created_at, +new Date('2026-01-01'))
		assert.equal(db.nextInvoice, 1) // no new invoice number consumed
	})

	it('stores and validates a mixed breakdown against the amount paid', async () => {
		invoicedDebtSale()
		const res = await payDebt(
			payEvent({ amount: 50, payment_method: 'mixed', payment_breakdown: [{ method: 'cash', amount: 20 }, { method: 'card', amount: 30 }] }),
		)
		assert.deepEqual(JSON.parse(res.data.payment.payment_breakdown), [
			{ method: 'cash', amount: 20 },
			{ method: 'card', amount: 30 },
		])
		assert.equal(
			await statusOf(() =>
				payDebt(payEvent({ amount: 10, payment_method: 'mixed', payment_breakdown: [{ method: 'cash', amount: 3 }, { method: 'card', amount: 3 }] })),
			),
			400,
		)
	})

	it('a mixed breakdown that misses the capped amount answers 400 with data.expected_total', async () => {
		invoicedDebtSale()
		const err = await payDebt(
			payEvent({ amount: 500, payment_method: 'mixed', payment_breakdown: [{ method: 'cash', amount: 20 }, { method: 'card', amount: 30 }] }),
		).catch((e: any) => e)
		assert.equal(err.statusCode, 400)
		assert.match(err.statusMessage, /\(50,00 EUR\) no coincide con el importe a cobrar \(100,00 EUR\)/)
		assert.equal(err.data.expected_total, 100)
	})

	it('legacy debt (cart without invoice): still invoiced and completed at payoff', async () => {
		db.carts.push({
			cart_id: 'cart-1',
			user_id: 'u1',
			status: 'pending',
			payment_method: 'debt',
			total: 100,
			invoice_number: null,
			created_at: new Date('2026-01-01'),
		})
		db.debts.push({ debt_id: 'debt-1', user_id: 'u1', cart_id: 'cart-1', amount: 100, remaining: 100, status: 'pending' })

		await payDebt(payEvent({ amount: 40, payment_method: 'cash' }))
		assert.equal(db.carts[0]!.status, 'pending')
		assert.equal(db.carts[0]!.invoice_number, null)

		await payDebt(payEvent({ amount: 60, payment_method: 'card' }))
		assert.equal(db.carts[0]!.status, 'completed')
		assert.equal(db.carts[0]!.payment_method, 'card')
		assert.match(db.carts[0]!.invoice_number, /^BBH-/)
	})
})
