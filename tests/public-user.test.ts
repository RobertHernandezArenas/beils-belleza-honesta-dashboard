import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { toPublicUser } from '../server/utils/public-user'

describe('toPublicUser', () => {
	it('removes every internal auth field and keeps the profile', () => {
		const user = {
			user_id: 'u1',
			name: 'Ana',
			email: 'ana@x.com',
			password: '$2b$12$hash',
			refresh_token: 'rt',
			token_version: 3,
			failed_login_count: 2,
			locked_until: null,
		}
		const out = toPublicUser(user) as Record<string, unknown>
		for (const key of ['password', 'refresh_token', 'token_version', 'failed_login_count', 'locked_until']) {
			assert.equal(key in out, false, key)
		}
		assert.deepEqual(out, { user_id: 'u1', name: 'Ana', email: 'ana@x.com' })
	})
})
