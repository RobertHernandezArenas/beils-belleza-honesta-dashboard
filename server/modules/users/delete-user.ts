import { createError } from 'h3'
import { assertCanDeleteUser } from '../../utils/user-admin'
import type { UsersRepository } from './ports'

export interface DeleteUserDeps {
	users: UsersRepository
}

export async function deleteUser(
	deps: DeleteUserDeps,
	{ actorId, id }: { actorId: string; id: string },
) {
	const target = await deps.users.findById(id)
	if (!target) throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado' })

	const activeAdmins = await deps.users.countActiveAdmins()
	assertCanDeleteUser({ actorId, target: { user_id: target.user_id, role: target.role }, activeAdmins })

	await deps.users.delete(id)
	return { success: true, message: 'Usuario eliminado' }
}

