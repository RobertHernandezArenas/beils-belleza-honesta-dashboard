import { prisma } from '../../../utils/prisma'
import { deleteQuestionnaire } from '../../../modules/compliance/delete-questionnaire'
import { createPrismaQuestionnairesRepository } from '../../../modules/compliance/prisma-compliance-repository'

export default defineEventHandler(async event => {
	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		return await deleteQuestionnaire(
			{ questionnaires: createPrismaQuestionnairesRepository(prisma) },
			{ id },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Cuestionario no encontrado' })
		}
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al eliminar cuestionario',
		})
	}
})
