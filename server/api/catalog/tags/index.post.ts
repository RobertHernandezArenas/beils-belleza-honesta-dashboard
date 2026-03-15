import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const body = await readBody(event)
	const { name, color } = body

	if (!name) {
		throw createError({
			statusCode: 400,
			statusMessage: 'El nombre de la etiqueta es obligatorio',
		})
	}

	try {
		const tag = await prisma.tag.create({
			data: {
				name,
				color,
			},
		})
		return tag
	} catch (error: any) {
		if (error.code === 'P2002') {
			throw createError({
				statusCode: 409,
				statusMessage: 'Ya existe una etiqueta con este nombre',
			})
		}
		throw createError({ statusCode: 500, statusMessage: 'Error interno del servidor' })
	}
})
