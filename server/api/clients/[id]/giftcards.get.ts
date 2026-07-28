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

		// TODO: Implement giftcards when added to Prisma schema
		return []
	}
})
