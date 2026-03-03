import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { prisma } from '../../../utils/prisma'
import { z } from 'zod'

const brandSchema = z.object({
	name: z.string().min(1, 'El nombre es obligatorio'),
	description: z.string().optional().nullable(),
})

export default defineEventHandler(async event => {
	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		const body = await readBody(event)
		const parsedData = brandSchema.parse(body)

		// Check if brand name already exists on another record
		const existingBrand = await prisma.brand.findFirst({
			where: {
				name: parsedData.name,
				brand_id: { not: id },
			},
		})

		if (existingBrand) {
			throw createError({
				statusCode: 409,
				statusMessage: 'Ya existe otra marca con este nombre',
			})
		}

		const brand = await prisma.brand.update({
			where: { brand_id: id },
			data: parsedData,
		})

		return { brand }
	} catch (error: any) {
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Marca no encontrada' })
		}
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos',
		})
	}
})
