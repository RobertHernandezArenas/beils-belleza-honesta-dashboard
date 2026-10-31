import type { PrismaClient } from '@prisma/client'
import type {
	PackagesRepository,
	PackageUnitOfWork,
	CatalogPackageRecord,
	PackageItemRecord,
} from './ports'

export function createPrismaPackagesRepository(db: PrismaClient): PackagesRepository {
	return {
		async findActive(): Promise<CatalogPackageRecord[]> {
			return (await db.package.findMany({
				where: { status: 'activo' },
				include: { items: true },
				orderBy: { created_at: 'desc' },
			})) as CatalogPackageRecord[]
		},

		async findById(id: string): Promise<CatalogPackageRecord | null> {
			return (await db.package.findUnique({
				where: { package_id: id },
				include: { items: true },
			})) as CatalogPackageRecord | null
		},

		async create(data, items?: PackageItemRecord[]): Promise<CatalogPackageRecord> {
			return (await db.package.create({
				data: {
					...data,
					status: 'activo',
					items: items && items.length > 0 ? { create: items } : undefined,
				},
				include: { items: true },
			})) as CatalogPackageRecord
		},

		async deactivate(id: string): Promise<void> {
			await db.package.update({
				where: { package_id: id },
				data: { status: 'inactivo' },
			})
		},

		async transaction<T>(work: (uow: PackageUnitOfWork) => Promise<T>): Promise<T> {
			return await db.$transaction(async tx => {
				const uow: PackageUnitOfWork = {
					async deleteItems(packageId: string) {
						await tx.packageItem.deleteMany({
							where: { package_id: packageId },
						})
					},
					async updatePackage(packageId, data, items) {
						return (await tx.package.update({
							where: { package_id: packageId },
							data: {
								...data,
								items: items ? { create: items } : undefined,
							},
							include: { items: true },
						})) as CatalogPackageRecord
					},
				}
				return await work(uow)
			})
		},
	} satisfies PackagesRepository
}

