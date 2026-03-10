import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { prisma } from '../../../utils/prisma'
import { z } from 'zod'

const consentUpdateSchema = z.object({
	document_url: z.string().url('La URL del documento debe ser válida').optional(),
	signed_date: z.string().optional(),
	status: z.enum(['UNSIGNED', 'SIGNED']).optional(),
	notes: z.string().optional().nullable(),
})

export default defineEventHandler(async event => {
	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		const body = await readBody(event)
		const parsedData = consentUpdateSchema.parse(body)

		const updateData: any = { ...parsedData }
		if (parsedData.signed_date) {
			updateData.signed_date = new Date(parsedData.signed_date)
		}

		const consent = await prisma.consent.update({
			where: { consent_id: id },
			data: updateData,
			include: {
				user: {
					select: { user_id: true, name: true, surname: true, email: true },
				},
			},
		})

		return consent
	} catch (error: any) {
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Consentimiento no encontrado' })
		}
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al actualizar consentimiento',
		})
	}
})
