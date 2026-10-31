import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { listUsers } from '../../modules/users/list-users'
import { createPrismaUsersRepository } from '../../modules/users/prisma-users-repository'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)

		const query = getQuery(event)
		const rawRoles = (query.roles as string) || (query.role as string) || ''
		const roles = rawRoles ? rawRoles.split(',').map(r => r.trim()).filter(Boolean) : []

		return await listUsers(
			{ users: createPrismaUsersRepository(prisma) },
			{ roles: roles.length > 0 ? roles : undefined },
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al obtener usuarios',
		})
	}
})
