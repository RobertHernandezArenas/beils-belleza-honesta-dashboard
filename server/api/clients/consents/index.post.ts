import { prisma } from '../../../utils/prisma'
import { toApiError } from '../../../utils/errors'
import { z } from 'zod'
import { createConsent } from '../../../modules/compliance/create-consent'
import { createPrismaConsentsRepository } from '../../../modules/compliance/prisma-compliance-repository'

const consentSchema = z.object({
	user_id: z.string().min(1, 'El cliente es obligatorio'),
	consent_type: z.enum(['LGPD', 'INDIBA', 'LASER_INNOVA_PRO_SHR']).optional().nullable(),
	document_url: z.string().optional().nullable(),
	signed_date: z.string().optional(),
	status: z.string().default('UNSIGNED'),
	signature_data: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const parsedData = consentSchema.parse(body)

		return await createConsent(
			{ consents: createPrismaConsentsRepository(prisma) },
			parsedData,
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al crear consentimiento',
		})
	}
})
