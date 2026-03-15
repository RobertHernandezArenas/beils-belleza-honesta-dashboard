import { join } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import sharp from 'sharp'

export default defineEventHandler(async (event) => {
	const formData = await readMultipartFormData(event)
	if (!formData) {
		throw createError({
			statusCode: 400,
			statusMessage: 'No file uploaded',
		})
	}

	const file = formData.find((item) => item.name === 'file')
	const type = formData.find((item) => item.name === 'type')?.data.toString() // e.g., 'productos', 'servicios', 'usuarios/clientes'
	const category = formData.find((item) => item.name === 'category')?.data.toString() || 'archivos' // 'imagenes', 'videos', 'archivos'

	if (!file || !file.filename) {
		throw createError({
			statusCode: 400,
			statusMessage: 'File is required',
		})
	}

	const uploadDir = join(process.cwd(), 'public', 'multimedia', category, type || '')
	await mkdir(uploadDir, { recursive: true })

	const filename = `${Date.now()}-${file.filename.replace(/\s+/g, '-')}`
	const filePath = join(uploadDir, filename)

	if (category === 'imagenes' && file.type?.startsWith('image/')) {
		// Optimize image with Sharp
		const optimizedFilename = filename.replace(/\.(png|jpg|jpeg)$/i, '.webp')
		const optimizedPath = join(uploadDir, optimizedFilename)
		
		await sharp(file.data)
			.resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 80 })
			.toFile(optimizedPath)

		return {
			url: `/multimedia/${category}/${type ? type + '/' : ''}${optimizedFilename}`,
			filename: optimizedFilename,
			size: file.data.length,
		}
	} else {
		// Just save the file
		await writeFile(filePath, file.data)
		return {
			url: `/multimedia/${category}/${type ? type + '/' : ''}${filename}`,
			filename,
			size: file.data.length,
		}
	}
})
