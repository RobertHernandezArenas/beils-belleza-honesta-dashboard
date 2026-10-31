import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { uploadsRoot } from '../utils/upload-storage'
import { createFsFileStorageService } from '../modules/uploads/fs-file-storage-service'
import { uploadFile, MAX_FILE_SIZE } from '../modules/uploads/upload-file'

export default defineEventHandler(async event => {
	try {
		const formData = await readMultipartFormData(event)
		if (!formData || formData.length === 0) {
			throw createError({
				statusCode: 400,
				statusMessage: 'No se han subido archivos',
			})
		}

		// Security: Check overall payload size
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
		const type = field('type')
		const subdirectory = field('subdirectory')

		const storage = createFsFileStorageService()
		return await uploadFile(
			{ storage, uploadsRoot },
			{ fileData: file.data, category, type, subdirectory },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		console.error('Error uploading file:', error)
		throw createError({
			statusCode: error.statusCode || 500,
			statusMessage: error.statusMessage || 'Error interno al subir el archivo',
		})
	}
})
