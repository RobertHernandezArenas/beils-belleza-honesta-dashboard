import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeApiError } from '../server/utils/api-errors'

const err = (statusCode: number, statusMessage: string, extra: Record<string, unknown> = {}) => ({
	statusCode,
	statusMessage,
	message: statusMessage,
	...extra,
})

describe('sanitizeApiError', () => {
	it('replaces internal details on 5xx errors with a generic message', () => {
		const e = err(500, 'Invalid `prisma.user.update()` invocation: Unknown column `users.foo`', { data: { meta: 'x' } })
		const sanitized = sanitizeApiError(e, '/api/users/1')
		assert.equal(sanitized, true)
		assert.equal(e.statusMessage, 'Error interno del servidor')
		assert.equal(e.message, 'Error interno del servidor')
		assert.equal('data' in e && e.data !== undefined, false)
	})

	it('keeps intentional 4xx messages (they are written for the user)', () => {
		const e = err(409, 'Ya existe un producto con ese SKU o código de barras')
		assert.equal(sanitizeApiError(e, '/api/catalog/products'), false)
		assert.equal(e.statusMessage, 'Ya existe un producto con ese SKU o código de barras')
	})

	it('hides 4xx messages that leak database internals', () => {
		const e = err(400, 'Invalid `prisma.cart.create()` invocation:\nArgument `total` is missing.')
		assert.equal(sanitizeApiError(e, '/api/sales/carts'), true)
		assert.equal(e.statusMessage, 'Solicitud inválida')
	})

	it('does not touch non-API routes (Nuxt renders its own error page)', () => {
		const e = err(500, 'Internal detail')
		assert.equal(sanitizeApiError(e, '/clientes/1'), false)
		assert.equal(e.statusMessage, 'Internal detail')
	})

	it('treats errors without a status code as 500', () => {
		const e: Record<string, unknown> = { message: 'ECONNREFUSED 127.0.0.1:3306' }
		assert.equal(sanitizeApiError(e, '/api/services'), true)
		assert.equal(e.message, 'Error interno del servidor')
	})
})
