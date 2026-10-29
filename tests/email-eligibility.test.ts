import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getEmailIneligibility, isPlaceholderEmail, isWalkInClient } from '../shared/utils/email-eligibility'

const client = { name: 'Lucía', surname: 'Pérez', email: 'lucia@example.com' }

describe('isPlaceholderEmail', () => {
	it('detects the placeholder generated for clients created without email', () => {
		assert.equal(isPlaceholderEmail('sin-correo-1730000000000-42@cliente.local'), true)
		assert.equal(isPlaceholderEmail('  SIN-CORREO-1@Cliente.Local '), true)
	})

	it('accepts real addresses', () => {
		assert.equal(isPlaceholderEmail('lucia@example.com'), false)
		assert.equal(isPlaceholderEmail('cliente.local@example.com'), false)
	})
})

describe('isWalkInClient', () => {
	it('recognises the "no registrado / mostrador" walk-in client', () => {
		assert.equal(isWalkInClient({ name: 'Cliente No Registrado', surname: '' }), true)
		assert.equal(isWalkInClient({ name: 'Venta', surname: 'Mostrador' }), true)
	})

	it('does not flag regular clients', () => {
		assert.equal(isWalkInClient(client), false)
	})
})

describe('getEmailIneligibility', () => {
	it('is eligible for a registered client with a real email when mail is configured', () => {
		assert.equal(getEmailIneligibility({ mailConfigured: true, client }), null)
	})

	it('blocks when mail is not configured, before anything else', () => {
		assert.equal(getEmailIneligibility({ mailConfigured: false, client }), 'mail_not_configured')
		assert.equal(getEmailIneligibility({ mailConfigured: false, client: null }), 'mail_not_configured')
	})

	it('blocks the walk-in client and a missing client (the walk-in fallback is used)', () => {
		assert.equal(getEmailIneligibility({ mailConfigured: true, client: { name: 'No registrado', surname: '', email: 'x@example.com' } }), 'walk_in')
		assert.equal(getEmailIneligibility({ mailConfigured: true, client: null }), 'walk_in')
		assert.equal(getEmailIneligibility({ mailConfigured: true }), 'walk_in')
	})

	it('blocks missing, malformed or placeholder emails', () => {
		for (const email of [undefined, null, '', '   ', 'not-an-email', 'a@b', 'sin-correo-1@cliente.local']) {
			assert.equal(getEmailIneligibility({ mailConfigured: true, client: { ...client, email } }), 'no_email', String(email))
		}
	})
})
