import { prisma } from '../../../utils/prisma'
import { toApiError } from '../../../utils/errors'
import { z } from 'zod'

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

		const signedDate = parsedData.signed_date ? new Date(parsedData.signed_date) : new Date()

		if (parsedData.consent_type) {
			const consent = await prisma.consent.upsert({
				where: {
					unique_user_consent: {
						user_id: parsedData.user_id,
						consent_type: parsedData.consent_type
					}
				},
				create: {
					user_id: parsedData.user_id,
					consent_type: parsedData.consent_type,
					status: parsedData.status,
					signed_date: signedDate,
					signature_data: parsedData.signature_data || null,
					document_url: parsedData.document_url || null,
					notes: parsedData.notes || null,
				},
				update: {
					status: parsedData.status,
					signed_date: signedDate,
					signature_data: parsedData.signature_data !== undefined ? parsedData.signature_data : undefined,
					document_url: parsedData.document_url || null,
					notes: parsedData.notes || null,
				},
				include: {
					user: {
						select: { user_id: true, name: true, surname: true, email: true },
					},
				},
			})
			return consent
		}

		const consent = await prisma.consent.create({
			data: {
				user_id: parsedData.user_id,
				consent_type: null,
				status: parsedData.status,
				signed_date: signedDate,
				signature_data: parsedData.signature_data || null,
				document_url: parsedData.document_url || null,
				notes: parsedData.notes || null,
			},
			include: {
				user: {
					select: { user_id: true, name: true, surname: true, email: true },
				},
			},
		})

		return consent
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al crear consentimiento',
		})
	}
})
