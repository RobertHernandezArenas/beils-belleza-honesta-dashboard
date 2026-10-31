import { createPrismaClientsRepository } from '../../../modules/clients/prisma-clients-repository'
import { getClientGiftcards } from '../../../modules/clients/get-client-giftcards'

export default defineEventHandler(async event => {
	const id = getRouterParam(event, 'id')
	if (!id) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Client ID is required',
		})
	}
	const repo = createPrismaClientsRepository(prisma)
	return await getClientGiftcards({ clients: repo }, id)
})
