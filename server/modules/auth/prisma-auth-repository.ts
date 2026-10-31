import type { PrismaClient } from '@prisma/client'
import type { AuthRepository, AuthUserRecord } from './ports'

export function createPrismaAuthRepository(db: PrismaClient): AuthRepository {
	return {
		async findByEmail(email: string): Promise<AuthUserRecord | null> {
			return (await db.user.findUnique({
				where: { email },
			})) as AuthUserRecord | null
		},

		async findById(userId: string): Promise<AuthUserRecord | null> {
			return (await db.user.findUnique({
				where: { user_id: userId },
			})) as AuthUserRecord | null
		},

		async incrementFailedAttempts(userId: string): Promise<number> {
			const { failed_login_count } = await db.user.update({
				where: { user_id: userId },
				data: { failed_login_count: { increment: 1 } },
				select: { failed_login_count: true },
			})
			return failed_login_count
		},

		async lockAccount(userId: string, lockedUntil: Date): Promise<void> {
			await db.user.update({
				where: { user_id: userId },
				data: { locked_until: lockedUntil },
			})
		},

		async resetFailedAttempts(userId: string): Promise<void> {
			await db.user.update({
				where: { user_id: userId },
				data: { failed_login_count: 0, locked_until: null },
			})
		},
	} satisfies AuthRepository
}

