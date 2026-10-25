import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isPublicApiRoute, canRoleUseApi } from '../server/utils/api-access'

describe('isPublicApiRoute (exact match, not prefix)', () => {
	it('allows the login endpoint, with or without query string / trailing slash', () => {
		assert.equal(isPublicApiRoute('/api/auth/login'), true)
		assert.equal(isPublicApiRoute('/api/auth/login?x=1'), true)
		assert.equal(isPublicApiRoute('/api/auth/login/'), true)
	})

	it('does not make routes public just because they share a prefix', () => {
		assert.equal(isPublicApiRoute('/api/auth/login-admin'), false)
		assert.equal(isPublicApiRoute('/api/auth/loginx/users'), false)
	})

	it('keeps sales and everything else protected', () => {
		assert.equal(isPublicApiRoute('/api/sales/carts'), false)
		assert.equal(isPublicApiRoute('/api/users'), false)
		assert.equal(isPublicApiRoute('/api/hello'), false)
	})
})

describe('canRoleUseApi', () => {
	it('lets staff roles use the API', () => {
		assert.equal(canRoleUseApi('ADMIN'), true)
		assert.equal(canRoleUseApi('STAFF'), true)
	})

	it('rejects client and unknown roles (tokens issued before client logins were blocked)', () => {
		assert.equal(canRoleUseApi('CLIENT'), false)
		assert.equal(canRoleUseApi(undefined), false)
		assert.equal(canRoleUseApi('admin'), false)
	})
})
