import { randomUUID } from 'node:crypto'
import { createError } from 'h3'
import { detectFileKind, resolveUploadTarget, assertKindAllowed } from '../../utils/upload-policy'
import type { FileStorageService, UploadFileInput, UploadFileResult } from './ports'

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export interface UploadFileDeps {
	storage: FileStorageService
	uploadsRoot: () => string
	generateId?: () => string
}

export async function uploadFile(deps: UploadFileDeps, input: UploadFileInput): Promise<UploadFileResult> {
	if (!input.fileData || input.fileData.length === 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'No se han subido archivos',
		})
	}

	if (input.fileData.length > MAX_FILE_SIZE) {
		throw createError({
			statusCode: 413,
			statusMessage: 'El archivo excede el límite de 5MB',
		})
	}

	const target = resolveUploadTarget(deps.uploadsRoot(), {
		category: input.category,
		type: input.type,
		subdirectory: input.subdirectory,
	})

	const kind = detectFileKind(input.fileData)
	assertKindAllowed(kind, input.category)

	const baseFilename = deps.generateId ? deps.generateId() : randomUUID()

	let saved: { filename: string; size: number }
	if (kind === 'pdf') {
		saved = await deps.storage.savePdf(target.dir, baseFilename, input.fileData)
	} else {
		saved = await deps.storage.saveImage(target.dir, baseFilename, input.fileData)
	}

	return {
		url: `${target.urlPath}/${saved.filename}`,
		filename: saved.filename,
		size: saved.size,
	}
}

