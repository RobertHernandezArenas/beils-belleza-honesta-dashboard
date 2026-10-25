import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isAeatConfigured, toAeatStatus } from '../server/utils/aeat-status'

describe('AEAT submission status', () => {
	it('is only configured with both certificate path and password', () => {
		assert.equal(isAeatConfigured({ aeatP12CertPath: '', aeatP12Password: '' }), false)
		assert.equal(isAeatConfigured({ aeatP12CertPath: '/cert.p12', aeatP12Password: '' }), false)
		assert.equal(isAeatConfigured({ aeatP12CertPath: '/cert.p12', aeatP12Password: 'x' }), true)
	})

	it('never reports an invoice as submitted when nothing was sent', () => {
		assert.equal(toAeatStatus('not_configured'), 'not_configured')
		assert.notEqual(toAeatStatus('not_configured'), 'submitted')
	})

	it('maps accepted and rejected submissions', () => {
		assert.equal(toAeatStatus('submitted'), 'submitted')
		assert.equal(toAeatStatus('rejected'), 'error')
	})
})
