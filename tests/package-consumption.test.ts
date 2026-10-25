import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	canAccessPackage,
	checkConsume,
	validateShareTargets,
	toClientPackageView,
	type ConsumablePackage,
} from '../server/utils/package-sharing'
import {
	assertPackageAccess,
	consumeClientPackage,
	consumeClientPackageItem,
	type ConsumptionTx,
} from '../server/utils/package-consumption'

const NOW = new Date('2026-10-25T10:00:00Z')

const pkg = (overrides: Partial<ConsumablePackage> = {}): ConsumablePackage => ({
	user_id: 'owner',
	status: 'ACTIVE',
	expiry_date: null,
	remaining_sessions: 5,
	shared_with: [],
	...overrides,
})

describe('checkConsume', () => {
	it('allows the owner to consume an active package with balance', () => {
		assert.deepEqual(checkConsume(pkg(), 'owner', { now: NOW }), { ok: true })
	})

	it('allows a beneficiary the package was shared with', () => {
		assert.deepEqual(checkConsume(pkg({ shared_with: ['daughter'] }), 'daughter', { now: NOW }), { ok: true })
	})

	it('rejects a consumption without a client (anonymous sale)', () => {
		const res = checkConsume(pkg(), null, { now: NOW })
		assert.equal(res.ok, false)
		assert.equal(!res.ok && res.reason, 'NO_CONSUMER')
		assert.equal(!res.ok && res.statusCode, 400)
	})

	it('rejects someone who is neither owner nor beneficiary', () => {
		const res = checkConsume(pkg({ shared_with: ['daughter'] }), 'stranger', { now: NOW })
		assert.equal(!res.ok && res.reason, 'NOT_ALLOWED')
		assert.equal(!res.ok && res.statusCode, 403)
	})

	it('rejects an inactive package', () => {
		const res = checkConsume(pkg({ status: 'CANCELLED' }), 'owner', { now: NOW })
		assert.equal(!res.ok && res.reason, 'INACTIVE')
		assert.equal(!res.ok && res.statusCode, 409)
	})

	it('rejects an expired package', () => {
		const res = checkConsume(pkg({ expiry_date: '2026-10-24T23:59:59Z' }), 'owner', { now: NOW })
		assert.equal(!res.ok && res.reason, 'EXPIRED')
	})

	it('accepts a package that expires later', () => {
		assert.deepEqual(checkConsume(pkg({ expiry_date: '2026-12-01' }), 'owner', { now: NOW }), { ok: true })
	})

	it('rejects when the balance is lower than the quantity', () => {
		const res = checkConsume(pkg({ remaining_sessions: 1 }), 'owner', { now: NOW, qty: 2 })
		assert.equal(!res.ok && res.reason, 'INSUFFICIENT')
		assert.equal(!res.ok && res.statusCode, 409)
	})

	it('rejects an exhausted package', () => {
		const res = checkConsume(pkg({ remaining_sessions: 0 }), 'owner', { now: NOW })
		assert.equal(!res.ok && res.reason, 'INSUFFICIENT')
	})
})

describe('canAccessPackage', () => {
	it('grants the owner and beneficiaries, regardless of balance or status', () => {
		const p = pkg({ shared_with: ['daughter'], remaining_sessions: 0, status: 'FINISHED' })
		assert.equal(canAccessPackage(p, 'owner'), true)
		assert.equal(canAccessPackage(p, 'daughter'), true)
	})

	it('denies anyone else and a missing user', () => {
		assert.equal(canAccessPackage(pkg(), 'stranger'), false)
		assert.equal(canAccessPackage(pkg(), null), false)
	})
})

describe('assertPackageAccess', () => {
	it('403s when linking a session to someone else\'s bono', async () => {
		const state = { pkg: { ...basePkg, remaining_sessions: 3 } }
		await assert.rejects(assertPackageAccess(fakeTx(state), 'cp1', 'stranger'), (err: { statusCode: number }) => err.statusCode === 403)
	})

	it('passes for a beneficiary', async () => {
		const state = { pkg: { ...basePkg, remaining_sessions: 3 }, shares: ['daughter'] }
		await assertPackageAccess(fakeTx(state), 'cp1', 'daughter')
	})
})

describe('validateShareTargets', () => {
	it('trims, drops empties and duplicates', () => {
		assert.deepEqual(validateShareTargets('owner', [' a ', 'a', '', 'b']), ['a', 'b'])
	})

	it('never includes the owner', () => {
		assert.deepEqual(validateShareTargets('owner', ['owner', 'a']), ['a'])
	})
})

describe('toClientPackageView', () => {
	const record = {
		client_package_id: 'cp1',
		package_id: 'p1',
		user_id: 'owner',
		total_sessions: 10,
		remaining_sessions: 4,
		expiry_date: null,
		custom_price: null,
		status: 'ACTIVE',
		package: { name: 'Bono Indiba', description: null, type: 'INDIVIDUAL', price: 500, service_id: null },
		items: [],
		user: { user_id: 'owner', name: 'Olga', surname: 'Fernandez' },
		shares: [{ user_id: 'daughter', user: { user_id: 'daughter', name: 'Ana', surname: 'Fernandez' } }],
	}

	it('marks own packages as not shared and lists beneficiaries', () => {
		const view = toClientPackageView(record, 'owner')
		assert.equal(view.is_shared, false)
		assert.deepEqual(view.shared_with.map(s => s.user_id), ['daughter'])
		assert.equal(view.price, 500)
	})

	it('marks packages seen by a beneficiary as shared, with the owner', () => {
		const view = toClientPackageView(record, 'daughter')
		assert.equal(view.is_shared, true)
		assert.deepEqual(view.owner, { user_id: 'owner', name: 'Olga', surname: 'Fernandez' })
	})
})

