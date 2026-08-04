import type { Prisma } from '@prisma/client'
import { prisma } from '../../../utils/prisma'
import { z } from 'zod'

const questionnaireSchema = z.object({
	user_id: z.string().min(1, 'El cliente es obligatorio'),
	title: z.string().min(2, 'El título es obligatorio'),
	data: z.record(z.string(), z.any()).default({}),
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const parsedData = questionnaireSchema.parse(body)

		const createData: Prisma.QuestionnaireUncheckedCreateInput = {
			user_id: parsedData.user_id,
			title: parsedData.title,
			data: JSON.stringify(parsedData.data),
		}

		const questionnaire = await prisma.questionnaire.create({
			data: createData,
			include: {
				user: {
					select: { user_id: true, name: true, surname: true, email: true },
				},
			},
		})

		return questionnaire
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al crear cuestionario',
		})
	}
})
