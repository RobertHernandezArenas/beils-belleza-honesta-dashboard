import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	try {
		const query = getQuery(event)
		const userId = query.user_id as string | undefined

		const whereClause: any = {}
		if (userId) {
			whereClause.user_id = userId
		}

		const questionnaires = await prisma.questionnaire.findMany({
			where: whereClause,
			orderBy: { created_at: 'desc' },
			include: {
				user: {
					select: { user_id: true, name: true, surname: true, email: true },
				},
			},
		})

		return questionnaires
	} catch (error) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al obtener cuestionarios',
		})
	}
})
