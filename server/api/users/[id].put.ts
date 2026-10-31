import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { parseUserUpdate } from '../../utils/user-admin'
import { updateUser } from '../../modules/users/update-user'
import { createPrismaUsersRepository } from '../../modules/users/prisma-users-repository'

export default defineEventHandler(async event => {
	requireAdmin(event)
	const id = event.context.params?.id
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

	// Strict allow-list: role/status are admin-only (enforced above); user_id, tokens and timestamps never
	const input = parseUserUpdate(await readBody(event))

	try {
		return await updateUser(
			{ users: createPrismaUsersRepository(prisma) },
			{ id, input },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		if ((rawError as { code?: string }).code === 'P2002') {
			throw createError({ statusCode: 409, statusMessage: 'El email ya está en uso' })
		}
		console.error('Error updating user:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al actualizar usuario',
		})
	}
})
