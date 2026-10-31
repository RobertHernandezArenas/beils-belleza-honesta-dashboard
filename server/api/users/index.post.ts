import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { parseUserCreate } from '../../utils/user-admin'
import { createUser } from '../../modules/users/create-user'
import { createPrismaUsersRepository } from '../../modules/users/prisma-users-repository'

export default defineEventHandler(async event => {
	requireAdmin(event)
	// Strict schema: explicit password (min 8, no default) and no extra fields
	const parsedData = parseUserCreate(await readBody(event))

	try {
		return await createUser(
			{ users: createPrismaUsersRepository(prisma) },
			parsedData,
		)
	} catch (rawError) {
		const error = toApiError(rawError)
		if (error.statusCode) throw error
		console.error('Error creating user:', error)
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al crear usuario',
		})
	}
})
