import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { buildPasswordResetData, resolveResetPassword } from '../seeds/admin-password'

describe('resolveResetPassword', () => {
	it('uses NEW_ADMIN_PASSWORD when it meets the policy', () => {
		assert.deepEqual(resolveResetPassword({ NEW_ADMIN_PASSWORD: '  una-clave-larga  ' }), {
			password: 'una-clave-larga',
			generated: false,
		})
	})

	it('generates a random password when none is given', () => {
		const a = resolveResetPassword({})
		const b = resolveResetPassword({ NEW_ADMIN_PASSWORD: '   ' })
		assert.equal(a.generated, true)
		assert.equal(b.generated, true)
		assert.ok(a.password.length >= 16)
		assert.notEqual(a.password, b.password)
	})

	it('rejects a given password that is too short or too long instead of replacing it', () => {
		assert.throws(() => resolveResetPassword({ NEW_ADMIN_PASSWORD: 'short' }), /al menos 8/)
		assert.throws(() => resolveResetPassword({ NEW_ADMIN_PASSWORD: 'x'.repeat(129) }), /128/)
	})
})

describe('buildPasswordResetData', () => {
	it('stores a bcrypt hash, never the plain password, and revokes sessions and lockout', async () => {
		const plain = 'x'.repeat(12)
		const data = await buildPasswordResetData(plain)
		assert.notEqual(data.password, plain)
		assert.ok(data.password.startsWith('$2'))
		assert.ok(await bcrypt.compare(plain, data.password))
		assert.deepEqual(data.token_version, { increment: 1 })
		assert.equal(data.refresh_token, null)
		assert.equal(data.failed_login_count, 0)
		assert.equal(data.locked_until, null)
	})
})
