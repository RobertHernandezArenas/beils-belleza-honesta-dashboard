/* eslint-disable @typescript-eslint/no-explicit-any -- loose fakes standing in for repository rows */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { payDebt, type PayDebtDeps } from '../server/modules/debts/pay-debt'
import { listDebts } from '../server/modules/debts/list-debts'
import { createDebt } from '../server/modules/debts/create-debt'
import { getDebt } from '../server/modules/debts/get-debt'
import { updateDebt } from '../server/modules/debts/update-debt'
import { deleteDebt } from '../server/modules/debts/delete-debt'
import { listDebtPayments } from '../server/modules/debts/list-debt-payments'
import type { DebtsRepository, DebtUnitOfWork } from '../server/modules/debts/ports'

/**
 * The debt use cases against plain in-memory ports: no globals, no Prisma, no Nuxt.
 */

type Row = Record<string, any>

interface Store {
	debts: Row[]
	payments: Row[]
	carts: Row[]
	invoiced: Row[]
	invoiceErrors: string[]
}

let store: Store

const buildRepository = (): DebtsRepository => ({
	transaction: async work => {
		const draft = {
			debts: store.debts.map(d => ({ ...d })),
			payments: [...store.payments],
			carts: store.carts.map(c => ({ ...c })),
		}
		const uow: DebtUnitOfWork = {
			debtTx: {
				debt: {
					updateMany: async ({ where, data }) => {
						const debt = draft.debts.find(
							d => d.debt_id === where.debt_id && d.remaining === where.remaining && d.status === where.status,
						)
						if (!debt) return { count: 0 }
						Object.assign(debt, data)
						return { count: 1 }
					},
				},
			},
			findDebt: async id => (draft.debts.find(d => d.debt_id === id) as any) ?? null,
			createPayment: async data => {
				const payment = { payment_id: `pay-${draft.payments.length + 1}`, ...data }
				draft.payments.push(payment)
				return payment
			},
			listPayments: async id => draft.payments.filter(p => p.debt_id === id),
			findCartForPayoff: async id => (draft.carts.find(c => c.cart_id === id) as any) ?? null,
			completeCart: async (id, data) => {
				Object.assign(draft.carts.find(c => c.cart_id === id)!, data)
			},
		}
		const result = await work(uow)
		Object.assign(store, draft)
		return result
	},
	saveInvoice: async (cartId, data) => {
		store.invoiced.push({ cart_id: cartId, ...data })
	},
	markInvoiceError: async cartId => {
		store.invoiceErrors.push(cartId)
	},
	listDebts: async () => store.debts as any,
	findCartForDebt: async cartId => {
		const cart = store.carts.find(c => c.cart_id === cartId)
		return cart ? { user_id: cart.user_id ?? cart.user?.user_id ?? null, total: cart.total } : null
	},
	createDebt: async data => {
		const created = { debt_id: `debt-${store.debts.length + 1}`, created_at: new Date(), ...data }
		store.debts.push(created)
		return created as any
	},
	findDebtById: async id => (store.debts.find(d => d.debt_id === id) as any) ?? null,
	findDebtAmount: async id => {
		const debt = store.debts.find(d => d.debt_id === id)
		return debt ? { amount: debt.amount } : null
	},
	updateDebt: async (id, data) => {
		const debt = store.debts.find(d => d.debt_id === id)
		if (debt) Object.assign(debt, data)
		return debt as any
	},
	deleteDebt: async id => {
		store.debts = store.debts.filter(d => d.debt_id !== id)
	},
	listDebtPayments: async () => store.payments as any,
})

const buildDeps = (debts = buildRepository()): PayDebtDeps => ({
	debts,
	verifactu: {
		generateInvoiceNumber: async type => `${type}-0001`,
		submit: async () => ({ hash: 'h', qrUrl: 'qr', aeatStatus: 'submitted' }),
	},
	issuer: { nif: 'X', name: 'Salon' },
	now: () => new Date('2026-03-10T10:00:00Z'),
})

