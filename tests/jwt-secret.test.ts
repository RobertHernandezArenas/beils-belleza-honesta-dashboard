import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveJwtSecret } from '../server/utils/jwt-secret'

const STRONG = 'x'.repeat(32)

describe('resolveJwtSecret', () => {
	it('returns a strong secret as-is', () => {
		assert.equal(resolveJwtSecret({ JWT_SECRET: STRONG, NODE_ENV: 'production' }), STRONG)
	})

	it('refuses to start without a secret (no hardcoded fallback)', () => {
		assert.throws(() => resolveJwtSecret({ NODE_ENV: 'development' }), /JWT_SECRET/)
		assert.throws(() => resolveJwtSecret({ JWT_SECRET: '   ', NODE_ENV: 'production' }), /JWT_SECRET/)
	})

	it('refuses a short secret in production', () => {
		assert.throws(() => resolveJwtSecret({ JWT_SECRET: 'short-secret', NODE_ENV: 'production' }), /32/)
	})

	it('only warns about a short secret outside production', () => {
		const warnings: string[] = []
		const secret = resolveJwtSecret({ JWT_SECRET: 'short-secret', NODE_ENV: 'development' }, msg => warnings.push(msg))
		assert.equal(secret, 'short-secret')
		assert.equal(warnings.length, 1)
	})
})
