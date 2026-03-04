import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const id = event.context.params?.id
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
	}

	const body = await readBody(event)
	const { name, description, subcategories } = body

	try {
		// First get existing subcategories to know what to create
		const existingCategory = await prisma.category.findUnique({
			where: { category_id: id },
			include: { subcategories: true },
		})

		const existingSubNames = existingCategory?.subcategories.map(s => s.name) || []

		const incomingSubNames = Array.isArray(subcategories) ? subcategories : []
		const newSubNames = incomingSubNames.filter((sub: string) => !existingSubNames.includes(sub))
		const subsToDelete = existingSubNames.filter((sub: string) => !incomingSubNames.includes(sub))

		const subcategoriesUpdate: any = {}
		if (newSubNames.length > 0) {
			subcategoriesUpdate.create = newSubNames.map((n: string) => ({ name: n }))
		}
		if (subsToDelete.length > 0) {
			subcategoriesUpdate.deleteMany = {
				name: { in: subsToDelete },
			}
		}

		const dataToUpdate: any = {
			name,
			description,
		}

		if (Object.keys(subcategoriesUpdate).length > 0) {
			dataToUpdate.subcategories = subcategoriesUpdate
		}

		const updatedCategory = await prisma.category.update({
			where: { category_id: id },
			data: dataToUpdate,
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
