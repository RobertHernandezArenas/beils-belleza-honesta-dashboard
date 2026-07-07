import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const method = event.node.req.method
	if (method !== 'GET') {
		throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
	}

	const id = getRouterParam(event, 'id')
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'ID de cliente requerido' })
	}

	try {
		const bonuses = await prisma.clientBonus.findMany({
			where: { 
				client_id: id,
				status: 'activo',
				remaining_sessions: { gt: 0 }
			},
			include: {
				bonus: {
					include: {
						service: true
					}
				}
			},
			orderBy: { purchase_date: 'desc' }
		})

		return bonuses
	} catch (error) {
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al obtener los bonos del cliente',
		})
	}
})
