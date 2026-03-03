import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../../utils/prisma'
import { z } from 'zod'

const brandSchema = z.object({
	name: z.string().min(1, 'El nombre es obligatorio'),
	description: z.string().optional().nullable(),
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const parsedData = brandSchema.parse(body)

		// Check if brand name already exists
		const existingBrand = await prisma.brand.findFirst({
			where: { name: parsedData.name },
		})

		if (existingBrand) {
			throw createError({
				statusCode: 409,
				statusMessage: 'Ya existe una marca con este nombre',
			})
		}

		const brand = await prisma.brand.create({
			data: parsedData,
		})

		return { brand }
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos',
		})
	}
})
