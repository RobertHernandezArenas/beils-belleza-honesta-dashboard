import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { detectFileKind, resolveUploadTarget, assertKindAllowed } from '../utils/upload-policy'
import { uploadsRoot } from '../utils/upload-storage'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default defineEventHandler(async event => {
	try {
		const formData = await readMultipartFormData(event)
		if (!formData || formData.length === 0) {
			throw createError({
				statusCode: 400,
				statusMessage: 'No se han subido archivos',
			})
		}

		// Security: Check overall payload size (Risk 1.4 & 6.1)
		const totalSize = formData.reduce((acc, item) => acc + (item.data?.length || 0), 0)
		if (totalSize > MAX_FILE_SIZE) {
			throw createError({
				statusCode: 413,
				statusMessage: 'El archivo excede el límite de 5MB',
			})
		}

		// Look for the "file" field
		const file = formData.find(item => item.name === 'file')
		if (!file || !file.data) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Campo "file" no encontrado',
			})
		}

		const field = (name: string) => formData.find(item => item.name === name)?.data.toString()
		const category = field('category')

		// Destination is allow-listed (no client-controlled paths); type comes from the bytes
		// Private storage outside public/: files are served only to staff by /api/files
		const target = resolveUploadTarget(uploadsRoot(), { category, type: field('type'), subdirectory: field('subdirectory') })
		const kind = detectFileKind(file.data)
		assertKindAllowed(kind, category)

		await mkdir(target.dir, { recursive: true })
		const baseFilename = randomUUID()

		if (kind === 'pdf') {
			const filename = `${baseFilename}.pdf`
			await writeFile(join(target.dir, filename), file.data)
			return { url: `${target.urlPath}/${filename}`, filename, size: file.data.length }
		}

		// Images are always re-encoded: drops any embedded payload and EXIF metadata (e.g. GPS)
		const filename = `${baseFilename}.webp`
		try {
			await sharp(file.data)
				.rotate() // apply EXIF orientation before metadata is stripped
				.resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
				.webp({ quality: 80 })
				.toFile(join(target.dir, filename))
		} catch {
			throw createError({ statusCode: 400, statusMessage: 'La imagen está dañada o no es válida' })
		}

		return { url: `${target.urlPath}/${filename}`, filename, size: file.data.length }
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error uploading file:', error)
		throw createError({
			statusCode: error.statusCode || 500,
			statusMessage: error.statusMessage || 'Error interno al subir el archivo',
		})
	}
})
