import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isPublicApiRoute, canRoleUseApi, canRoleAccessPath } from '../server/utils/api-access'
import { assertConsentMutable } from '../server/utils/consent-policy'

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

describe('canRoleAccessPath (health data is admin-only)', () => {
	const healthPaths = [
		'/api/clients/consents',
		'/api/clients/consents/abc',
		'/api/clients/questionnaires?user_id=x',
		'/api/clients/revokes/abc',
	]

	it('lets ADMIN read and change health records', () => {
		for (const path of healthPaths) assert.equal(canRoleAccessPath('ADMIN', path), true, path)
	})

	it('keeps STAFF out of health records', () => {
		for (const path of healthPaths) assert.equal(canRoleAccessPath('STAFF', path), false, path)
	})

	it('only matches whole path segments', () => {
		assert.equal(canRoleAccessPath('STAFF', '/api/clients/consentsx'), true)
		assert.equal(canRoleAccessPath('STAFF', '/api/services'), true)
	})
})

describe('assertConsentMutable', () => {
	const statusOf = (fn: () => void) => {
		try {
			fn()
			return 'ok'
		} catch (err) {
			return (err as { statusCode?: number }).statusCode
		}
	}

	it('blocks editing or deleting a signed consent (legal evidence)', () => {
		assert.equal(statusOf(() => assertConsentMutable('SIGNED')), 409)
	})

	it('allows changes to unsigned consents', () => {
		assert.equal(statusOf(() => assertConsentMutable('UNSIGNED')), 'ok')
	})
})