const pay = (overrides: Row = {}) => ({ debtId: 'debt-1', amount: 40, paymentMethod: 'cash', ...overrides })

const rejection = async (fn: () => Promise<unknown>) => {
	try {
		await fn()
	} catch (err) {
		return err as { statusCode?: number; statusMessage?: string; data?: Row }
	}
	assert.fail('expected the use case to throw')
}

beforeEach(() => {
	store = {
		debts: [{ debt_id: 'debt-1', user_id: 'u1', cart_id: 'cart-1', amount: 100, remaining: 100, status: 'pending' }],
		payments: [],
		carts: [{ cart_id: 'cart-1', status: 'completed', total: 100, invoice_number: 'BBH-1', payment_method: 'debt', user: null }],
		invoiced: [],
		invoiceErrors: [],
	}
})

describe('payDebt', () => {
	it('records a partial payment and leaves the debt partial with its payment history', async () => {
		const res = await payDebt(buildDeps(), pay({ notes: 'first instalment' }))

		assert.equal(res.success, true)
		assert.equal(res.data.debt.remaining, 60)
		assert.equal(res.data.debt.status, 'partial')
		assert.equal(res.data.debt.payments.length, 1)
		assert.equal(res.data.payment.amount, 40)
		assert.equal(res.data.payment.notes, 'first instalment')
		assert.equal(store.debts[0]!.remaining, 60)
	})

	it('settles the debt on the final payment, capped at what is owed', async () => {
		store.debts[0]!.remaining = 30
		store.debts[0]!.status = 'partial'

		const res = await payDebt(buildDeps(), pay({ amount: 50 }))

		assert.equal(res.data.payment.amount, 30)
		assert.equal(res.data.debt.remaining, 0)
		assert.equal(res.data.debt.status, 'paid')
	})

	it('does not touch or re-invoice a cart that was already invoiced at sale time', async () => {
		await payDebt(buildDeps(), pay({ amount: 100 }))

		assert.equal(store.invoiced.length, 0)
		assert.equal(store.carts[0]!.status, 'completed')
	})

	it('completes and invoices the cart of a legacy debt at payoff, after the commit', async () => {
		store.carts[0] = { cart_id: 'cart-1', status: 'pending', total: 100, invoice_number: null, payment_method: 'debt', user: { document_number: '123', user_id: 'u1' } }

		await payDebt(buildDeps(), pay({ amount: 100, paymentMethod: 'card' }))

		assert.equal(store.carts[0]!.status, 'completed')
		assert.equal(store.carts[0]!.payment_method, 'card')
		assert.equal(store.carts[0]!.created_at.toISOString(), '2026-03-10T10:00:00.000Z')
		assert.equal(store.invoiced.length, 1)
		assert.equal(store.invoiced[0]!.cart_id, 'cart-1')
		assert.equal(store.invoiced[0]!.invoice_type, 'F1')
	})

	it('flags the legacy cart with an AEAT error but keeps the payment when Verifactu fails', async () => {
		store.carts[0] = { cart_id: 'cart-1', status: 'pending', total: 100, invoice_number: null, payment_method: 'debt', user: null }
		const deps = buildDeps()
		deps.verifactu.submit = async () => { throw new Error('AEAT down') }
		const logged = console.error
		console.error = () => {}
		try {
			await payDebt(deps, pay({ amount: 100 }))
		} finally {
			console.error = logged
		}

		assert.equal(store.payments.length, 1)
		assert.deepEqual(store.invoiceErrors, ['cart-1'])
	})

	it('answers 409 and records nothing when another payment changed the balance meanwhile', async () => {
		const repo = buildRepository()
		const deps = buildDeps({
			...repo,
			// A concurrent payment lands after our read: the guarded update no longer matches
			transaction: work => repo.transaction(async uow => work({
				...uow,
				findDebt: async id => {
					const debt = await uow.findDebt(id)
					return debt && { ...debt, remaining: 90 }
				},
			})),
		})

		const err = await rejection(() => payDebt(deps, pay()))
		assert.equal(err.statusCode, 409)
		assert.equal(store.payments.length, 0)
		assert.equal(store.debts[0]!.remaining, 100)
	})

	it('answers 400 with the amount to collect in data.expected_total for a mixed split that does not add up', async () => {
		const err = await rejection(() => payDebt(buildDeps(), pay({
			paymentMethod: 'mixed',
			paymentBreakdown: [{ method: 'cash', amount: 10 }, { method: 'card', amount: 10 }],
		})))

		assert.equal(err.statusCode, 400)
		assert.deepEqual(err.data, { expected_total: 40 })
		assert.equal(store.payments.length, 0)
	})

	it('answers 404 for an unknown debt and 400 for one already paid', async () => {
		assert.equal((await rejection(() => payDebt(buildDeps(), pay({ debtId: 'nope' })))).statusCode, 404)

		store.debts[0]!.status = 'paid'
		store.debts[0]!.remaining = 0
		assert.equal((await rejection(() => payDebt(buildDeps(), pay()))).statusCode, 400)
	})
})

