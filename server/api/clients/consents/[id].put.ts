import { prisma } from '../../../utils/prisma'
import { z } from 'zod'
import { updateConsent } from '../../../modules/compliance/update-consent'
import { createPrismaConsentsRepository } from '../../../modules/compliance/prisma-compliance-repository'

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

		return await updateConsent(
			{ consents: createPrismaConsentsRepository(prisma) },
			{ id, data: parsedData },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
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
