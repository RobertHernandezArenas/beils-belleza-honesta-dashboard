/* eslint-disable @typescript-eslint/no-explicit-any -- loose fakes standing in for repository rows */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createClient, type CreateClientDeps } from '../server/modules/clients/create-client'
import { updateClient } from '../server/modules/clients/update-client'
import { deleteClient } from '../server/modules/clients/delete-client'
import { listClients } from '../server/modules/clients/list-clients'
import { getClientGiftcards } from '../server/modules/clients/get-client-giftcards'
import type { ClientsRepository, ClientRecord, ListClientsQuery } from '../server/modules/clients/ports'

type Row = Record<string, any>

interface Store {
	users: Row[]
}

let store: Store

const buildRepository = (): ClientsRepository => ({
	findById: async (id: string) => (store.users.find(u => u.user_id === id) as any) ?? null,
	findByEmail: async (email: string) => (store.users.find(u => u.email === email) as any) ?? null,
	findOtherByEmail: async (email: string, excludeUserId: string) =>
		(store.users.find(u => u.email === email && u.user_id !== excludeUserId) as any) ?? null,
	create: async (data: any) => {
		const user: ClientRecord = {
			user_id: data.user_id || `user-${store.users.length + 1}`,
			...data,
			created_at: new Date(),
			updated_at: new Date(),
		}
		store.users.push(user)
		return user
	},
	update: async (id: string, data: any) => {
		const user = store.users.find(u => u.user_id === id && u.role === 'CLIENT')
		if (!user) return null
		Object.assign(user, data)
		return user as any
	},
	list: async (query: ListClientsQuery) => {
		let filtered = store.users.filter(u => u.role === 'CLIENT')
		if (query.status) {
			filtered = filtered.filter(u => u.status === query.status)
		}
		if (query.search) {
			const s = query.search.toLowerCase()
			filtered = filtered.filter(u => (u.name || '').toLowerCase().includes(s))
		}
		return {
			data: filtered.slice(query.skip, query.skip + query.limit) as any,
			total: filtered.length,
		}
	},
	findDetail: async () => null,
	transaction: async work => {
		return await work({
			deleteClientCascade: async (userId: string) => {
				store.users = store.users.filter(u => u.user_id !== userId)
			},
		})
	},
})

const defaultDeps: CreateClientDeps = {
	clients: buildRepository(),
	hashPassword: async pass => `hashed_${pass}`,
	randomInt: () => 1234,
	now: () => new Date('2026-03-10T10:00:00Z'),
}

const rejection = async (fn: () => Promise<unknown>) => {
	try {
		await fn()
	} catch (err) {
		return err as { statusCode?: number; statusMessage?: string }
	}
	assert.fail('expected use case to throw')
}

beforeEach(() => {
	store = {
		users: [
			{
				user_id: 'existing-client-1',
				email: 'existing@example.com',
				name: 'Maria',
				surname: 'Lopez',
				role: 'CLIENT',
				status: 'ON',
				document_number: '12345678Z',
				document_type: 'DNI',
			},
		],
	}
})

describe('createClient', () => {
	it('creates client with hashed password', async () => {
		const deps = { ...defaultDeps, clients: buildRepository() }
		const res = await createClient(deps, {
			name: 'Juan',
			surname: 'Perez',
			email: 'juan@example.com',
			phone: '600123456',
			document_type: 'DNI',
			document_number: '98765432B',
		})

		assert.equal(res.name, 'Juan')
		assert.equal(res.phone, '600123456')
		assert.equal(res.role, 'CLIENT')
		assert.equal(store.users.length, 2)
	})

	it('throws 409 when email is already registered', async () => {
		const deps = { ...defaultDeps, clients: buildRepository() }
		const err = await rejection(() =>
			createClient(deps, {
				name: 'Juan',
				surname: 'Perez',
				email: 'existing@example.com',
				phone: '600123456',
			}),
		)

		assert.equal(err.statusCode, 409)
		assert.equal(err.statusMessage, 'El correo electrónico ya está registrado')
	})
})

describe('updateClient', () => {
	it('updates client fields', async () => {
		const repo = buildRepository()
		const res = await updateClient(
			{ clients: repo, now: () => new Date(), randomInt: () => 1 },
			{
				id: 'existing-client-1',
				data: {
					name: 'Maria Updated',
					phone: '611222333',
				},
			},
		)

		assert.equal(res.name, 'Maria Updated')
		assert.equal(res.phone, '611222333')
	})

	it('throws 409 when updated email is already taken by another user', async () => {
		store.users.push({
			user_id: 'client-2',
			email: 'other@example.com',
			role: 'CLIENT',
		})
		const repo = buildRepository()
		const err = await rejection(() =>
			updateClient(
				{ clients: repo, now: () => new Date(), randomInt: () => 1 },
				{
					id: 'existing-client-1',
					data: { email: 'other@example.com' },
				},
			),
		)

		assert.equal(err.statusCode, 409)
		assert.equal(err.statusMessage, 'El correo electrónico ya está en uso por otro cliente')
	})

	it('throws 404 when updating non-existent client', async () => {
		const repo = buildRepository()
		const err = await rejection(() =>
			updateClient(
				{ clients: repo, now: () => new Date(), randomInt: () => 1 },
				{ id: 'no-existe', data: { name: 'Test' } },
			),
		)

		assert.equal(err.statusCode, 404)
		assert.equal(err.statusMessage, 'Cliente no encontrado')
	})
})

describe('deleteClient', () => {
	it('cascades deletion and returns success', async () => {
		const repo = buildRepository()
		const res = await deleteClient({ clients: repo }, { id: 'existing-client-1' })
		assert.deepEqual(res, { success: true })
		assert.equal(store.users.length, 0)
	})

	it('throws 404 if client does not exist or is not a CLIENT', async () => {
		const repo = buildRepository()
		const err = await rejection(() => deleteClient({ clients: repo }, { id: 'no-existe' }))
		assert.equal(err.statusCode, 404)
	})
})

describe('listClients', () => {
	it('masks document numbers and calculates pagination', async () => {
		const repo = buildRepository()
		const res = await listClients({ clients: repo }, { page: 1, limit: 10, skip: 0 })
		assert.equal(res.data.length, 1)
		assert.equal(res.pagination.total, 1)
		assert.match(res.data[0]!.document_number, /\*{4}/)
	})
})

describe('getClientGiftcards', () => {
	it('throws 400 if client id is missing', async () => {
		const repo = buildRepository()
		const err = await rejection(() => getClientGiftcards({ clients: repo }, ''))
		assert.equal(err.statusCode, 400)
		assert.equal(err.statusMessage, 'Client ID is required')
	})

	it('returns empty array when client id is provided', async () => {
		const repo = buildRepository()
		const res = await getClientGiftcards({ clients: repo }, 'existing-client-1')
		assert.deepEqual(res, [])
	})
})
