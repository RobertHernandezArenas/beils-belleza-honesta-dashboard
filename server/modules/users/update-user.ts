import { createError } from 'h3'
import { assertKeepsAnAdmin } from '../../utils/user-admin'
import { shouldRevokeSessions } from '../../utils/session-policy'
import type { UsersRepository } from './ports'

export interface UpdateUserDeps {
	users: UsersRepository
}

export async function updateUser(deps: UpdateUserDeps, { id, input }: { id: string; input: any }) {
	const current = await deps.users.findById(id)
	if (!current) throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado' })

	const activeAdmins = await deps.users.countActiveAdmins()
	assertKeepsAnAdmin({ current: { role: current.role, status: current.status }, update: input, activeAdmins })

	const revoke = shouldRevokeSessions(input)

	try {
		return await deps.users.update(id, input, revoke)
	} catch (rawError) {
		if ((rawError as { code?: string }).code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'El email ya está en uso' })
		}
		throw rawError
	}
}

