import { prisma } from '../../../utils/prisma'
import { deleteConsent } from '../../../modules/compliance/delete-consent'
import { createPrismaConsentsRepository } from '../../../modules/compliance/prisma-compliance-repository'

export default defineEventHandler(async event => {
	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		return await deleteConsent(
			{ consents: createPrismaConsentsRepository(prisma) },
			{ id },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Consentimiento no encontrado' })
		}
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al eliminar consentimiento',
		})
	}
})
