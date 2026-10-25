import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	parseUserCreate,
	parseUserUpdate,
	assertCanDeleteUser,
	assertKeepsAnAdmin,
} from '../server/utils/user-admin'

const statusOf = (fn: () => unknown) => {
	try {
		fn()
		return 'ok'
	} catch (err) {
		return (err as { statusCode?: number }).statusCode
	}
}

describe('parseUserUpdate (mass-assignment guard)', () => {
	it('accepts the fields the user form sends', () => {
		const data = parseUserUpdate({ name: 'Ana', surname: 'Ruiz', email: 'ana@x.com', role: 'STAFF', phone: '600' })
		assert.equal(data.role, 'STAFF')
		assert.equal(data.name, 'Ana')
	})

	it('accepts a status-only toggle', () => {
		assert.deepEqual(parseUserUpdate({ status: 'OFF' }), { status: 'OFF' })
	})

	it('rejects fields that must never be written from the API', () => {
		assert.equal(statusOf(() => parseUserUpdate({ user_id: 'other' })), 400)
		assert.equal(statusOf(() => parseUserUpdate({ refresh_token: 'x' })), 400)
		assert.equal(statusOf(() => parseUserUpdate({ created_at: '2020-01-01' })), 400)
	})

	it('rejects an unknown role', () => {
		assert.equal(statusOf(() => parseUserUpdate({ role: 'ROOT' })), 400)
	})

	it('ignores an empty password (unchanged) and rejects a short one', () => {
		assert.equal('password' in parseUserUpdate({ name: 'Ana', password: '' }), false)
		assert.equal(statusOf(() => parseUserUpdate({ password: 'short' })), 400)
	})

	it('drops a masked document number so the real one is not overwritten', () => {
		assert.equal('document_number' in parseUserUpdate({ document_number: '****678Z' }), false)
		assert.equal(parseUserUpdate({ document_number: '12345678Z' }).document_number, '12345678Z')
	})
})

describe('parseUserCreate', () => {
	const base = { email: 'new@x.com', name: 'Nuevo', role: 'STAFF' }

	it('requires an explicit password of at least 8 characters (no default)', () => {
		assert.equal(statusOf(() => parseUserCreate(base)), 400)
		assert.equal(statusOf(() => parseUserCreate({ ...base, password: '123456' })), 400)
		assert.equal(parseUserCreate({ ...base, password: 'longenough1' }).password, 'longenough1')
	})

	it('rejects unknown fields', () => {
		assert.equal(statusOf(() => parseUserCreate({ ...base, password: 'longenough1', user_id: 'x' })), 400)
	})
})

describe('assertCanDeleteUser', () => {
	it('forbids deleting yourself', () => {
		assert.equal(statusOf(() => assertCanDeleteUser({ actorId: 'a', target: { user_id: 'a', role: 'ADMIN' }, activeAdmins: 3 })), 409)
	})

	it('forbids deleting the last admin', () => {
		assert.equal(statusOf(() => assertCanDeleteUser({ actorId: 'a', target: { user_id: 'b', role: 'ADMIN' }, activeAdmins: 1 })), 409)
	})

	it('allows deleting another admin when more remain, or a non-admin', () => {
		assert.equal(statusOf(() => assertCanDeleteUser({ actorId: 'a', target: { user_id: 'b', role: 'ADMIN' }, activeAdmins: 2 })), 'ok')
		assert.equal(statusOf(() => assertCanDeleteUser({ actorId: 'a', target: { user_id: 'c', role: 'STAFF' }, activeAdmins: 1 })), 'ok')
	})
})

describe('assertKeepsAnAdmin', () => {
	const lastAdmin = { role: 'ADMIN', status: 'ON' }

	it('forbids demoting or deactivating the last active admin', () => {
		assert.equal(statusOf(() => assertKeepsAnAdmin({ current: lastAdmin, update: { role: 'STAFF' }, activeAdmins: 1 })), 409)
		assert.equal(statusOf(() => assertKeepsAnAdmin({ current: lastAdmin, update: { status: 'OFF' }, activeAdmins: 1 })), 409)
	})

	it('allows it when another active admin remains, or when nothing admin-related changes', () => {
		assert.equal(statusOf(() => assertKeepsAnAdmin({ current: lastAdmin, update: { role: 'STAFF' }, activeAdmins: 2 })), 'ok')
		assert.equal(statusOf(() => assertKeepsAnAdmin({ current: lastAdmin, update: { name: 'X' }, activeAdmins: 1 })), 'ok')
	})
})
