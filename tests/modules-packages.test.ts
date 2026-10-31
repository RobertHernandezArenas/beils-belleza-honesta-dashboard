/* eslint-disable @typescript-eslint/no-explicit-any -- test fakes */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { listPackages } from '../server/modules/packages/list-packages'
import { getPackage } from '../server/modules/packages/get-package'
import { createPackage } from '../server/modules/packages/create-package'
import { updatePackage } from '../server/modules/packages/update-package'
import { deletePackage } from '../server/modules/packages/delete-package'
import type {
	PackagesRepository,
	CatalogPackageRecord,
	PackageItemRecord,
} from '../server/modules/packages/ports'

let packagesStore: CatalogPackageRecord[]

const buildPackagesRepo = (): PackagesRepository => ({
	findActive: async () => packagesStore.filter(p => p.status === 'activo'),
	findById: async (id: string) => packagesStore.find(p => p.package_id === id) ?? null,
	create: async (data, items) => {
		const pkg: CatalogPackageRecord = {
			package_id: `pkg-${packagesStore.length + 1}`,
			name: data.name,
			description: data.description ?? null,
			type: data.type,
			price: data.price,
			total_sessions: data.total_sessions,
			service_id: data.service_id ?? null,
			status: 'activo',
			items: items ? items.map((it, i) => ({ ...it, package_item_id: `item-${i + 1}` })) : [],
			created_at: new Date(),
			updated_at: new Date(),
		}
		packagesStore.push(pkg)
		return pkg
	},
	deactivate: async (id: string) => {
		const pkg = packagesStore.find(p => p.package_id === id)
		if (pkg) {
			pkg.status = 'inactivo'
		}
	},
	transaction: async work => {
		const uow = {
			deleteItems: async (packageId: string) => {
				const pkg = packagesStore.find(p => p.package_id === packageId)
				if (pkg) {
					pkg.items = []
				}
			},
			updatePackage: async (
				packageId: string,
				data: any,
				items?: PackageItemRecord[],
			) => {
				const pkg = packagesStore.find(p => p.package_id === packageId)
				if (!pkg) throw new Error('Package not found')
				Object.assign(pkg, data, {
					items: items ? items.map((it, i) => ({ ...it, package_item_id: `item-${i + 1}` })) : [],
					updated_at: new Date(),
				})
				return pkg
			},
		}
		return await work(uow)
	},
})

describe('Catalog Packages Module - Hexagonal Architecture', () => {
	beforeEach(() => {
		packagesStore = [
			{
				package_id: 'pkg-1',
				name: 'Bono Láser 5 Sesiones',
				description: 'Zona pequeña',
				type: 'INDIVIDUAL',
				price: 150,
				total_sessions: 5,
				service_id: 'srv-laser',
				status: 'activo',
				items: [],
				created_at: new Date('2026-01-01'),
			},
			{
				package_id: 'pkg-2',
				name: 'Pack Belleza Total',
				description: 'Mixto facial y corporal con producto',
				type: 'MIXTO',
				price: 250,
				total_sessions: 0,
				service_id: null,
				status: 'activo',
				items: [
					{ item_type: 'SERVICE', item_id: 'srv-1', name: 'Limpieza', quantity: 2, duration: 60 },
					{ item_type: 'SERVICE', item_id: 'srv-2', name: 'Indiba', quantity: 3, duration: 45 },
					{ item_type: 'PRODUCT', item_id: 'prod-1', name: 'Crema', quantity: 1, duration: 0 },
				],
				created_at: new Date('2026-01-02'),
			},
			{
				package_id: 'pkg-3',
				name: 'Bono Antiguo Inactivo',
				description: null,
				type: 'INDIVIDUAL',
				price: 100,
				total_sessions: 3,
				service_id: null,
				status: 'inactivo',
				items: [],
				created_at: new Date('2025-01-01'),
			},
		]
	})

	it('listPackages returns active packages and counts only SERVICE sessions for MIXTO packages', async () => {
		const repo = buildPackagesRepo()
		const list = await listPackages({ packages: repo })
		assert.equal(list.length, 2)

		const mixto = list.find(p => p.package_id === 'pkg-2')
		assert.ok(mixto)
		// 2 Limpieza + 3 Indiba = 5 sessions (ignoring the 1 product)
		assert.equal(mixto.total_sessions, 5)
	})

	it('getPackage returns package or throws 404', async () => {
		const repo = buildPackagesRepo()
		const pkg = await getPackage({ packages: repo }, { id: 'pkg-1' })
		assert.equal(pkg.name, 'Bono Láser 5 Sesiones')

		await assert.rejects(
			async () => getPackage({ packages: repo }, { id: 'non-existent' }),
			(err: any) => err.statusCode === 404 && err.statusMessage.includes('no encontrado'),
		)
	})

	it('createPackage creates a new package with calculated sessions', async () => {
		const repo = buildPackagesRepo()
		const created = await createPackage(
			{ packages: repo },
			{
				name: 'Bono Masaje 3 Sesiones',
				type: 'INDIVIDUAL',
				price: 90,
				total_sessions: 3,
			},
		)
		assert.equal(created.name, 'Bono Masaje 3 Sesiones')
		assert.equal(created.total_sessions, 3)
		assert.equal(packagesStore.length, 4)
	})

	it('updatePackage replaces items and recalculates sessions in transaction', async () => {
		const repo = buildPackagesRepo()
		const updated = await updatePackage(
			{ packages: repo },
			{
				id: 'pkg-2',
				input: {
					name: 'Pack Belleza Total Renovado',
					type: 'MIXTO',
					price: 290,
					total_sessions: 1, // Will be overridden by MIXTO service calculation (2 + 2 = 4)
					items: [
						{ item_type: 'SERVICE', item_id: 'srv-1', name: 'Limpieza', quantity: 2, duration: 60 },
						{ item_type: 'SERVICE', item_id: 'srv-3', name: 'Peeling', quantity: 2, duration: 30 },
					],
				},
			},
		)
		assert.equal(updated.name, 'Pack Belleza Total Renovado')
		assert.equal(updated.total_sessions, 4)
		assert.equal(updated.items?.length, 2)
	})

	it('deletePackage deactivates package (soft delete)', async () => {
		const repo = buildPackagesRepo()
		const res = await deletePackage({ packages: repo }, { id: 'pkg-1' })
		assert.deepEqual(res, { success: true })
		assert.equal(packagesStore.find(p => p.package_id === 'pkg-1')?.status, 'inactivo')
	})
})

