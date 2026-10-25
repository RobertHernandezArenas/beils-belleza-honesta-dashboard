import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'
import { resolveStoredFile, rewriteUploadUrls, PRIVATE_FILES_PREFIX } from '../server/utils/upload-storage'

const statusOf = (fn: () => unknown) => {
	try {
		fn()
		return 'ok'
	} catch (err) {
		return (err as { statusCode?: number }).statusCode
	}
}

const root = join('/srv', 'storage', 'uploads')

describe('resolveStoredFile', () => {
	it('resolves an allowed file inside the storage root with its content type', () => {
		const file = resolveStoredFile(root, ['imagenes', 'clientes', 'ana-1234', 'abc.webp'])
		assert.ok(file.path.startsWith(resolve(root)))
		assert.equal(file.contentType, 'image/webp')
		assert.equal(resolveStoredFile(root, ['documentos', 'autorizaciones', 'x.pdf']).contentType, 'application/pdf')
	})

	it('serves legacy original-extension images from before re-encoding', () => {
		assert.equal(resolveStoredFile(root, ['usuarios', 'clientes', 'a.jpg']).contentType, 'image/jpeg')
		assert.equal(resolveStoredFile(root, ['usuarios', 'clientes', 'a.png']).contentType, 'image/png')
	})

	it('rejects traversal, unknown destinations and scriptable extensions', () => {
		assert.equal(statusOf(() => resolveStoredFile(root, ['..', '..', 'etc', 'passwd'])), 404)
		assert.equal(statusOf(() => resolveStoredFile(root, ['imagenes', 'clientes', '..', '..', 'secret.webp'])), 404)
		assert.equal(statusOf(() => resolveStoredFile(root, ['otra', 'cosa', 'a.webp'])), 404)
		assert.equal(statusOf(() => resolveStoredFile(root, ['imagenes', 'clientes', 'x.html'])), 404)
		assert.equal(statusOf(() => resolveStoredFile(root, ['imagenes', 'clientes', 'x.svg'])), 404)
	})
})

describe('rewriteUploadUrls', () => {
	it('rewrites public upload URLs to the authenticated files endpoint', () => {
		assert.equal(rewriteUploadUrls('/uploads/imagenes/clientes/a.webp'), `${PRIVATE_FILES_PREFIX}/imagenes/clientes/a.webp`)
	})

	it('rewrites URLs embedded in JSON (consent notes) and leaves other text alone', () => {
		const notes = JSON.stringify({ isMinor: true, authorizationFileUrl: '/uploads/documentos/autorizaciones/x.pdf' })
		assert.equal(JSON.parse(rewriteUploadUrls(notes)).authorizationFileUrl, `${PRIVATE_FILES_PREFIX}/documentos/autorizaciones/x.pdf`)
		assert.equal(rewriteUploadUrls('https://ui-avatars.com/api/?name=Ana'), 'https://ui-avatars.com/api/?name=Ana')
	})

	it('is idempotent', () => {
		const once = rewriteUploadUrls('/uploads/imagenes/clientes/a.webp')
		assert.equal(rewriteUploadUrls(once), once)
	})
})
