import { createError } from 'h3'
import type { ClientsRepository } from './ports'

export interface GetClientGiftcardsDeps {
	clients: ClientsRepository
}

export async function getClientGiftcards(
	_deps: GetClientGiftcardsDeps,
	clientId: string,
): Promise<unknown[]> {
	if (!clientId) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Client ID is required',
		})
	}

	// Currently giftcards are not part of the schema yet, stubbed to return empty list
	return []
}

