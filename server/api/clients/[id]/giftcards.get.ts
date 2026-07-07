import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const id = getRouterParam(event, 'id')

		if (!id) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Client ID is required',
			})
		}

		// Buscar tarjetas regalo activas asociadas al cliente y con saldo positivo
		const giftcards = await prisma.giftcard.findMany({
			where: {
				client_id: id,
				current_balance: {
					gt: 0,
				},
				status: 'active',
			},
			orderBy: {
				created_at: 'desc',
			},
		})

		return giftcards
	}
})
