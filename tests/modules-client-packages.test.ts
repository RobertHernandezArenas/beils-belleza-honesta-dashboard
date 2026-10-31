/* eslint-disable @typescript-eslint/no-explicit-any -- test fakes */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { listClientPackages } from '../server/modules/client-packages/list-client-packages'
import { assignClientPackage } from '../server/modules/client-packages/assign-client-package'
import { updateClientPackage } from '../server/modules/client-packages/update-client-package'
import { deleteClientPackage } from '../server/modules/client-packages/delete-client-package'
import { shareClientPackage } from '../server/modules/client-packages/share-client-package'
import { revokeClientPackageShare } from '../server/modules/client-packages/revoke-client-package-share'
import type {
	ClientPackagesRepository,
	ClientPackageRecord,
} from '../server/modules/client-packages/ports'

let clientPackagesStore: ClientPackageRecord[]
let sharesStore: Array<{ client_package_id: string; user_id: string; user?: any }>
let usersStore: Array<{ user_id: string; name: string; surname: string; role: string }>
let catalogPackagesStore: any[]

const buildClientPackagesRepo = (): ClientPackagesRepository => ({
	findUsable: async (clientId, now) => {
		return clientPackagesStore.filter(cp => {
			if (cp.status !== 'ACTIVE' || cp.remaining_sessions <= 0) return false
			const isOwner = cp.user_id === clientId
			const isBeneficiary = (cp.shares ?? []).some(s => s.user_id === clientId)
			if (!isOwner && !isBeneficiary) return false
			if (cp.expiry_date && cp.expiry_date <= now) return false
			return true
		})
	},
	findByIdAndOwner: async (packageId, clientId) => {
		return clientPackagesStore.find(cp => cp.client_package_id === packageId && cp.user_id === clientId) ?? null
	},
	findCatalogPackage: async (packageId: string) => {
		return catalogPackagesStore.find(p => p.package_id === packageId) ?? null
	},
	verifyClientExists: async (clientId: string) => {
		return usersStore.some(u => u.user_id === clientId && u.role === 'CLIENT')
	},
	verifyClientsExist: async (userIds: string[]) => {
		return userIds.every(id => usersStore.some(u => u.user_id === id && u.role === 'CLIENT'))
	},
	assignPackage: async data => {
		const cp: ClientPackageRecord = {
			client_package_id: `cp-${clientPackagesStore.length + 1}`,
			user_id: data.user_id,
			package_id: data.package_id,
			total_sessions: data.total_sessions,
			remaining_sessions: data.remaining_sessions,
			expiry_date: data.expiry_date,
			custom_price: data.custom_price,
			status: data.status,
			items: data.items?.map((it, i) => ({
				client_package_item_id: `cpi-${i + 1}`,
				client_package_id: `cp-${clientPackagesStore.length + 1}`,
				package_item_id: it.package_item_id,
				name: it.name,
				item_type: it.item_type,
				quantity_total: it.quantity,
				quantity_remaining: it.quantity,
				duration: it.duration,
			})),
			shares: [],
		}
		clientPackagesStore.push(cp)
		return cp
	},
	updatePackage: async (packageId, data, items) => {
		const cp = clientPackagesStore.find(p => p.client_package_id === packageId)
		if (!cp) throw new Error('Not found')
		Object.assign(cp, data)
		if (items) {
			for (const it of items) {
				const itemRecord = cp.items?.find(i => i.client_package_item_id === it.client_package_item_id)
				if (!itemRecord) {
					const err: any = new Error('Item not found in package')
					err.statusCode = 400
					err.statusMessage = 'El servicio indicado no pertenece a este bono'
					throw err
				}
				if (it.quantity_total !== undefined) itemRecord.quantity_total = it.quantity_total
				if (it.quantity_remaining !== undefined) itemRecord.quantity_remaining = it.quantity_remaining
			}
		}
		return cp
	},
	deletePackage: async (packageId: string) => {
		const idx = clientPackagesStore.findIndex(cp => cp.client_package_id === packageId)
		if (idx !== -1) clientPackagesStore.splice(idx, 1)
	},
	createShares: async (packageId, userIds) => {
		const cp = clientPackagesStore.find(p => p.client_package_id === packageId)
		for (const uid of userIds) {
			if (!sharesStore.some(s => s.client_package_id === packageId && s.user_id === uid)) {
				const user = usersStore.find(u => u.user_id === uid)
				const share = { client_package_id: packageId, user_id: uid, user }
				sharesStore.push(share)
				cp?.shares?.push(share)
			}
		}
		return sharesStore.filter(s => s.client_package_id === packageId)
	},
	deleteShare: async (packageId, userId, ownerId) => {
		const cp = clientPackagesStore.find(p => p.client_package_id === packageId && p.user_id === ownerId)
		if (!cp) return { count: 0 }
		const idx = sharesStore.findIndex(s => s.client_package_id === packageId && s.user_id === userId)
		if (idx === -1) return { count: 0 }
		sharesStore.splice(idx, 1)
		if (cp.shares) {
			const shareIdx = cp.shares.findIndex(s => s.user_id === userId)
			if (shareIdx !== -1) cp.shares.splice(shareIdx, 1)
		}
		return { count: 1 }
	},
})

