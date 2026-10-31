import { createError } from 'h3'
import type { UsersRepository } from './ports'

export interface UnlockUserDeps {
	users: UsersRepository
}

export async function unlockUser(deps: UnlockUserDeps, { id }: { id: string }): Promise<{ success: true }> {
	const unlocked = await deps.users.unlock(id)
	if (!unlocked) throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado' })
	return { success: true }
}

