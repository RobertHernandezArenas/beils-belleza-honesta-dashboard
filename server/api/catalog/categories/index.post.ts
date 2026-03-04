import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const body = await readBody(event)
	const { name, description } = body

	if (!name) {
		throw createError({
			statusCode: 400,
			statusMessage: 'El nombre de la categoría es obligatorio',
		})
	}

	try {
		const category = await prisma.category.create({
			data: {
				name,
				description,
			},
		})
		return category
	} catch (error: any) {
		if (error.code === 'P2002') {
			throw createError({
				statusCode: 409,
				statusMessage: 'Ya existe una categoría con este nombre',
			})
		}
		throw createError({ statusCode: 500, statusMessage: 'Error interno del servidor' })
	}
})