describe('listDebts', () => {
	it('lists all debts', async () => {
		const res = await listDebts({ debts: buildRepository() }, {})
		assert.equal(res.length, 1)
	})
})

describe('createDebt', () => {
	it('creates debt for a client', async () => {
		const res = await createDebt({ debts: buildRepository() }, { user_id: 'u1', amount: 50 })
		assert.equal(res.amount, 50)
		assert.equal(res.status, 'pending')
	})

	it('throws 404 if ticket/cart not found', async () => {
		const err = await rejection(() => createDebt({ debts: buildRepository() }, { user_id: 'u1', cart_id: 'cart-missing' }))
		assert.equal(err.statusCode, 404)
		assert.equal(err.statusMessage, 'Ticket no encontrado')
	})
})

describe('getDebt', () => {
	it('throws 400 if debt ID is missing', async () => {
		const err = await rejection(() => getDebt({ debts: buildRepository() }, ''))
		assert.equal(err.statusCode, 400)
		assert.equal(err.statusMessage, 'Debt ID is required')
	})

	it('throws 404 if debt not found', async () => {
		const err = await rejection(() => getDebt({ debts: buildRepository() }, 'non-existent'))
		assert.equal(err.statusCode, 404)
		assert.equal(err.statusMessage, 'Debt not found')
	})

	it('returns debt if found', async () => {
		const res = await getDebt({ debts: buildRepository() }, 'debt-1')
		assert.equal(res.debt_id, 'debt-1')
	})
})

describe('updateDebt', () => {
	it('updates debt remaining and status', async () => {
		const res = await updateDebt({ debts: buildRepository() }, 'debt-1', { remaining: 50, notes: 'partial' })
		assert.equal(res.remaining, 50)
		assert.equal(res.notes, 'partial')
	})

	it('marks debt as paid if remaining <= 0', async () => {
		const res = await updateDebt({ debts: buildRepository() }, 'debt-1', { remaining: 0 })
		assert.equal(res.remaining, 0)
		assert.equal(res.status, 'paid')
	})

	it('throws 400 if remaining exceeds amount', async () => {
		const err = await rejection(() => updateDebt({ debts: buildRepository() }, 'debt-1', { remaining: 200 }))
		assert.equal(err.statusCode, 400)
		assert.equal(err.statusMessage, 'El saldo pendiente no puede superar el importe de la deuda')
	})
})

describe('deleteDebt', () => {
	it('deletes debt and returns success', async () => {
		const res = await deleteDebt({ debts: buildRepository() }, 'debt-1')
		assert.deepEqual(res, { success: true })
		assert.equal(store.debts.length, 0)
	})
})

describe('listDebtPayments', () => {
	it('returns payments list within limit', async () => {
		const res = await listDebtPayments({ debts: buildRepository() }, {})
		assert.equal(res.length, 0)
	})
})
