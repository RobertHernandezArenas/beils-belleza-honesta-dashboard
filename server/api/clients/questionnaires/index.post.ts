import { prisma } from '../../../utils/prisma'
import { z } from 'zod'
import { createQuestionnaire } from '../../../modules/compliance/create-questionnaire'
import { createPrismaQuestionnairesRepository } from '../../../modules/compliance/prisma-compliance-repository'

const questionnaireSchema = z.object({
	user_id: z.string().min(1, 'El cliente es obligatorio'),
	title: z.string().min(2, 'El título es obligatorio'),
	data: z.record(z.string(), z.any()).default({}),
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const parsedData = questionnaireSchema.parse(body)

		return await createQuestionnaire(
			{ questionnaires: createPrismaQuestionnairesRepository(prisma) },
			parsedData,
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al crear cuestionario',
		})
	}
})
