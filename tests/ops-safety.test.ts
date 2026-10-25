import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parsePagination } from '../server/utils/pagination'
import { isDestructiveAllowed, resolveSeedPassword } from '../seeds/seed-safety'

describe('parsePagination', () => {
	it('defaults and parses page/limit', () => {
		assert.deepEqual(parsePagination({}), { page: 1, limit: 10, skip: 0 })
		assert.deepEqual(parsePagination({ page: '3', limit: '20' }), { page: 3, limit: 20, skip: 40 })
	})

	it('caps the limit (the app asks for up to 1000) and rejects nonsense', () => {
		assert.equal(parsePagination({ limit: '1000' }).limit, 1000)
		assert.equal(parsePagination({ limit: '999999' }).limit, 1000)
		assert.equal(parsePagination({ limit: '-5' }).limit, 10)
		assert.equal(parsePagination({ page: '0' }).page, 1)
		assert.equal(parsePagination({ page: 'abc', limit: 'x' }).limit, 10)
	})
})

describe('isDestructiveAllowed (db reset / seed scripts)', () => {
	it('allows a local development database', () => {
		assert.equal(isDestructiveAllowed({ NODE_ENV: 'development', DATABASE_HOST: 'localhost' }), true)
		assert.equal(isDestructiveAllowed({ DATABASE_HOST: '127.0.0.1' }), true)
	})

	it('refuses production and remote databases unless explicitly confirmed', () => {
		assert.equal(isDestructiveAllowed({ NODE_ENV: 'production', DATABASE_HOST: 'localhost' }), false)
		assert.equal(isDestructiveAllowed({ DATABASE_HOST: 'db.beilsbellezahonesta.com' }), false)
		assert.equal(isDestructiveAllowed({ DATABASE_HOST: 'db.remote', ALLOW_DESTRUCTIVE_DB: 'yes' }), true)
		assert.equal(isDestructiveAllowed({ NODE_ENV: 'production', DATABASE_HOST: 'localhost', ALLOW_DESTRUCTIVE_DB: 'yes' }), false)
	})
})

describe('resolveSeedPassword', () => {
	it('uses SEED_ADMIN_PASSWORD when it is long enough', () => {
		assert.deepEqual(resolveSeedPassword({ SEED_ADMIN_PASSWORD: 'una-clave-larga' }), { password: 'una-clave-larga', generated: false })
	})

	it('generates a random one otherwise (never a shared default)', () => {
		const a = resolveSeedPassword({})
		const b = resolveSeedPassword({ SEED_ADMIN_PASSWORD: 'short' })
		assert.equal(a.generated, true)
		assert.notEqual(a.password, b.password)
		assert.ok(a.password.length >= 16)
		assert.notEqual(a.password, 'password123')
	})
})
