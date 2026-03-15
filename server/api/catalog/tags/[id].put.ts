import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const id = event.context.params?.id
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
	}

	const body = await readBody(event)
	const { name } = body

	try {
		const updatedTag = await prisma.tag.update({
			where: { tag_id: id },
			data: {
				name,
			},
		})
		return updatedTag
	} catch (error: any) {
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Etiqueta no encontrada' })
		}
		if (error.code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'El nombre ya está en uso' })
		}
		throw createError({ statusCode: 500, statusMessage: 'Error interno del servidor' })
	}
})
