import type { Prisma, PrismaClient } from '@prisma/client'
import type {
	ProductsRepository,
	ServicesRepository,
	ProductSummary,
	ProductRecord,
	NewProductInput,
	UpdateProductInput,
	ServiceSummary,
	ServiceRecord,
	NewServiceInput,
	UpdateServiceInput,
} from './ports'

export function createPrismaProductsRepository(db: PrismaClient): ProductsRepository {
	return {
		async findMany(search?: string): Promise<ProductSummary[]> {
			const whereClause: Prisma.ProductWhereInput = {}
			if (search) {
				whereClause.OR = [
					{ name: { contains: search } },
					{ description: { contains: search } },
					{ sku: { contains: search } },
					{ barcode: { contains: search } },
				]
			}

			return (await db.product.findMany({
				where: whereClause,
				select: {
					product_id: true,
					name: true,
					sku: true,
					barcode: true,
					image_url: true,
					price: true,
					stock: true,
					min_stock: true,
					status: true,
				},
				orderBy: { created_at: 'desc' },
			})) as ProductSummary[]
		},

		async findById(id: string): Promise<ProductRecord | null> {
			return (await db.product.findUnique({
				where: { product_id: id },
			})) as ProductRecord | null
		},

		async create(data: NewProductInput): Promise<ProductRecord> {
			return (await db.product.create({ data })) as ProductRecord
		},

		async update(id: string, data: UpdateProductInput): Promise<ProductRecord> {
			return (await db.product.update({
				where: { product_id: id },
				data,
			})) as ProductRecord
		},

		async delete(id: string): Promise<void> {
			await db.product.delete({ where: { product_id: id } })
		},
	} satisfies ProductsRepository
}

export function createPrismaServicesRepository(db: PrismaClient): ServicesRepository {
	return {
		async findMany(search?: string): Promise<ServiceSummary[]> {
			const whereClause: Prisma.ServiceWhereInput = {}
			if (search) {
				whereClause.OR = [
					{ name: { contains: search } },
					{ description: { contains: search } },
					{ code: { contains: search } },
				]
			}

			return (await db.service.findMany({
				where: whereClause,
				select: {
					service_id: true,
					name: true,
					code: true,
					price: true,
					duration: true,
					status: true,
				},
				orderBy: { created_at: 'desc' },
			})) as ServiceSummary[]
		},

		async findById(id: string): Promise<ServiceRecord | null> {
			return (await db.service.findUnique({
				where: { service_id: id },
			})) as ServiceRecord | null
		},

		async findExistingSvcCodes(): Promise<string[]> {
			const services = await db.service.findMany({
				where: { code: { startsWith: 'SVC-' } },
				select: { code: true },
			})
			return services.map(s => s.code).filter((c): c is string => Boolean(c))
		},

		async create(data: NewServiceInput): Promise<ServiceRecord> {
			return (await db.service.create({ data })) as ServiceRecord
		},

		async update(id: string, data: UpdateServiceInput): Promise<ServiceRecord> {
			return (await db.service.update({
				where: { service_id: id },
				data,
			})) as ServiceRecord
		},

		async delete(id: string): Promise<void> {
			await db.service.delete({ where: { service_id: id } })
		},
	} satisfies ServicesRepository
}

