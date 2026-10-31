/* eslint-disable @typescript-eslint/no-explicit-any -- test fakes */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { listProducts } from '../server/modules/catalog/list-products'
import { getProduct } from '../server/modules/catalog/get-product'
import { createProduct } from '../server/modules/catalog/create-product'
import { updateProduct } from '../server/modules/catalog/update-product'
import { deleteProduct } from '../server/modules/catalog/delete-product'
import { listServices } from '../server/modules/catalog/list-services'
import { getService } from '../server/modules/catalog/get-service'
import { createService, calculateNextServiceCode } from '../server/modules/catalog/create-service'
import { updateService } from '../server/modules/catalog/update-service'
import { deleteService } from '../server/modules/catalog/delete-service'
import type {
	ProductsRepository,
	ServicesRepository,
	ProductRecord,
	ServiceRecord,
	NewProductInput,
	UpdateProductInput,
	NewServiceInput,
	UpdateServiceInput,
} from '../server/modules/catalog/ports'

let productsStore: ProductRecord[]
let servicesStore: ServiceRecord[]

const buildProductsRepo = (): ProductsRepository => ({
	findMany: async (search?: string) => {
		let list = [...productsStore]
		if (search) {
			const s = search.toLowerCase()
			list = list.filter(
				p =>
					p.name.toLowerCase().includes(s) ||
					(p.description && p.description.toLowerCase().includes(s)) ||
					(p.sku && p.sku.toLowerCase().includes(s)) ||
					(p.barcode && p.barcode.toLowerCase().includes(s)),
			)
		}
		return list.map(({ product_id, name, sku, barcode, image_url, price, stock, min_stock, status }) => ({
			product_id,
			name,
			sku,
			barcode,
			image_url,
			price,
			stock,
			min_stock,
			status,
		}))
	},
	findById: async (id: string) => productsStore.find(p => p.product_id === id) ?? null,
	create: async (data: NewProductInput) => {
		if (data.sku && productsStore.some(p => p.sku === data.sku)) {
			const err: any = new Error('Unique constraint')
			err.code = 'P2002'
			throw err
		}
		const record: ProductRecord = {
			product_id: `prod-${productsStore.length + 1}`,
			name: data.name,
			description: data.description ?? null,
			sku: data.sku ?? null,
			barcode: data.barcode ?? null,
			price: data.price,
			tax_rate: data.tax_rate ?? 21,
			stock: data.stock ?? 0,
			min_stock: data.min_stock ?? 0,
			image_url: data.image_url ?? null,
			status: data.status ?? 'activo',
			created_at: new Date(),
			updated_at: new Date(),
		}
		productsStore.push(record)
		return record
	},
	update: async (id: string, data: UpdateProductInput) => {
		const idx = productsStore.findIndex(p => p.product_id === id)
		if (idx === -1) {
			const err: any = new Error('Record to update not found')
			err.code = 'P2025'
			throw err
		}
		if (data.sku && productsStore.some(p => p.sku === data.sku && p.product_id !== id)) {
			const err: any = new Error('Unique constraint')
			err.code = 'P2002'
			throw err
		}
		const existing = productsStore[idx]
		Object.assign(existing, data, { updated_at: new Date() })
		return existing
	},
	delete: async (id: string) => {
		const idx = productsStore.findIndex(p => p.product_id === id)
		if (idx === -1) {
			const err: any = new Error('Record not found')
			err.code = 'P2025'
			throw err
		}
		productsStore.splice(idx, 1)
	},
})

