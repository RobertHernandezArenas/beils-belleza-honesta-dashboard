import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../../utils/prisma'
import { z } from 'zod'

const consentSchema = z.object({
	user_id: z.string().min(1, 'El cliente es obligatorio'),
	document_url: z.string().url('La URL del documento debe ser válida'),
	signed_date: z.string().optional(),
	status: z.enum(['active', 'expired', 'revoked']).default('active'),
	notes: z.string().optional(),
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const parsedData = consentSchema.parse(body)

		const consent = await prisma.consent.create({
			data: {
				...parsedData,
				signed_date: parsedData.signed_date ? new Date(parsedData.signed_date) : new Date(),
			},
			include: {
				user: {
					select: { user_id: true, name: true, surname: true, email: true },
				},
			},
		})

		return consent
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al crear consentimiento',
		})
	}
})
