import { createError } from 'h3'
import { join, resolve, sep } from 'node:path'

/**
 * Upload rules. Destinations are an allow-list (no client-controlled paths), and the file
 * type comes from its magic bytes, never from the browser-declared MIME or the filename.
 */

export type FileKind = 'jpeg' | 'png' | 'webp' | 'pdf'

/** category -> allowed types. Mirrors the app's uploaders (avatars and authorization docs). */
const DESTINATIONS: Record<string, readonly string[]> = {
	imagenes: ['clientes'],
	usuarios: ['clientes'],
	documentos: ['autorizaciones'],
}

export const isAllowedDestination = (category: string, type: string) => !!DESTINATIONS[category]?.includes(type)

const startsWith = (buf: Buffer, signature: number[], offset = 0) =>
	buf.length >= offset + signature.length && signature.every((b, i) => buf[offset + i] === b)

const ascii = (text: string) => [...text].map(c => c.charCodeAt(0))

export function detectFileKind(buf: Buffer): FileKind | null {
	if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'jpeg'
	if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
	if (startsWith(buf, ascii('RIFF')) && startsWith(buf, ascii('WEBP'), 8)) return 'webp'
	if (startsWith(buf, ascii('%PDF-'))) return 'pdf'
	return null
}

const badRequest = (statusMessage: string) => createError({ statusCode: 400, statusMessage })

export function resolveUploadTarget(
	uploadsRoot: string,
	fields: { category?: string; type?: string; subdirectory?: string },
) {
	const category = fields.category || 'imagenes'
	const type = fields.type || 'clientes'
	if (!isAllowedDestination(category, type)) {
		throw badRequest('Destino de subida no permitido')
	}

	const subdirectory = (fields.subdirectory || '').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 100)
	const segments = [category, type, ...(subdirectory ? [subdirectory] : [])]

	// Defence in depth: the final directory must stay inside the uploads root
	const root = resolve(uploadsRoot)
	const dir = resolve(join(root, ...segments))
	if (!dir.startsWith(root + sep)) throw badRequest('Destino de subida no permitido')

	// Served by the authenticated files endpoint (see upload-storage), never from public/
	return { dir, urlPath: `/api/files/${segments.join('/')}` }
}

export function assertKindAllowed(kind: FileKind | null, category: string | undefined): asserts kind is FileKind {
	if (!kind) {
		throw badRequest('El archivo debe ser una imagen (JPG, PNG, WebP) o un documento PDF')
	}
	if (kind === 'pdf' && (category || 'imagenes') !== 'documentos') {
		throw badRequest('Solo se admiten PDF en documentos')
	}
}
