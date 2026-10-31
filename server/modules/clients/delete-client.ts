import { createError } from 'h3'
import type { ClientsRepository } from './ports'

export interface DeleteClientDeps {
	clients: ClientsRepository
}

export async function deleteClient(deps: DeleteClientDeps, input: { id: string }) {
	const { clients } = deps
	const { id } = input

	const existing = await clients.findById(id)
	if (!existing || existing.role !== 'CLIENT') {
		throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
	}

	await clients.transaction(async uow => {
		await uow.deleteClientCascade(id)
	})

	return { success: true }
}

