/* eslint-disable @typescript-eslint/no-explicit-any -- test fakes */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { listZones } from '../server/modules/treatments/list-zones'
import { createZone } from '../server/modules/treatments/create-zone'
import { deleteZone } from '../server/modules/treatments/delete-zone'
import { createSession } from '../server/modules/treatments/create-session'
import { deleteSession } from '../server/modules/treatments/delete-session'
import type {
	TreatmentsRepository,
	TreatmentZoneRecord,
	TreatmentSessionRecord,
	NewZoneInput,
} from '../server/modules/treatments/ports'

let zonesStore: TreatmentZoneRecord[]
let sessionsStore: TreatmentSessionRecord[]
let consumedPackages: string[]

const buildTreatmentsRepo = (): TreatmentsRepository => ({
	findZones: async (clientId, treatmentType) => {
		return zonesStore.filter(z => {
			if (z.user_id !== clientId) return false
			if (treatmentType && z.treatment_type !== treatmentType) return false
			return true
		})
	},
	findZoneByIdAndClient: async (zoneId, clientId) => {
		return zonesStore.find(z => z.zone_id === zoneId && z.user_id === clientId) ?? null
	},
	countSessionsForZone: async zoneId => {
		return sessionsStore.filter(s => s.zone_id === zoneId).length
	},
	createZone: async (data: NewZoneInput) => {
		const zone: TreatmentZoneRecord = {
			zone_id: `zone-${zonesStore.length + 1}`,
			user_id: data.user_id,
			treatment_type: data.treatment_type,
			zone_name: data.zone_name,
			phototype: data.phototype ?? null,
			hair_thickness: data.hair_thickness ?? null,
			hair_color: data.hair_color ?? null,
			hair_density: data.hair_density ?? null,
			notes: data.notes ?? null,
			status: 'ACTIVE',
			sessions: [],
			created_at: new Date(),
			updated_at: new Date(),
		}
		zonesStore.push(zone)
		return zone
	},
	deleteZone: async zoneId => {
		const idx = zonesStore.findIndex(z => z.zone_id === zoneId)
		if (idx !== -1) zonesStore.splice(idx, 1)
	},
	deleteSession: async sessionId => {
		const idx = sessionsStore.findIndex(s => s.session_id === sessionId)
		if (idx !== -1) sessionsStore.splice(idx, 1)
	},
	transaction: async work => {
		const uow = {
			consumePackage: async (clientPackageId: string) => {
				consumedPackages.push(clientPackageId)
			},
			assertPackageAccess: async () => {},
			createSession: async (data: any) => {
				const session: TreatmentSessionRecord = {
					session_id: `sess-${sessionsStore.length + 1}`,
					...data,
					created_at: new Date(),
					updated_at: new Date(),
				}
				sessionsStore.push(session)
				return session
			},
		}
		return await work(uow)
	},
})

describe('Treatments Module (Zones & Sessions) - Hexagonal Architecture', () => {
	beforeEach(() => {
		consumedPackages = []
		zonesStore = [
			{
				zone_id: 'zone-1',
				user_id: 'client-1',
				treatment_type: 'LASER_SHR',
				zone_name: 'Piernas completas',
				phototype: 'III',
				hair_thickness: 'Medio',
				hair_color: 'Castaño',
				hair_density: 'Media',
				notes: null,
				status: 'ACTIVE',
				sessions: [],
			},
			{
				zone_id: 'zone-2',
				user_id: 'client-1',
				treatment_type: 'INDIBA',
				zone_name: 'Facial regeneración',
				phototype: null,
				hair_thickness: null,
				hair_color: null,
				hair_density: null,
				notes: null,
				status: 'ACTIVE',
				sessions: [],
			},
		]

		sessionsStore = [
			{
				session_id: 'sess-1',
				zone_id: 'zone-1',
				client_id: 'client-1',
				staff_id: 'staff-1',
				client_package_id: null,
				booking_id: null,
				session_number: 1,
				session_date: new Date('2026-01-01'),
				parameters: '12J/cm2, 10Hz',
				skin_reaction: null,
				observations: null,
			},
		]
	})

	it('listZones validates clientId and filters by treatment type', async () => {
		const repo = buildTreatmentsRepo()
		await assert.rejects(
			async () => listZones({ treatments: repo }, {} as any),
			(err: any) => err.statusCode === 400,
		)

		const all = await listZones({ treatments: repo }, { clientId: 'client-1' })
		assert.equal(all.length, 2)

		const indibaOnly = await listZones({ treatments: repo }, { clientId: 'client-1', treatmentType: 'INDIBA' })
		assert.equal(indibaOnly.length, 1)
		assert.equal(indibaOnly[0].zone_name, 'Facial regeneración')
	})

	it('createZone and deleteZone manage zones properly', async () => {
		const repo = buildTreatmentsRepo()
		const created = await createZone(
			{ treatments: repo },
			{ user_id: 'client-1', treatment_type: 'LASER_SHR', zone_name: 'Axilas' },
		)
		assert.equal(created.zone_name, 'Axilas')
		assert.equal(zonesStore.length, 3)

		const res = await deleteZone({ treatments: repo }, { zoneId: created.zone_id })
		assert.deepEqual(res, { success: true, message: 'Zona eliminada correctamente' })
		assert.equal(zonesStore.length, 2)
	})

	it('createSession calculates auto session number and verifies zone client ownership', async () => {
		const repo = buildTreatmentsRepo()
		await assert.rejects(
			async () =>
				createSession(
					{ treatments: repo },
					{
						zone_id: 'zone-1',
						client_id: 'wrong-client',
						session_date: '2026-02-01',
						parameters: '14J/cm2',
					},
				),
			(err: any) => err.statusCode === 404 && err.statusMessage.includes('no encontrada'),
		)

		const session = await createSession(
			{ treatments: repo },
			{
				zone_id: 'zone-1',
				client_id: 'client-1',
				session_date: '2026-02-01',
				parameters: '14J/cm2',
				client_package_id: 'cp-1',
				decrement_package: true,
			},
			'staff-1',
		)
		// zone-1 had 1 session, so new session number is 2
		assert.equal(session.session_number, 2)
		assert.equal(consumedPackages.includes('cp-1'), true)
	})

	it('deleteSession deletes session successfully', async () => {
		const repo = buildTreatmentsRepo()
		const res = await deleteSession({ treatments: repo }, { sessionId: 'sess-1' })
		assert.deepEqual(res, { success: true, message: 'Sesión eliminada correctamente' })
		assert.equal(sessionsStore.length, 0)
	})
})

