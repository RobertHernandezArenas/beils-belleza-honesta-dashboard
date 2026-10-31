/* eslint-disable @typescript-eslint/no-explicit-any -- test fakes */
process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-for-jwt'
import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import type { AuthRepository, AuthUserRecord } from '../server/modules/auth/ports'
import { MAX_FAILED_ATTEMPTS } from '../server/utils/login-lockout'

let authUsersStore: AuthUserRecord[]
let login: any
let getMe: any

const buildAuthRepo = (): AuthRepository => ({
	findByEmail: async email => authUsersStore.find(u => u.email === email) ?? null,
	findById: async id => authUsersStore.find(u => u.user_id === id) ?? null,
	incrementFailedAttempts: async id => {
		const u = authUsersStore.find(user => user.user_id === id)
		if (!u) return 0
		u.failed_login_count = (u.failed_login_count || 0) + 1
		return u.failed_login_count
	},
	lockAccount: async (id, until) => {
		const u = authUsersStore.find(user => user.user_id === id)
		if (u) u.locked_until = until
	},
	resetFailedAttempts: async id => {
		const u = authUsersStore.find(user => user.user_id === id)
		if (u) {
			u.failed_login_count = 0
			u.locked_until = null
		}
	},
})

describe('Auth Module - Hexagonal Architecture', () => {
	before(async () => {
		process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-for-jwt'
		const loginModule = await import('../server/modules/auth/login')
		const getMeModule = await import('../server/modules/auth/get-me')
		login = loginModule.login
		getMe = getMeModule.getMe
	})

	beforeEach(async () => {
		const hash = await bcrypt.hash('CorrectPassword123!', 10)
		authUsersStore = [
			{
				user_id: 'user-admin',
				email: 'admin@beils.com',
				password: hash,
				name: 'Ana',
				surname: 'Admin',
				role: 'ADMIN',
				status: 'ON',
				document_type: 'DNI',
				document_number: '12345678A',
				phone: '600000001',
				token_version: 1,
				failed_login_count: 0,
				locked_until: null,
				created_at: new Date('2026-01-01'),
			},
			{
				user_id: 'user-inactive',
				email: 'inactive@beils.com',
				password: hash,
				name: 'Inactivo',
				surname: null,
				role: 'STAFF',
				status: 'OFF',
				document_type: null,
				document_number: null,
				phone: null,
				token_version: 1,
				failed_login_count: 0,
				locked_until: null,
				created_at: new Date('2026-01-01'),
			},
		]
	})

	it('login succeeds with correct password and returns token and user', async () => {
		const repo = buildAuthRepo()
		const res = await login({ auth: repo }, { email: 'admin@beils.com', password: 'CorrectPassword123!' })
		assert.ok(res.token)
		assert.equal(res.user.email, 'admin@beils.com')
		assert.equal(res.user.role, 'ADMIN')
	})

	it('login increments failed attempts on bad password and locks on 3rd failure', async () => {
		const repo = buildAuthRepo()
		// Attempt 1
		await assert.rejects(
			async () => login({ auth: repo }, { email: 'admin@beils.com', password: 'WrongPassword' }),
			(err: any) => err.statusCode === 401,
		)
		assert.equal(authUsersStore[0].failed_login_count, 1)

		// Attempt 2
		await assert.rejects(
			async () => login({ auth: repo }, { email: 'admin@beils.com', password: 'WrongPassword' }),
			(err: any) => err.statusCode === 401,
		)
		assert.equal(authUsersStore[0].failed_login_count, 2)

		// Attempt 3: locks account with 423
		await assert.rejects(
			async () => login({ auth: repo }, { email: 'admin@beils.com', password: 'WrongPassword' }),
			(err: any) => err.statusCode === 423 && err.statusMessage.includes('bloqueada'),
		)
		assert.ok(authUsersStore[0].locked_until)
	})

	it('bounds concurrent wrong-password attempts to the lock threshold instead of racing past it', async () => {
		const repo = buildAuthRepo()

		// 20 concurrent wrong-password requests against the same account: without
		// serialization, all 20 could run bcrypt before the 3rd failure's lock lands.
		const results = await Promise.allSettled(
			Array.from({ length: 20 }, () => login({ auth: repo }, { email: 'admin@beils.com', password: 'WrongPassword' })),
		)

		assert.equal(authUsersStore[0].failed_login_count, MAX_FAILED_ATTEMPTS)
		assert.ok(authUsersStore[0].locked_until)

		// The 1st and 2nd failures get 401 (wrong password); the 3rd locks the account and
		// returns 423 directly, as does every attempt after it.
		const statusCodes = results.map(r => (r.status === 'rejected' ? (r.reason as { statusCode: number }).statusCode : 'ok'))
		assert.equal(statusCodes.filter(c => c === 401).length, MAX_FAILED_ATTEMPTS - 1)
		assert.equal(statusCodes.filter(c => c === 423).length, 20 - (MAX_FAILED_ATTEMPTS - 1))
	})

	it('login refuses locked account with 423 before checking password', async () => {
		const repo = buildAuthRepo()
		authUsersStore[0].locked_until = new Date(Date.now() + 600_000)

		await assert.rejects(
			async () => login({ auth: repo }, { email: 'admin@beils.com', password: 'CorrectPassword123!' }),
			(err: any) => err.statusCode === 423,
		)
	})

	it('getMe returns active user profile or throws 403 when inactive', async () => {
		const repo = buildAuthRepo()
		const res = await getMe({ auth: repo }, { userId: 'user-admin' })
		assert.equal(res.user.name, 'Ana')

		await assert.rejects(
			async () => getMe({ auth: repo }, { userId: 'user-inactive' }),
			(err: any) => err.statusCode === 403,
		)
	})
})
