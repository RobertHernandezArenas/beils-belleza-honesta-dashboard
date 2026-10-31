import type { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { maskDocument } from '../../utils/privacy'
import { toPublicUser } from '../../utils/public-user'
import { invalidateSessionUser } from '../../utils/session-store'
import type { UsersRepository, UserSummaryRecord, UserRecord } from './ports'

export function createPrismaUsersRepository(db: PrismaClient): UsersRepository {
	return {
		async findMany(roles?: string[]): Promise<UserSummaryRecord[]> {
			const whereClause = roles && roles.length > 0 ? { role: { in: roles as Role[] } } : {}
			const users = await db.user.findMany({
				where: whereClause,
				orderBy: { created_at: 'desc' },
				select: {
					user_id: true,
					name: true,
					surname: true,
					email: true,
					role: true,
					status: true,
					document_type: true,
					document_number: true,
					avatar: true,
					locked_until: true,
				},
			})
			return users.map(u => ({
				...u,
				document_number: maskDocument(u.document_number),
			}))
		},

		async findById(id: string): Promise<UserRecord | null> {
			return (await db.user.findUnique({
				where: { user_id: id },
			})) as UserRecord | null
		},

		async findByEmail(email: string): Promise<UserRecord | null> {
			return (await db.user.findUnique({
				where: { email },
			})) as UserRecord | null
		},

		async countActiveAdmins(): Promise<number> {
			return await db.user.count({ where: { role: 'ADMIN', status: 'ON' } })
		},

		async create(data: any): Promise<any> {
			const hashedPassword = await bcrypt.hash(data.password, 12)
			const newUser = await db.user.create({
				data: {
					...data,
					password: hashedPassword,
					birth_date: new Date(data.birth_date),
					avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`,
				},
			})
			return toPublicUser(newUser)
		},

		async update(id: string, input: any, revoke: boolean): Promise<any> {
			const { password, birth_date, ...fields } = input
			const updateData: any = { ...fields }
			if (password) updateData.password = await bcrypt.hash(password, 12)
			if (birth_date) updateData.birth_date = new Date(birth_date)
			if (revoke) updateData.token_version = { increment: 1 }

			const updatedUser = await db.user.update({
				where: { user_id: id },
				data: updateData,
			})

			if (revoke) invalidateSessionUser(id)
			return toPublicUser(updatedUser)
		},

		async delete(id: string): Promise<void> {
			await db.user.delete({ where: { user_id: id } })
		},

		async unlock(id: string): Promise<boolean> {
			const { count } = await db.user.updateMany({
				where: { user_id: id },
				data: { failed_login_count: 0, locked_until: null },
			})
			return count > 0
		},
	} satisfies UsersRepository
}

