import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		await prisma.consent.delete({
			where: { consent_id: id },
		})

		return { success: true }
	} catch (error: any) {
		if (error.code === 'P2025') {
			throw createError({ statusCode: 404, statusMessage: 'Consentimiento no encontrado' })
		}
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al eliminar consentimiento',
		})
	}
})
