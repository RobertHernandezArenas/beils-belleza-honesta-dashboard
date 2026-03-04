import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const id = event.context.params?.id
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
	}

	const body = await readBody(event)
	const { name, description } = body

	try {
		const updatedCategory = await prisma.category.update({
			where: { category_id: id },
			data: {
				name,
				description,
			},
		})
		return updatedCategory
	} catch (error: any) {
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada' })
		}
		if (error.code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'El nombre ya está en uso' })
		}
		throw createError({ statusCode: 500, statusMessage: 'Error interno del servidor' })
	}
})
