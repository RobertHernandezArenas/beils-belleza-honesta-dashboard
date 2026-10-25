import { prisma } from './prisma'
import { createSessionCache, type SessionUser } from './session-policy'

// 30s: a revoked/deactivated user loses access within this window at most
const cache = createSessionCache<SessionUser | null>(30_000)

export async function loadSessionUser(userId: string): Promise<SessionUser | null> {
	const cached = cache.get(userId)
	if (cached !== undefined) return cached
	const user = await prisma.user.findUnique({
		where: { user_id: userId },
		select: { status: true, role: true, token_version: true },
	})
	cache.set(userId, user)
	return user
}

/** Call after changing a user's role/status/password so this process stops trusting old data. */
export const invalidateSessionUser = (userId: string) => cache.invalidate(userId)
