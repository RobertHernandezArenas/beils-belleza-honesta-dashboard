import { maskDocument } from '../../utils/privacy'
import type { ClientsRepository, ListClientsQuery } from './ports'

export interface ListClientsDeps {
	clients: ClientsRepository
}

export async function listClients(deps: ListClientsDeps, input: ListClientsQuery) {
	const { clients } = deps
	const { data, total } = await clients.list(input)

	return {
		data: data.map(client => ({
			...client,
			document_number: maskDocument(client.document_number),
		})),
		pagination: {
			total,
			page: input.page,
			limit: input.limit,
			totalPages: Math.ceil(total / input.limit) || 1,
		},
	}
}

