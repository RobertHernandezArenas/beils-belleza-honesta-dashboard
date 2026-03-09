import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { prisma } from '../../../utils/prisma'
import { z } from 'zod'

const questionnaireUpdateSchema = z.object({
	title: z.string().min(2, 'El título es obligatorio').optional(),
	data: z.record(z.any()).optional(),
})

export default defineEventHandler(async event => {
	try {
		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		const body = await readBody(event)
		const parsedData = questionnaireUpdateSchema.parse(body)

		const questionnaire = await prisma.questionnaire.update({
			where: { questionnaire_id: id },
			data: parsedData,
			include: {
				user: {
					select: { user_id: true, name: true, surname: true, email: true },
				},
			},
		})

		return questionnaire
	} catch (error: any) {
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
