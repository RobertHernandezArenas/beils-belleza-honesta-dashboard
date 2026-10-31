import { createError } from 'h3'
import { toPublicUser } from '../../utils/public-user'
import type { ClientsRepository, UpdateClientInput } from './ports'

export interface UpdateClientDeps {
	clients: ClientsRepository
	now: () => Date
	randomInt: (max: number) => number
}

export async function updateClient(
	deps: UpdateClientDeps,
	input: { id: string; data: UpdateClientInput },
) {
	const { clients, now, randomInt } = deps
	const { id, data } = input

	let email = data.email
	if (email === '') {
		email = `sin-correo-${now().getTime()}-${randomInt(1000)}@cliente.local`
	}

	if (email) {
		const existingUser = await clients.findOtherByEmail(email, id)
		if (existingUser) {
			throw createError({
				statusCode: 409,
				statusMessage: 'El correo electrónico ya está en uso por otro cliente',
			})
		}
	}

	const updatePayload: Record<string, unknown> = { ...data }
	if (email !== undefined) {
		updatePayload.email = email
	}
	if (data.birth_date) {
		updatePayload.birth_date = new Date(data.birth_date)
	}

	const updated = await clients.update(id, updatePayload)
	if (!updated) {
		throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
	}

	return toPublicUser(updated)
}

