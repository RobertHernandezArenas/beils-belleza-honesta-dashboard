import { prisma } from '../../../utils/prisma'
import { z } from 'zod'
import { updateQuestionnaire } from '../../../modules/compliance/update-questionnaire'
import { createPrismaQuestionnairesRepository } from '../../../modules/compliance/prisma-compliance-repository'

const questionnaireUpdateSchema = z.object({
	title: z.string().min(2, 'El título es obligatorio').optional(),
	data: z.record(z.string(), z.any()).optional(),
})

export default defineEventHandler(async event => {
	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		const body = await readBody(event)
		const parsedData = questionnaireUpdateSchema.parse(body)

		return await updateQuestionnaire(
			{ questionnaires: createPrismaQuestionnairesRepository(prisma) },
			{ id, data: parsedData },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Cuestionario no encontrado' })
		}
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al actualizar cuestionario',
		})
	}
})
