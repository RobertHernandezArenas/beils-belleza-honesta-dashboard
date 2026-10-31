import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/auth'
import { unlockUser } from '../../../modules/users/unlock-user'
import { createPrismaUsersRepository } from '../../../modules/users/prisma-users-repository'

/** Clears a login lockout (3 failed attempts) so the user can sign in again right away. */
export default defineEventHandler(async event => {
	requireAdmin(event)
	const id = getRouterParam(event, 'id')
	if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' })

	return await unlockUser(
		{ users: createPrismaUsersRepository(prisma) },
		{ id },
	)
})
