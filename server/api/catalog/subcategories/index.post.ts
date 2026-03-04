import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const body = await readBody(event)
	const { name, description, category_id } = body

	if (!name || !category_id) {
		throw createError({
			statusCode: 400,
			statusMessage: 'El nombre y la categoría principal son obligatorios',
		})
	}

	try {
		const subcategory = await prisma.subcategory.create({
			data: {
				name,
				description,
				category_id,
			},
			include: {
				category: {
					select: {
						name: true,
					},
				},
			},
		})
		return subcategory
	} catch (error: any) {
		if (error.code === 'P2002') {
			throw createError({
				statusCode: 409,
				statusMessage: 'Ya existe una subcategoría con este nombre en esta categoría',
			})
		}
		throw createError({ statusCode: 500, statusMessage: 'Error interno del servidor' })
	}
})
