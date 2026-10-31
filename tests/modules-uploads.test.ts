/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { uploadFile } from '../server/modules/uploads/upload-file'
import type { FileStorageService } from '../server/modules/uploads/ports'

describe('uploadFile', () => {
	it('throws 400 when file data is empty', async () => {
		const fakeStorage: FileStorageService = {
			savePdf: async () => ({ filename: 'test.pdf', size: 0 }),
			saveImage: async () => ({ filename: 'test.webp', size: 0 }),
		}

		await assert.rejects(
			() => uploadFile({ storage: fakeStorage, uploadsRoot: () => 'C:/uploads' }, { fileData: Buffer.alloc(0) }),
			(err: any) => err.statusCode === 400,
		)
	})

	it('throws 413 when file data exceeds 5MB', async () => {
		const fakeStorage: FileStorageService = {
			savePdf: async () => ({ filename: 'test.pdf', size: 0 }),
			saveImage: async () => ({ filename: 'test.webp', size: 0 }),
		}

		await assert.rejects(
			() => uploadFile({ storage: fakeStorage, uploadsRoot: () => 'C:/uploads' }, { fileData: Buffer.alloc(6 * 1024 * 1024) }),
			(err: any) => err.statusCode === 413,
		)
	})

	it('saves pdf file through storage service', async () => {
		const fakeStorage: FileStorageService = {
			savePdf: async (_dir, base, data) => ({ filename: `${base}.pdf`, size: data.length }),
			saveImage: async () => ({ filename: 'test.webp', size: 0 }),
		}

		// PDF header magic bytes %PDF-
		const pdfBuffer = Buffer.from('%PDF-1.4 test content')

		const res = await uploadFile(
			{ storage: fakeStorage, uploadsRoot: () => 'C:/uploads', generateId: () => 'uuid-123' },
			{ fileData: pdfBuffer, category: 'documentos', type: 'autorizaciones' },
		)

		assert.equal(res.filename, 'uuid-123.pdf')
		assert.match(res.url, /uuid-123\.pdf$/)
	})
})
