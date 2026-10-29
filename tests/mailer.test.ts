import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildSmtpTransportOptions, isMailConfigured } from '../server/utils/mailer'

describe('isMailConfigured', () => {
	it('requires both SMTP host and sender address', () => {
		assert.equal(isMailConfigured({ smtpHost: 'smtp.example.com', mailFrom: 'Salon <citas@example.com>' }), true)
		assert.equal(isMailConfigured({ smtpHost: 'smtp.example.com', mailFrom: '' }), false)
		assert.equal(isMailConfigured({ smtpHost: '  ', mailFrom: 'citas@example.com' }), false)
		assert.equal(isMailConfigured({}), false)
	})
})

describe('buildSmtpTransportOptions', () => {
	it('defaults to port 587 with STARTTLS and no auth', () => {
		const opts = buildSmtpTransportOptions({ smtpHost: 'smtp.example.com' })
		assert.equal(opts.host, 'smtp.example.com')
		assert.equal(opts.port, 587)
		assert.equal(opts.secure, false)
		assert.equal(opts.auth, undefined)
	})

	it('uses implicit TLS on port 465 unless SMTP_SECURE says otherwise', () => {
		assert.equal(buildSmtpTransportOptions({ smtpHost: 'h', smtpPort: '465' }).secure, true)
		assert.equal(buildSmtpTransportOptions({ smtpHost: 'h', smtpPort: '465', smtpSecure: 'false' }).secure, false)
		assert.equal(buildSmtpTransportOptions({ smtpHost: 'h', smtpPort: '2525', smtpSecure: 'true' }).secure, true)
	})

	it('falls back to the default port on an invalid value', () => {
		assert.equal(buildSmtpTransportOptions({ smtpHost: 'h', smtpPort: 'abc' }).port, 587)
	})

	it('adds credentials only when a user is set', () => {
		assert.deepEqual(buildSmtpTransportOptions({ smtpHost: 'h', smtpUser: 'u', smtpPass: 'p' }).auth, { user: 'u', pass: 'p' })
	})

	it('bounds every network phase with a timeout', () => {
		const opts = buildSmtpTransportOptions({ smtpHost: 'h' })
		for (const key of ['connectionTimeout', 'greetingTimeout', 'socketTimeout'] as const) {
			assert.ok(typeof opts[key] === 'number' && opts[key] > 0 && opts[key] <= 15_000, key)
		}
	})
})
