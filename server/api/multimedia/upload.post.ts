import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'

export default defineEventHandler(async event => {
	try {
		const formData = await readMultipartFormData(event)
		if (!formData || formData.length === 0) {
			throw createError({
				statusCode: 400,
				statusMessage: 'No se han subido archivos',
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

		const type = formData.find(item => item.name === 'type')?.data.toString() || 'clientes'
		const category = formData.find(item => item.name === 'category')?.data.toString() || 'imagenes'
		const subdirectory = formData.find(item => item.name === 'subdirectory')?.data.toString() || ''

		// Validate type
		const contentType = file.type || ''
		if (!contentType.startsWith('image/')) {
			throw createError({
				statusCode: 400,
				statusMessage: 'El archivo debe ser una imagen',
			})
		}

		// Determine target directory and sanitize subdirectory
		const safeSubdirectory = subdirectory.replace(/[^a-zA-Z0-9-_]/g, '_')
		const uploadDir = join(process.cwd(), 'public', 'multimedia', category, type, safeSubdirectory)
		await mkdir(uploadDir, { recursive: true })

		const fileExtension = extname(file.filename || '.jpg')
		const baseFilename = `${randomUUID()}`
		const filename = `${baseFilename}${fileExtension}`
		
		if (category === 'imagenes' && contentType.startsWith('image/')) {
			// Optimize image with Sharp if it's an image
			const optimizedFilename = `${baseFilename}.webp`
			const optimizedPath = join(uploadDir, optimizedFilename)
			
			await sharp(file.data)
				.resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
				.webp({ quality: 80 })
				.toFile(optimizedPath)

			return {
				url: `/multimedia/${category}/${type}/${safeSubdirectory ? safeSubdirectory + '/' : ''}${optimizedFilename}`,
				filename: optimizedFilename,
				size: file.data.length,
			}
		} else {
			// Just save the file
			const filePath = join(uploadDir, filename)
			await writeFile(filePath, file.data)
			return {
				url: `/multimedia/${category}/${type}/${safeSubdirectory ? safeSubdirectory + '/' : ''}${filename}`,
				filename,
				size: file.data.length,
			}
		}
	} catch (error: any) {
		console.error('Error uploading file:', error)
		throw createError({
			statusCode: error.statusCode || 500,
			statusMessage: error.statusMessage || 'Error interno al subir el archivo',
		})
	}
})
