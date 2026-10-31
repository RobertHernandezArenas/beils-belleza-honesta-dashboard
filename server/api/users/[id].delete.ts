import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { deleteUser } from '../../modules/users/delete-user'
import { createPrismaUsersRepository } from '../../modules/users/prisma-users-repository'

export default defineEventHandler(async event => {
	const actor = requireAdmin(event)
	const id = event.context.params?.id
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

	try {
		return await deleteUser(
			{ users: createPrismaUsersRepository(prisma) },
			{ actorId: actor.userId, id },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		console.error('Error deleting user:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al eliminar usuario',
		})
	}
})
