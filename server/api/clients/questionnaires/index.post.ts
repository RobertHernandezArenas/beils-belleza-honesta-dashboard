import { prisma } from '../../../utils/prisma'
import { z } from 'zod'

const questionnaireSchema = z.object({
	user_id: z.string().min(1, 'El cliente es obligatorio'),
	title: z.string().min(2, 'El título es obligatorio'),
	data: z.record(z.any()).default({}),
})

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const parsedData = questionnaireSchema.parse(body)

		const questionnaire = await prisma.questionnaire.create({
			data: parsedData,
			include: {
				user: {
					select: { user_id: true, name: true, surname: true, email: true },
				},
			},
		})

		return questionnaire
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 400,
			statusMessage: error.message || 'Datos inválidos o error al crear cuestionario',
		})
	}
})
