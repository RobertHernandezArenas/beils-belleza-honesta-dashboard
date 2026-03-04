import { defineEventHandler, createError } from 'h3'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const id = event.context.params?.id
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
	}

	try {
		await prisma.tag.delete({
			where: { tag_id: id },
		})
		return { success: true }
	} catch (error: any) {
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Etiqueta no encontrada' })
		}
		throw createError({ statusCode: 500, statusMessage: 'Error interno del servidor' })
	}
})
