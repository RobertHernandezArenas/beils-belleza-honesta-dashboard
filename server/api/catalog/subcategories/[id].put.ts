import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const id = event.context.params?.id
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
	}

	const body = await readBody(event)
	const { name, description, category_id } = body

	try {
		const updatedSubcategory = await prisma.subcategory.update({
			where: { subcategory_id: id },
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
		return updatedSubcategory
	} catch (error: any) {
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Subcategoría no encontrada' })
		}
		if (error.code === 'P2002') {
			throw createError({
				statusCode: 409,
				statusMessage: 'El nombre ya está registrado en esta categoría',
			})
		}
		throw createError({ statusCode: 500, statusMessage: 'Error interno del servidor' })
	}
})
