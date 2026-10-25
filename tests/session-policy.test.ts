import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sessionCookieOptions, checkSession, createSessionCache, shouldRevokeSessions } from '../server/utils/session-policy'

describe('sessionCookieOptions', () => {
	it('is httpOnly and strict, secure in production', () => {
		const prod = sessionCookieOptions('production')
		assert.equal(prod.httpOnly, true)
		assert.equal(prod.sameSite, 'strict')
		assert.equal(prod.secure, true)
		assert.equal(prod.path, '/')
		assert.equal(sessionCookieOptions('development').secure, false)
	})
})

describe('checkSession', () => {
	const user = { status: 'ON', role: 'STAFF', token_version: 2 }

	it('accepts a token whose version matches an active staff user, using the DB role', () => {
		assert.deepEqual(checkSession({ tv: 2, role: 'ADMIN' }, user), { ok: true, role: 'STAFF' })
	})

	it('treats tokens issued before versioning as version 0', () => {
		assert.deepEqual(checkSession({}, { ...user, token_version: 0 }), { ok: true, role: 'STAFF' })
		assert.equal(checkSession({}, user).ok, false)
	})

	it('rejects revoked tokens, deleted, inactive or demoted-to-client users', () => {
		assert.equal(checkSession({ tv: 1 }, user).ok, false)
		assert.equal(checkSession({ tv: 2 }, null).ok, false)
		assert.equal(checkSession({ tv: 2 }, { ...user, status: 'OFF' }).ok, false)
		assert.equal(checkSession({ tv: 2 }, { ...user, role: 'CLIENT' }).ok, false)
	})
})

describe('shouldRevokeSessions', () => {
	it('revokes on role, status or password changes', () => {
		assert.equal(shouldRevokeSessions({ role: 'STAFF' }), true)
		assert.equal(shouldRevokeSessions({ status: 'OFF' }), true)
		assert.equal(shouldRevokeSessions({ password: 'nueva-clave' }), true)
		assert.equal(shouldRevokeSessions({ name: 'Ana', phone: '600' }), false)
	})
})

describe('createSessionCache', () => {
	it('caches for the TTL and can be invalidated', () => {
		const cache = createSessionCache<string>(1000)
		cache.set('u1', 'value', 0)
		assert.equal(cache.get('u1', 500), 'value')
		assert.equal(cache.get('u1', 1500), undefined)
		cache.set('u1', 'value', 0)
		cache.invalidate('u1')
		assert.equal(cache.get('u1', 10), undefined)
	})
})
