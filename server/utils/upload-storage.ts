import { createError } from 'h3'
import { join, resolve, sep, extname } from 'node:path'
import { isAllowedDestination } from './upload-policy'

/**
 * Private upload storage. Files live OUTSIDE public/ (consent PDFs and client photos must not
 * be reachable without a session) and are served by GET /api/files/..., which the auth
 * middleware restricts to staff.
 */

export const PRIVATE_FILES_PREFIX = '/api/files'
export const LEGACY_PUBLIC_PREFIX = '/uploads'

/** Storage root; UPLOADS_DIR lets production keep uploads on a persistent volume. */
export const uploadsRoot = () => resolve(process.env.UPLOADS_DIR || join(process.cwd(), 'storage', 'uploads'))

// Current uploads are .webp/.pdf; jpg/png cover files stored before images were re-encoded
const CONTENT_TYPES: Record<string, string> = {
	'.webp': 'image/webp',
	'.pdf': 'application/pdf',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
}

const SAFE_SEGMENT = /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/

const notFound = () => createError({ statusCode: 404, statusMessage: 'Archivo no encontrado' })

/** Maps URL segments (category/type/[subdirectory]/file) to a file inside the storage root. */
export function resolveStoredFile(root: string, segments: string[]) {
	if (segments.length < 3 || segments.length > 4) throw notFound()
	if (!segments.every(s => SAFE_SEGMENT.test(s) && !s.includes('..'))) throw notFound()

	const [category, type] = segments as [string, string]
	if (!isAllowedDestination(category, type)) throw notFound()

	const fileName = segments[segments.length - 1]!
	const contentType = CONTENT_TYPES[extname(fileName).toLowerCase()]
	if (!contentType) throw notFound()

	const base = resolve(root)
	const path = resolve(join(base, ...segments))
	if (!path.startsWith(base + sep)) throw notFound()

	return { path, contentType }
}

/** Rewrites public /uploads/ URLs (plain or inside JSON text) to the authenticated endpoint. Idempotent. */
export function rewriteUploadUrls(text: string) {
	return text.replace(/(^|["'\s(])\/uploads\//g, `$1${PRIVATE_FILES_PREFIX}/`)
}