const buildServicesRepo = (): ServicesRepository => ({
	findMany: async (search?: string) => {
		let list = [...servicesStore]
		if (search) {
			const s = search.toLowerCase()
			list = list.filter(
				srv =>
					srv.name.toLowerCase().includes(s) ||
					(srv.description && srv.description.toLowerCase().includes(s)) ||
					(srv.code && srv.code.toLowerCase().includes(s)),
			)
		}
		return list.map(({ service_id, name, code, price, duration, status }) => ({
			service_id,
			name,
			code,
			price,
			duration,
			status,
		}))
	},
	findById: async (id: string) => servicesStore.find(s => s.service_id === id) ?? null,
	findExistingSvcCodes: async () =>
		servicesStore.map(s => s.code).filter((c): c is string => Boolean(c && c.startsWith('SVC-'))),
	create: async (data: NewServiceInput) => {
		if (data.code && servicesStore.some(s => s.code === data.code)) {
			const err: any = new Error('Unique constraint')
			err.code = 'P2002'
			throw err
		}
		const record: ServiceRecord = {
			service_id: `srv-${servicesStore.length + 1}`,
			name: data.name,
			description: data.description ?? null,
			code: data.code ?? null,
			price: data.price,
			tax_rate: data.tax_rate ?? 21,
			duration: data.duration,
			status: data.status ?? 'activo',
			created_at: new Date(),
			updated_at: new Date(),
		}
		servicesStore.push(record)
		return record
	},
	update: async (id: string, data: UpdateServiceInput) => {
		const idx = servicesStore.findIndex(s => s.service_id === id)
		if (idx === -1) {
			const err: any = new Error('Record to update not found')
			err.code = 'P2025'
			throw err
		}
		if (data.code && servicesStore.some(s => s.code === data.code && s.service_id !== id)) {
			const err: any = new Error('Unique constraint')
			err.code = 'P2002'
			throw err
		}
		const existing = servicesStore[idx]
		Object.assign(existing, data, { updated_at: new Date() })
		return existing
	},
	delete: async (id: string) => {
		const idx = servicesStore.findIndex(s => s.service_id === id)
		if (idx === -1) {
			const err: any = new Error('Record not found')
			err.code = 'P2025'
			throw err
		}
		servicesStore.splice(idx, 1)
	},
})