describe('Client Packages Module - Hexagonal Architecture', () => {
	beforeEach(() => {
		usersStore = [
			{ user_id: 'client-1', name: 'Laura', surname: 'Perez', role: 'CLIENT' },
			{ user_id: 'client-2', name: 'Marta', surname: 'Gomez', role: 'CLIENT' },
			{ user_id: 'staff-1', name: 'Ana', surname: 'Admin', role: 'ADMIN' },
		]

		catalogPackagesStore = [
			{
				package_id: 'cat-pkg-1',
				name: 'Bono 5 Sesiones',
				type: 'INDIVIDUAL',
				total_sessions: 5,
				items: [],
			},
		]

		clientPackagesStore = [
			{
				client_package_id: 'cp-1',
				user_id: 'client-1',
				package_id: 'cat-pkg-1',
				total_sessions: 5,
				remaining_sessions: 3,
				expiry_date: new Date('2026-12-31'),
				custom_price: null,
				status: 'ACTIVE',
				package: { name: 'Bono 5 Sesiones', description: null, type: 'INDIVIDUAL', price: 100, service_id: null },
				items: [
					{
						client_package_item_id: 'cpi-1',
						client_package_id: 'cp-1',
						name: 'Sesión Láser',
						item_type: 'SERVICE',
						quantity_total: 5,
						quantity_remaining: 3,
						duration: 30,
					},
				],
				user: { user_id: 'client-1', name: 'Laura', surname: 'Perez' },
				shares: [],
			},
			{
				client_package_id: 'cp-shared',
				user_id: 'client-2',
				package_id: 'cat-pkg-1',
				total_sessions: 5,
				remaining_sessions: 2,
				expiry_date: new Date('2026-12-31'),
				custom_price: null,
				status: 'ACTIVE',
				package: { name: 'Bono 5 Sesiones Compartido', description: null, type: 'INDIVIDUAL', price: 100, service_id: null },
				items: [],
				user: { user_id: 'client-2', name: 'Marta', surname: 'Gomez' },
				shares: [{ client_package_id: 'cp-shared', user_id: 'client-1', user: { user_id: 'client-1', name: 'Laura', surname: 'Perez' } }],
			},
		]

		sharesStore = [
			{ client_package_id: 'cp-shared', user_id: 'client-1', user: { user_id: 'client-1', name: 'Laura', surname: 'Perez' } },
		]
	})

	it('listClientPackages returns own and shared packages with own packages first', async () => {
		const repo = buildClientPackagesRepo()
		const list = await listClientPackages({ clientPackages: repo }, { clientId: 'client-1' })
		assert.equal(list.length, 2)
		assert.equal(list[0].is_shared, false)
		assert.equal(list[1].is_shared, true)
	})

	it('assignClientPackage validates client and catalog package', async () => {
		const repo = buildClientPackagesRepo()
		await assert.rejects(
			async () =>
				assignClientPackage(
					{ clientPackages: repo },
					{ clientId: 'non-existent', input: { package_id: 'cat-pkg-1' } },
				),
			(err: any) => err.statusCode === 404 && err.statusMessage.includes('Cliente no encontrado'),
		)

		await assert.rejects(
			async () =>
				assignClientPackage(
					{ clientPackages: repo },
					{ clientId: 'client-1', input: { package_id: 'non-existent-pkg' } },
				),
			(err: any) => err.statusCode === 404 && err.statusMessage.includes('Paquete de catálogo no encontrado'),
		)

		const assigned = await assignClientPackage(
			{ clientPackages: repo },
			{ clientId: 'client-1', input: { package_id: 'cat-pkg-1' } },
		)
		assert.equal(assigned.total_sessions, 5)
		assert.equal(clientPackagesStore.length, 3)
	})

	it('updateClientPackage updates and enforces balance guard', async () => {
		const repo = buildClientPackagesRepo()
		await assert.rejects(
			async () =>
				updateClientPackage(
					{ clientPackages: repo },
					{ clientId: 'client-1', packageId: 'cp-1', input: { total_sessions: 2, remaining_sessions: 4 } },
				),
			(err: any) => err.statusCode === 400 && err.statusMessage.includes('restantes no pueden superar'),
		)

		const updated = await updateClientPackage(
			{ clientPackages: repo },
			{
				clientId: 'client-1',
				packageId: 'cp-1',
				input: {
					remaining_sessions: 2,
					items: [{ client_package_item_id: 'cpi-1', quantity_remaining: 2 }],
				},
			},
		)
		assert.equal(updated.remaining_sessions, 2)
	})

	it('deleteClientPackage deletes package or throws 404', async () => {
		const repo = buildClientPackagesRepo()
		await assert.rejects(
			async () =>
				deleteClientPackage(
					{ clientPackages: repo },
					{ clientId: 'client-1', packageId: 'cp-shared' }, // not owner
				),
			(err: any) => err.statusCode === 404,
		)

		const res = await deleteClientPackage(
			{ clientPackages: repo },
			{ clientId: 'client-1', packageId: 'cp-1' },
		)
		assert.deepEqual(res, { success: true, message: 'Bono desasignado correctamente' })
		assert.equal(clientPackagesStore.some(cp => cp.client_package_id === 'cp-1'), false)
	})

	it('shareClientPackage validates targets and shares bono', async () => {
		const repo = buildClientPackagesRepo()
		await assert.rejects(
			async () =>
				shareClientPackage(
					{ clientPackages: repo },
					{ clientId: 'client-1', packageId: 'cp-1', user_ids: ['client-1'] },
				),
			(err: any) => err.statusCode === 400 && err.statusMessage.includes('propia dueña'),
		)

		await assert.rejects(
			async () =>
				shareClientPackage(
					{ clientPackages: repo },
					{ clientId: 'client-1', packageId: 'cp-1', user_ids: ['staff-1'] },
				),
			(err: any) => err.statusCode === 400 && err.statusMessage.includes('clientes registrados'),
		)

		const shares = await shareClientPackage(
			{ clientPackages: repo },
			{ clientId: 'client-1', packageId: 'cp-1', user_ids: ['client-2'] },
		)
		assert.equal(shares.length, 1)
	})

	it('revokeClientPackageShare revokes share or throws 404', async () => {
		const repo = buildClientPackagesRepo()
		await assert.rejects(
			async () =>
				revokeClientPackageShare(
					{ clientPackages: repo },
					{ clientId: 'client-2', packageId: 'cp-shared', userId: 'client-nonexistent' },
				),
			(err: any) => err.statusCode === 404,
		)

		const res = await revokeClientPackageShare(
			{ clientPackages: repo },
			{ clientId: 'client-2', packageId: 'cp-shared', userId: 'client-1' },
		)
		assert.deepEqual(res, { success: true })
	})
})