/** In-memory transaction double: enough Prisma surface to exercise the atomic decrement. */
function fakeTx(state: {
	pkg: { client_package_id: string; remaining_sessions: number } & Omit<ConsumablePackage, 'remaining_sessions' | 'shared_with'>
	shares?: string[]
	item?: { client_package_item_id: string; client_package_id: string; quantity_remaining: number }
}): ConsumptionTx {
	const pkgRow = () => ({ ...state.pkg, shares: (state.shares ?? []).map(user_id => ({ user_id })) })
	return {
		clientPackage: {
			findUnique: async ({ where }) => (where.client_package_id === state.pkg.client_package_id ? pkgRow() : null),
			updateMany: async ({ where, data }) => {
				if (where.client_package_id !== state.pkg.client_package_id) return { count: 0 }
				if (state.pkg.remaining_sessions < where.remaining_sessions.gte) return { count: 0 }
				state.pkg.remaining_sessions -= data.remaining_sessions.decrement
				return { count: 1 }
			},
		},
		clientPackageItem: {
			findUnique: async ({ where }) =>
				state.item && where.client_package_item_id === state.item.client_package_item_id ? { ...state.item } : null,
			updateMany: async ({ where, data }) => {
				if (!state.item || where.client_package_item_id !== state.item.client_package_item_id) return { count: 0 }
				if (state.item.quantity_remaining < where.quantity_remaining.gte) return { count: 0 }
				state.item.quantity_remaining -= data.quantity_remaining.decrement
				return { count: 1 }
			},
		},
	}
}

const basePkg = { client_package_id: 'cp1', user_id: 'owner', status: 'ACTIVE', expiry_date: null }

describe('consumeClientPackage (atomic)', () => {
	it('decrements the balance for the owner', async () => {
		const state = { pkg: { ...basePkg, remaining_sessions: 2 } }
		await consumeClientPackage(fakeTx(state), { clientPackageId: 'cp1', consumerId: 'owner', qty: 1, now: NOW })
		assert.equal(state.pkg.remaining_sessions, 1)
	})

	it('only one of two consumptions succeeds when one session is left', async () => {
		const state = { pkg: { ...basePkg, remaining_sessions: 1 } }
		const tx = fakeTx(state)
		const results = await Promise.allSettled([
			consumeClientPackage(tx, { clientPackageId: 'cp1', consumerId: 'owner', qty: 1, now: NOW }),
			consumeClientPackage(tx, { clientPackageId: 'cp1', consumerId: 'owner', qty: 1, now: NOW }),
		])
		assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
		const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult
		assert.equal(rejected.reason.statusCode, 409)
		assert.equal(state.pkg.remaining_sessions, 0)
	})

	it('rejects another client consuming the package (403) without touching the balance', async () => {
		const state = { pkg: { ...basePkg, remaining_sessions: 3 } }
		await assert.rejects(
			consumeClientPackage(fakeTx(state), { clientPackageId: 'cp1', consumerId: 'stranger', qty: 1, now: NOW }),
			(err: { statusCode: number }) => err.statusCode === 403,
		)
		assert.equal(state.pkg.remaining_sessions, 3)
	})

	it('lets a beneficiary consume a shared package', async () => {
		const state = { pkg: { ...basePkg, remaining_sessions: 3 }, shares: ['daughter'] }
		await consumeClientPackage(fakeTx(state), { clientPackageId: 'cp1', consumerId: 'daughter', qty: 1, now: NOW })
		assert.equal(state.pkg.remaining_sessions, 2)
	})

	it('404s for an unknown package', async () => {
		const state = { pkg: { ...basePkg, remaining_sessions: 3 } }
		await assert.rejects(
			consumeClientPackage(fakeTx(state), { clientPackageId: 'nope', consumerId: 'owner', qty: 1, now: NOW }),
			(err: { statusCode: number }) => err.statusCode === 404,
		)
	})
})

describe('consumeClientPackageItem (atomic)', () => {
	it('decrements both the item and its package', async () => {
		const state = {
			pkg: { ...basePkg, remaining_sessions: 5 },
			item: { client_package_item_id: 'it1', client_package_id: 'cp1', quantity_remaining: 2 },
		}
		await consumeClientPackageItem(fakeTx(state), { clientPackageItemId: 'it1', consumerId: 'owner', qty: 1, now: NOW })
		assert.equal(state.item.quantity_remaining, 1)
		assert.equal(state.pkg.remaining_sessions, 4)
	})

	it('409s when the item has no balance left, even if the package does', async () => {
		const state = {
			pkg: { ...basePkg, remaining_sessions: 5 },
			item: { client_package_item_id: 'it1', client_package_id: 'cp1', quantity_remaining: 0 },
		}
		await assert.rejects(
			consumeClientPackageItem(fakeTx(state), { clientPackageItemId: 'it1', consumerId: 'owner', qty: 1, now: NOW }),
			(err: { statusCode: number }) => err.statusCode === 409,
		)
		assert.equal(state.pkg.remaining_sessions, 5)
	})

	it('rejects a stranger (403)', async () => {
		const state = {
			pkg: { ...basePkg, remaining_sessions: 5 },
			item: { client_package_item_id: 'it1', client_package_id: 'cp1', quantity_remaining: 2 },
		}
		await assert.rejects(
			consumeClientPackageItem(fakeTx(state), { clientPackageItemId: 'it1', consumerId: 'stranger', qty: 1, now: NOW }),
			(err: { statusCode: number }) => err.statusCode === 403,
		)
	})
})
