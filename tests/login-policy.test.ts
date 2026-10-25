import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { loginOutcome, unusablePasswordSeed } from '../server/utils/login-policy'

const user = (role: string, status = 'ON') => ({ role, status })

describe('loginOutcome', () => {
	it('lets active ADMIN and STAFF in with the right password', () => {
		assert.deepEqual(loginOutcome({ user: user('ADMIN'), passwordValid: true }), { ok: true })
		assert.deepEqual(loginOutcome({ user: user('STAFF'), passwordValid: true }), { ok: true })
	})

	it('never lets a CLIENT account in, even with the right password', () => {
		const res = loginOutcome({ user: user('CLIENT'), passwordValid: true })
		assert.equal(res.ok, false)
		assert.equal(!res.ok && res.statusCode, 401)
	})

	it('answers unknown email, wrong password and client account identically (no enumeration)', () => {
		const unknown = loginOutcome({ user: null, passwordValid: false })
		const wrongPassword = loginOutcome({ user: user('ADMIN'), passwordValid: false })
		const client = loginOutcome({ user: user('CLIENT'), passwordValid: true })
		assert.deepEqual(unknown, wrongPassword)
		assert.deepEqual(unknown, client)
	})

	it('only reveals an inactive account to someone who knows its password', () => {
		const wrong = loginOutcome({ user: user('STAFF', 'OFF'), passwordValid: false })
		assert.equal(!wrong.ok && wrong.statusCode, 401)
		const right = loginOutcome({ user: user('STAFF', 'OFF'), passwordValid: true })
		assert.equal(!right.ok && right.statusCode, 403)
	})
})

describe('unusablePasswordSeed', () => {
	it('is random and long (clients never get a shared default password)', () => {
		const a = unusablePasswordSeed()
		const b = unusablePasswordSeed()
		assert.notEqual(a, b)
		assert.ok(a.length >= 32)
		assert.notEqual(a, 'beils12345')
	})
})
