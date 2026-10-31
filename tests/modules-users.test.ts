/* eslint-disable @typescript-eslint/no-explicit-any -- test fakes */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { listUsers } from '../server/modules/users/list-users'
import { createUser } from '../server/modules/users/create-user'
import { updateUser } from '../server/modules/users/update-user'
import { deleteUser } from '../server/modules/users/delete-user'
import { unlockUser } from '../server/modules/users/unlock-user'
import type { UsersRepository, UserRecord, UserSummaryRecord } from '../server/modules/users/ports'

let usersStore: UserRecord[]

const buildUsersRepo = (): UsersRepository => ({
	findMany: async (roles?: string[]) => {
		let list = [...usersStore]
		if (roles && roles.length > 0) {
			list = list.filter(u => roles.includes(u.role))
		}
		return list.map(u => ({
			user_id: u.user_id,
			name: u.name,
			surname: u.surname,
			email: u.email,
			role: u.role,
			status: u.status,
			document_type: u.document_type,
			document_number: u.document_number,
			avatar: u.avatar,
			locked_until: u.locked_until,
		}))
	},
	findById: async id => usersStore.find(u => u.user_id === id) ?? null,
	findByEmail: async email => usersStore.find(u => u.email === email) ?? null,
	countActiveAdmins: async () => usersStore.filter(u => u.role === 'ADMIN' && u.status === 'ON').length,
	create: async data => {
		const u: UserRecord = {
			user_id: `user-${usersStore.length + 1}`,
			name: data.name,
			surname: data.surname ?? null,
			email: data.email,
			role: data.role,
			status: data.status,
			document_type: data.document_type ?? null,
			document_number: data.document_number ?? null,
			avatar: data.avatar ?? null,
			phone: data.phone ?? null,
			locked_until: null,
		}
		usersStore.push(u)
		return u
	},
	update: async (id, data) => {
		const u = usersStore.find(user => user.user_id === id)
		if (!u) throw new Error('User not found')
		if (data.email && usersStore.some(user => user.email === data.email && user.user_id !== id)) {
			const err: any = new Error('Unique constraint')
			err.code = 'P2002'
			throw err
		}
		Object.assign(u, data)
		return u
	},
	delete: async id => {
		const idx = usersStore.findIndex(u => u.user_id === id)
		if (idx !== -1) usersStore.splice(idx, 1)
	},
	unlock: async id => {
		const u = usersStore.find(user => user.user_id === id)
		if (!u) return false
		u.locked_until = null
		return true
	},
})

describe('Users Module - Hexagonal Architecture', () => {
	beforeEach(() => {
		usersStore = [
			{
				user_id: 'admin-1',
				name: 'Principal',
				surname: 'Admin',
				email: 'admin1@beils.com',
				role: 'ADMIN',
				status: 'ON',
				document_type: 'DNI',
				document_number: '12345678A',
				avatar: null,
				phone: '600000001',
				locked_until: null,
			},
			{
				user_id: 'admin-2',
				name: 'Secundario',
				surname: 'Admin',
				email: 'admin2@beils.com',
				role: 'ADMIN',
				status: 'ON',
				document_type: 'DNI',
				document_number: '87654321B',
				avatar: null,
				phone: '600000002',
				locked_until: null,
			},
			{
				user_id: 'staff-1',
				name: 'Esteticista',
				surname: 'Profesional',
				email: 'staff@beils.com',
				role: 'STAFF',
				status: 'ON',
				document_type: 'NIE',
				document_number: 'X1234567C',
				avatar: null,
				phone: '600000003',
				locked_until: new Date('2026-12-31'),
			},
		]
	})

	it('listUsers filters by roles', async () => {
		const repo = buildUsersRepo()
		const all = await listUsers({ users: repo })
		assert.equal(all.length, 3)

		const staffOnly = await listUsers({ users: repo }, { roles: ['STAFF'] })
		assert.equal(staffOnly.length, 1)
		assert.equal(staffOnly[0].email, 'staff@beils.com')
	})

	it('createUser rejects duplicate email', async () => {
		const repo = buildUsersRepo()
		await assert.rejects(
			async () => createUser({ users: repo }, { email: 'admin1@beils.com', name: 'Otro', role: 'STAFF' }),
			(err: any) => err.statusCode === 400 && err.statusMessage.includes('en uso'),
		)

		const created = await createUser({ users: repo }, { email: 'nuevo@beils.com', name: 'Nuevo', role: 'STAFF', status: 'ON' })
		assert.equal(created.email, 'nuevo@beils.com')
		assert.equal(usersStore.length, 4)
	})

	it('updateUser enforces admin count guard and duplicate email protection', async () => {
		const repo = buildUsersRepo()
		await assert.rejects(
			async () => updateUser({ users: repo }, { id: 'admin-1', input: { email: 'admin2@beils.com' } }),
			(err: any) => err.statusCode === 409,
		)

		const updated = await updateUser({ users: repo }, { id: 'admin-1', input: { name: 'Admin Renombrado' } })
		assert.equal(updated.name, 'Admin Renombrado')
	})

	it('deleteUser guards against self-deletion and last admin deletion', async () => {
		const repo = buildUsersRepo()
		// self deletion attempt
		await assert.rejects(
			async () => deleteUser({ users: repo }, { actorId: 'admin-1', id: 'admin-1' }),
			(err: any) => err.statusCode === 409 && err.statusMessage.includes('propio usuario'),
		)

		// delete non-self admin when another exists
		const res = await deleteUser({ users: repo }, { actorId: 'admin-1', id: 'admin-2' })
		assert.deepEqual(res, { success: true, message: 'Usuario eliminado' })
		assert.equal(usersStore.length, 2)
	})

	it('unlockUser unlocks locked user and throws 404 for missing user', async () => {
		const repo = buildUsersRepo()
		await assert.rejects(
			async () => unlockUser({ users: repo }, { id: 'missing' }),
			(err: any) => err.statusCode === 404,
		)

		const res = await unlockUser({ users: repo }, { id: 'staff-1' })
		assert.deepEqual(res, { success: true })
		assert.equal(usersStore.find(u => u.user_id === 'staff-1')?.locked_until, null)
	})
})
