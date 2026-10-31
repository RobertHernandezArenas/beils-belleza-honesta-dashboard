import type { PrismaClient } from '@prisma/client'
import { createError } from 'h3'
import type { ClientPackagesRepository, ClientPackageRecord } from './ports'

export function createPrismaClientPackagesRepository(db: PrismaClient): ClientPackagesRepository {
	return {
		async findUsable(clientId: string, now: Date): Promise<ClientPackageRecord[]> {
			return (await db.clientPackage.findMany({
				where: {
					status: 'ACTIVE',
					remaining_sessions: { gt: 0 },
					AND: [
						{ OR: [{ user_id: clientId }, { shares: { some: { user_id: clientId } } }] },
						{ OR: [{ expiry_date: null }, { expiry_date: { gt: now } }] },
					],
				},
				include: {
					package: true,
					items: true,
					user: { select: { user_id: true, name: true, surname: true } },
					shares: { include: { user: { select: { user_id: true, name: true, surname: true } } } },
				},
				orderBy: { created_at: 'desc' },
			})) as ClientPackageRecord[]
		},

		async findByIdAndOwner(packageId: string, clientId: string): Promise<ClientPackageRecord | null> {
			return (await db.clientPackage.findFirst({
				where: { client_package_id: packageId, user_id: clientId },
				include: { items: true },
			})) as ClientPackageRecord | null
		},

		async findCatalogPackage(packageId: string): Promise<any | null> {
			return await db.package.findUnique({
				where: { package_id: packageId },
				include: { items: true },
			})
		},

		async verifyClientExists(clientId: string): Promise<boolean> {
			const user = await db.user.findFirst({
				where: { user_id: clientId, role: 'CLIENT' },
				select: { user_id: true },
			})
			return Boolean(user)
		},

		async verifyClientsExist(userIds: string[]): Promise<boolean> {
			const users = await db.user.findMany({
				where: { user_id: { in: userIds }, role: 'CLIENT' },
				select: { user_id: true },
			})
			return users.length === userIds.length
		},

		async assignPackage(data): Promise<ClientPackageRecord> {
			return await db.$transaction(async tx => {
				const cp = await tx.clientPackage.create({
					data: {
						user_id: data.user_id,
						package_id: data.package_id,
						total_sessions: data.total_sessions,
						remaining_sessions: data.remaining_sessions,
						expiry_date: data.expiry_date,
						custom_price: data.custom_price,
						status: data.status,
					},
				})

				if (data.items && data.items.length > 0) {
					await tx.clientPackageItem.createMany({
						data: data.items.map(it => ({
							client_package_id: cp.client_package_id,
							package_item_id: (it as any).package_item_id,
							name: it.name,
							item_type: it.item_type,
							quantity_total: (it as any).quantity,
							quantity_remaining: (it as any).quantity,
							duration: it.duration,
						})),
					})
				}

				return (await tx.clientPackage.findUnique({
					where: { client_package_id: cp.client_package_id },
					include: { package: true, items: true },
				})) as ClientPackageRecord
			})
		},

		async updatePackage(packageId, data, items): Promise<ClientPackageRecord> {
			return await db.$transaction(async tx => {
				const updateData: any = {}
				if (data.total_sessions != null) updateData.total_sessions = data.total_sessions
				if (data.remaining_sessions != null) updateData.remaining_sessions = data.remaining_sessions
				if (data.custom_price !== undefined) updateData.custom_price = data.custom_price
				if (data.expiry_date !== undefined) updateData.expiry_date = data.expiry_date
				if (data.status !== undefined) updateData.status = data.status

				if (Object.keys(updateData).length > 0) {
					await tx.clientPackage.update({
						where: { client_package_id: packageId },
						data: updateData,
					})
				}

				for (const it of items ?? []) {
					const { count } = await tx.clientPackageItem.updateMany({
						where: { client_package_item_id: it.client_package_item_id, client_package_id: packageId },
						data: {
							...(it.quantity_total !== undefined ? { quantity_total: it.quantity_total } : {}),
							...(it.quantity_remaining !== undefined ? { quantity_remaining: it.quantity_remaining } : {}),
						},
					})
					if (count === 0) {
						throw createError({ statusCode: 400, statusMessage: 'El servicio indicado no pertenece a este bono' })
					}
				}

				return (await tx.clientPackage.findUnique({
					where: { client_package_id: packageId },
					include: { package: true, items: true },
				})) as ClientPackageRecord
			})
		},

		async deletePackage(packageId: string): Promise<void> {
			await db.clientPackage.delete({
				where: { client_package_id: packageId },
			})
		},

		async createShares(packageId: string, userIds: string[]): Promise<any[]> {
			await db.clientPackageShare.createMany({
				data: userIds.map(user_id => ({ client_package_id: packageId, user_id })),
				skipDuplicates: true,
			})

			return await db.clientPackageShare.findMany({
				where: { client_package_id: packageId },
				orderBy: { created_at: 'asc' },
				include: { user: { select: { user_id: true, name: true, surname: true, avatar: true } } },
			})
		},

		async deleteShare(packageId: string, userId: string, ownerId: string): Promise<{ count: number }> {
			return await db.clientPackageShare.deleteMany({
				where: { client_package_id: packageId, user_id: userId, client_package: { user_id: ownerId } },
			})
		},
	} satisfies ClientPackagesRepository
}

