import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'

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

		// Validate type (optional but recommended)
		const contentType = file.type || ''
		if (!contentType.startsWith('image/')) {
			throw createError({
				statusCode: 400,
				statusMessage: 'El archivo debe ser una imagen',
			})
		}

		// Determine target directory
		const targetFolder = 'public/multimedia/imagenes/clientes'
		const absoluteFolderPath = join(process.cwd(), targetFolder)
		
		// Ensure directory exists
		await mkdir(absoluteFolderPath, { recursive: true })

		// Generate random filename to avoid collisions
		const fileExtension = extname(file.filename || '.jpg')
		const newFilename = `${randomUUID()}${fileExtension}`
		const filePath = join(absoluteFolderPath, newFilename)

		// Save file
		await writeFile(filePath, file.data)

		// Return the public URL
		return {
			url: `/multimedia/imagenes/clientes/${newFilename}`,
			filename: newFilename,
		}
	} catch (error: any) {
		console.error('Error uploading file:', error)
		throw createError({
			statusCode: error.statusCode || 500,
			statusMessage: error.statusMessage || 'Error interno al subir el archivo',
		})
	}
})