describe('Catalog Module (Products & Services) - Hexagonal Architecture', () => {
	beforeEach(() => {
		productsStore = [
			{
				product_id: 'prod-1',
				name: 'Crema Hidratante',
				description: 'Facial diaria',
				sku: 'CREM-01',
				barcode: '12345678',
				image_url: null,
				price: 25.5,
				tax_rate: 21,
				stock: 10,
				min_stock: 2,
				status: 'activo',
				created_at: new Date('2026-01-01'),
				updated_at: new Date('2026-01-01'),
			},
			{
				product_id: 'prod-2',
				name: 'Serum Vitamina C',
				description: 'Antioxidante',
				sku: 'SER-02',
				barcode: '87654321',
				image_url: null,
				price: 35.0,
				tax_rate: 21,
				stock: 5,
				min_stock: 1,
				status: 'inactivo',
				created_at: new Date('2026-01-02'),
				updated_at: new Date('2026-01-02'),
			},
		]

		servicesStore = [
			{
				service_id: 'srv-1',
				name: 'Limpieza Facial Profunda',
				description: 'Higienización con punta de diamante',
				code: 'SVC-01',
				price: 45.0,
				tax_rate: 21,
				duration: 60,
				status: 'activo',
				created_at: new Date('2026-01-01'),
				updated_at: new Date('2026-01-01'),
			},
			{
				service_id: 'srv-2',
				name: 'Radiofrecuencia Indiba',
				description: 'Regeneración celular 448kHz',
				code: 'SVC-02',
				price: 70.0,
				tax_rate: 21,
				duration: 45,
				status: 'activo',
				created_at: new Date('2026-01-02'),
				updated_at: new Date('2026-01-02'),
			},
		]
	})

	describe('Products', () => {
		it('listProducts returns all products or filters by search', async () => {
			const repo = buildProductsRepo()
			const all = await listProducts({ products: repo })
			assert.equal(all.length, 2)

			const filtered = await listProducts({ products: repo }, { search: 'Serum' })
			assert.equal(filtered.length, 1)
			assert.equal(filtered[0].sku, 'SER-02')
		})

		it('getProduct returns product or throws 404', async () => {
			const repo = buildProductsRepo()
			const p = await getProduct({ products: repo }, { id: 'prod-1' })
			assert.equal(p.name, 'Crema Hidratante')

			await assert.rejects(
				async () => getProduct({ products: repo }, { id: 'non-existent' }),
				(err: any) => err.statusCode === 404,
			)
		})

		it('createProduct creates new product and throws 409 on duplicate sku', async () => {
			const repo = buildProductsRepo()
			const created = await createProduct(
				{ products: repo },
				{ name: 'Aceite Facial', price: 19.99, sku: 'OIL-03' },
			)
			assert.equal(created.sku, 'OIL-03')

			await assert.rejects(
				async () => createProduct({ products: repo }, { name: 'Otro', price: 10, sku: 'OIL-03' }),
				(err: any) => err.statusCode === 409 && err.statusMessage.includes('Ya existe'),
			)
		})

		it('updateProduct updates and throws 404 on missing or 409 on duplicate', async () => {
			const repo = buildProductsRepo()
			const updated = await updateProduct(
				{ products: repo },
				{ id: 'prod-1', data: { price: 29.99 } },
			)
			assert.equal(updated.price, 29.99)

			await assert.rejects(
				async () => updateProduct({ products: repo }, { id: 'prod-1', data: { sku: 'SER-02' } }),
				(err: any) => err.statusCode === 409,
			)

			await assert.rejects(
				async () => updateProduct({ products: repo }, { id: 'missing', data: { price: 10 } }),
				(err: any) => err.statusCode === 404,
			)
		})

		it('deleteProduct deletes the product', async () => {
			const repo = buildProductsRepo()
			const res = await deleteProduct({ products: repo }, { id: 'prod-1' })
			assert.deepEqual(res, { success: true })
			assert.equal(productsStore.length, 1)
		})
	})

	describe('Services', () => {
		it('listServices returns all services or filters by search', async () => {
			const repo = buildServicesRepo()
			const all = await listServices({ services: repo })
			assert.equal(all.length, 2)

			const filtered = await listServices({ services: repo }, { search: 'Indiba' })
			assert.equal(filtered.length, 1)
			assert.equal(filtered[0].code, 'SVC-02')
		})

		it('getService returns service or throws 404', async () => {
			const repo = buildServicesRepo()
			const s = await getService({ services: repo }, { id: 'srv-1' })
			assert.equal(s.name, 'Limpieza Facial Profunda')

			await assert.rejects(
				async () => getService({ services: repo }, { id: 'non-existent' }),
				(err: any) => err.statusCode === 404,
			)
		})

		it('calculateNextServiceCode auto-increments correlatively', () => {
			assert.equal(calculateNextServiceCode([]), 'SVC-01')
			assert.equal(calculateNextServiceCode(['SVC-01', 'SVC-02']), 'SVC-03')
			assert.equal(calculateNextServiceCode(['SVC-09']), 'SVC-10')
			assert.equal(calculateNextServiceCode(['SVC-05', 'SVC-02']), 'SVC-06')
		})

		it('createService generates code automatically if not provided', async () => {
			const repo = buildServicesRepo()
			const created = await createService(
				{ services: repo },
				{ name: 'Tratamiento Acné', price: 50, duration: 45 },
			)
			assert.equal(created.code, 'SVC-03')
			assert.equal(servicesStore.length, 3)
		})

		it('createService throws 409 on duplicate code', async () => {
			const repo = buildServicesRepo()
			await assert.rejects(
				async () =>
					createService(
						{ services: repo },
						{ name: 'Duplicado', price: 30, duration: 30, code: 'SVC-01' },
					),
				(err: any) => err.statusCode === 409 && err.statusMessage.includes('Ya existe'),
			)
		})

		it('updateService updates and throws 404 on missing or 409 on duplicate', async () => {
			const repo = buildServicesRepo()
			const updated = await updateService(
				{ services: repo },
				{ id: 'srv-1', data: { duration: 75 } },
			)
			assert.equal(updated.duration, 75)

			await assert.rejects(
				async () => updateService({ services: repo }, { id: 'srv-1', data: { code: 'SVC-02' } }),
				(err: any) => err.statusCode === 409,
			)

			await assert.rejects(
				async () => updateService({ services: repo }, { id: 'missing', data: { duration: 10 } }),
				(err: any) => err.statusCode === 404,
			)
		})

		it('deleteService deletes the service', async () => {
			const repo = buildServicesRepo()
			const res = await deleteService({ services: repo }, { id: 'srv-1' })
			assert.deepEqual(res, { success: true })
			assert.equal(servicesStore.length, 1)
		})
	})
})

