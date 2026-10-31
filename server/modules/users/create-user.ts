import { createError } from 'h3'
import type { UsersRepository } from './ports'

export interface CreateUserDeps {
	users: UsersRepository
}

export async function createUser(deps: CreateUserDeps, input: any) {
	const existingUser = await deps.users.findByEmail(input.email)
	if (existingUser) {
		throw createError({ statusCode: 400, statusMessage: 'El email ya está en uso' })
	}

	return await deps.users.create(input)
}

