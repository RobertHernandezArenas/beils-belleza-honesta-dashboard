import { prisma } from '../../../utils/prisma'
import { assertConsentMutable } from '../../../utils/consent-policy'

export default defineEventHandler(async event => {
	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		const existing = await prisma.consent.findUnique({ where: { consent_id: id }, select: { status: true } })
		if (!existing) throw createError({ statusCode: 404, statusMessage: 'Consentimiento no encontrado' })
		assertConsentMutable(existing.status)

		await prisma.consent.delete({
			where: { consent_id: id },
		})

		return { success: true }
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
