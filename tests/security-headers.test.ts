import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { securityHeaders } from '../server/utils/security-headers'

describe('securityHeaders', () => {
	const headers = securityHeaders()

	it('blocks MIME sniffing and framing (clickjacking)', () => {
		assert.equal(headers['X-Content-Type-Options'], 'nosniff')
		assert.equal(headers['X-Frame-Options'], 'DENY')
		assert.match(headers['Content-Security-Policy-Report-Only']!, /frame-ancestors 'none'/)
	})

	it('enforces HTTPS and limits referrer and powerful features', () => {
		assert.match(headers['Strict-Transport-Security']!, /max-age=31536000/)
		assert.equal(headers['Referrer-Policy'], 'same-origin')
		assert.match(headers['Permissions-Policy']!, /geolocation=\(\)/)
	})

	it('ships the CSP in report-only mode until it is verified in the browser', () => {
		assert.equal('Content-Security-Policy' in headers, false)
		const csp = headers['Content-Security-Policy-Report-Only']!
		assert.match(csp, /default-src 'self'/)
		assert.match(csp, /object-src 'none'/)
		assert.match(csp, /img-src [^;]*https:\/\/ui-avatars\.com/)
	})

	it('can enforce the CSP once verified', () => {
		const enforced = securityHeaders({ enforceCsp: true })
		assert.ok(enforced['Content-Security-Policy'])
		assert.equal('Content-Security-Policy-Report-Only' in enforced, false)
	})
})
