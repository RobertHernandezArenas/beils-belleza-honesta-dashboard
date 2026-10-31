import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { createError } from 'h3'
import type { FileStorageService } from './ports'

export function createFsFileStorageService(): FileStorageService {
	return {
		async savePdf(dir: string, baseFilename: string, data: Buffer) {
			await mkdir(dir, { recursive: true })
			const filename = `${baseFilename}.pdf`
			await writeFile(join(dir, filename), data)
			return { filename, size: data.length }
		},
		async saveImage(dir: string, baseFilename: string, data: Buffer) {
			await mkdir(dir, { recursive: true })
			const filename = `${baseFilename}.webp`
			try {
				await sharp(data)
					.rotate()
					.resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
					.webp({ quality: 80 })
					.toFile(join(dir, filename))
			} catch {
				throw createError({ statusCode: 400, statusMessage: 'La imagen está dañada o no es válida' })
			}
			return { filename, size: data.length }
		},
	}
}

