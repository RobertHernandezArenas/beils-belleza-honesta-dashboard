import { createError } from 'h3'
import { toPublicUser } from '../../utils/public-user'
import { unusablePasswordSeed } from '../../utils/login-policy'
import type { ClientsRepository, NewClientInput } from './ports'

export interface CreateClientDeps {
	clients: ClientsRepository
	hashPassword: (password: string) => Promise<string>
	now: () => Date
	randomInt: (max: number) => number
}

export async function createClient(deps: CreateClientDeps, input: NewClientInput) {
	const { clients, hashPassword, now, randomInt } = deps

	const email =
		input.email && input.email.trim() !== ''
			? input.email.trim()
			: `sin-correo-${now().getTime()}-${randomInt(1000)}@cliente.local`

	const existingUser = await clients.findByEmail(email)
	if (existingUser) {
		throw createError({
			statusCode: 409,
			statusMessage: 'El correo electrónico ya está registrado',
		})
	}

	const hashedPassword = await hashPassword(unusablePasswordSeed())

	const user = await clients.create({
		name: input.name,
		surname: input.surname || '',
		email,
		phone: input.phone || '',
		address: input.address ?? '',
		city: input.city ?? '',
		country: input.country ?? '',
		postal_code: input.postal_code ?? '',
		gender: input.gender ?? '',
		birth_date: input.birth_date ? new Date(input.birth_date) : now(),
		document_type: input.document_type || 'DNI',
		document_number: input.document_number ?? '',
		status: input.status || 'ON',
		avatar: input.avatar ?? '',
		annotations: input.annotations ?? '',
		user_id: input.user_id || undefined,
		password: hashedPassword,
		role: 'CLIENT',
	})

	return toPublicUser(user)
}

