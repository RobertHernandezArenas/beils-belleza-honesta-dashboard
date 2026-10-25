import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'
import { detectFileKind, resolveUploadTarget, assertKindAllowed } from '../server/utils/upload-policy'

const statusOf = (fn: () => unknown) => {
	try {
		fn()
		return 'ok'
	} catch (err) {
		return (err as { statusCode?: number }).statusCode
	}
}

const bytes = (...values: number[]) => Buffer.from(values)
const ascii = (text: string) => Buffer.from(text, 'latin1')

describe('detectFileKind (magic bytes, not the declared MIME)', () => {
	it('recognises the allowed formats', () => {
		assert.equal(detectFileKind(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0)), 'jpeg')
		assert.equal(detectFileKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'png')
		assert.equal(detectFileKind(ascii('RIFF\x00\x00\x00\x00WEBPVP8 ')), 'webp')
		assert.equal(detectFileKind(ascii('%PDF-1.7\n')), 'pdf')
	})

	it('rejects scriptable or unknown content even if renamed', () => {
		assert.equal(detectFileKind(ascii('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null)
		assert.equal(detectFileKind(ascii('<!DOCTYPE html><script>steal()</script>')), null)
		assert.equal(detectFileKind(ascii('RIFF\x00\x00\x00\x00AVI LIST')), null)
		assert.equal(detectFileKind(bytes()), null)
	})
})

describe('resolveUploadTarget (allow-listed destinations only)', () => {
	const root = join('/srv', 'public', 'uploads')

	it('accepts the destinations the app uses', () => {
		assert.equal(statusOf(() => resolveUploadTarget(root, { category: 'imagenes', type: 'clientes' })), 'ok')
		assert.equal(statusOf(() => resolveUploadTarget(root, { category: 'usuarios', type: 'clientes' })), 'ok')
		assert.equal(statusOf(() => resolveUploadTarget(root, { category: 'documentos', type: 'autorizaciones' })), 'ok')
	})

	it('defaults to the avatar destination like before', () => {
		const target = resolveUploadTarget(root, {})
		assert.equal(target.urlPath, '/uploads/imagenes/clientes')
	})

	it('rejects path traversal and unknown destinations', () => {
		assert.equal(statusOf(() => resolveUploadTarget(root, { category: '../../.output/public', type: 'clientes' })), 400)
		assert.equal(statusOf(() => resolveUploadTarget(root, { category: 'imagenes', type: '../../../etc' })), 400)
		assert.equal(statusOf(() => resolveUploadTarget(root, { category: 'documentos', type: 'clientes' })), 400)
	})

	it('sanitises the subdirectory and keeps it inside the uploads root', () => {
		const target = resolveUploadTarget(root, { category: 'imagenes', type: 'clientes', subdirectory: '../../ana-ruiz' })
		assert.ok(target.dir.startsWith(resolve(root)))
		assert.ok(!target.urlPath.includes('..'))
		assert.equal(target.urlPath, '/uploads/imagenes/clientes/______ana-ruiz')
	})
})

describe('assertKindAllowed', () => {
	it('allows images everywhere and PDFs only for documents', () => {
		assert.equal(statusOf(() => assertKindAllowed('webp', 'imagenes')), 'ok')
		assert.equal(statusOf(() => assertKindAllowed('pdf', 'documentos')), 'ok')
		assert.equal(statusOf(() => assertKindAllowed('pdf', 'imagenes')), 400)
	})

	it('rejects undetected content', () => {
		assert.equal(statusOf(() => assertKindAllowed(null, 'documentos')), 400)
	})
})
