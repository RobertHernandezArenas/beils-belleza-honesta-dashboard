import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeDebtPayment, commitDebtPayment, type DebtTx } from '../server/utils/debt-payment'

describe('computeDebtPayment', () => {
	it('applies a partial payment', () => {
		assert.deepEqual(computeDebtPayment(100, 40), { paymentAmount: 40, newRemaining: 60, newStatus: 'partial' })
	})

	it('caps overpayment at the remaining balance and marks the debt paid', () => {
		assert.deepEqual(computeDebtPayment(30, 50), { paymentAmount: 30, newRemaining: 0, newStatus: 'paid' })
	})

	it('rounds to cents and treats sub-cent leftovers as paid', () => {
		assert.deepEqual(computeDebtPayment(10.005, 10), { paymentAmount: 10, newRemaining: 0, newStatus: 'paid' })
	})
})

/** In-memory debt row with the conditional-update semantics of the real database. */
function fakeTx(state: { remaining: number; status: string }): DebtTx {
	return {
		debt: {
			updateMany: async ({ where, data }) => {
				if (where.remaining !== state.remaining || where.status !== state.status) return { count: 0 }
				state.remaining = data.remaining
				state.status = data.status
				return { count: 1 }
			},
		},
	}
}

describe('commitDebtPayment (optimistic concurrency)', () => {
	it('commits when the balance is still the one that was read', async () => {
		const state = { remaining: 100, status: 'pending' }
		await commitDebtPayment(fakeTx(state), { debtId: 'd1', expected: { remaining: 100, status: 'pending' }, ...computeDebtPayment(100, 60) })
		assert.equal(state.remaining, 40)
	})

	it('rejects the second of two concurrent payments that read the same balance (no lost update)', async () => {
		const state = { remaining: 100, status: 'pending' }
		const tx = fakeTx(state)
		const read = { remaining: 100, status: 'pending' }
		const results = await Promise.allSettled([
			commitDebtPayment(tx, { debtId: 'd1', expected: read, ...computeDebtPayment(100, 60) }),
			commitDebtPayment(tx, { debtId: 'd1', expected: read, ...computeDebtPayment(100, 60) }),
		])
		assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
		const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult
		assert.equal(rejected.reason.statusCode, 409)
		assert.equal(state.remaining, 40)
	})
})
