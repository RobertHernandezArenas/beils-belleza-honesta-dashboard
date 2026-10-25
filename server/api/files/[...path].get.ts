import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolveStoredFile, uploadsRoot } from '../../utils/upload-storage'

/**
 * Serves private uploads (client photos, signed authorizations). Lives under /api, so the
 * auth middleware already requires a staff session; the path is confined to the storage root.
 */
export default defineEventHandler(async event => {
	const segments = (getRouterParam(event, 'path') || '').split('/').filter(Boolean)
	const file = resolveStoredFile(uploadsRoot(), segments)

	const info = await stat(file.path).catch(() => null)
	if (!info?.isFile()) throw createError({ statusCode: 404, statusMessage: 'Archivo no encontrado' })

	setResponseHeaders(event, {
		'Content-Type': file.contentType,
		'Content-Length': String(info.size),
		'X-Content-Type-Options': 'nosniff',
		// Personal data: cache only in the user's own browser
		'Cache-Control': 'private, max-age=3600',
		'Content-Disposition': 'inline',
	})
	return sendStream(event, createReadStream(file.path))
})
