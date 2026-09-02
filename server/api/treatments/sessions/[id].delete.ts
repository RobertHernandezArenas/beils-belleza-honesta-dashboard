import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { toApiError } from '../../../utils/errors'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const sessionId = getRouterParam(event, 'id')
		if (!sessionId) {
			throw createError({ statusCode: 400, statusMessage: 'ID de sesión requerido' })
		}

		await prisma.treatmentSession.delete({
			where: { session_id: sessionId }
		})

		return { success: true, message: 'Sesión eliminada correctamente' }
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: error.message || 'Error al eliminar sesión de tratamiento'
		})
	}
})
