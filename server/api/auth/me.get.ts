import { prisma } from '../../utils/prisma'
import { getMe } from '../../modules/auth/get-me'
import { createPrismaAuthRepository } from '../../modules/auth/prisma-auth-repository'

export default defineEventHandler(async event => {
	// The user info is already validated and decoded by server/middleware/auth.ts
	const decoded = event.context.user

	if (!decoded || !decoded.userId) {
		throw createError({
			statusCode: 401,
			statusMessage: 'Unauthorized access',
		})
	}

	return await getMe(
		{ auth: createPrismaAuthRepository(prisma) },
		{ userId: decoded.userId },
	)
})
