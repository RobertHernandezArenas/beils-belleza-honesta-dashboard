/* eslint-disable @typescript-eslint/no-explicit-any -- test fakes */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { listConsents } from '../server/modules/compliance/list-consents'
import { createConsent } from '../server/modules/compliance/create-consent'
import { updateConsent } from '../server/modules/compliance/update-consent'
import { deleteConsent } from '../server/modules/compliance/delete-consent'
import { listQuestionnaires } from '../server/modules/compliance/list-questionnaires'
import { createQuestionnaire } from '../server/modules/compliance/create-questionnaire'
import { updateQuestionnaire } from '../server/modules/compliance/update-questionnaire'
import { deleteQuestionnaire } from '../server/modules/compliance/delete-questionnaire'
import { listRevokes } from '../server/modules/compliance/list-revokes'
import { createRevoke } from '../server/modules/compliance/create-revoke'
import { updateRevoke } from '../server/modules/compliance/update-revoke'
import { deleteRevoke } from '../server/modules/compliance/delete-revoke'
import type {
	ConsentsRepository,
	QuestionnairesRepository,
	RevokesRepository,
	ConsentRecord,
	QuestionnaireRecord,
	RevokeRecord,
} from '../server/modules/compliance/ports'

let consentsStore: ConsentRecord[]
let questionnairesStore: QuestionnaireRecord[]
let revokesStore: RevokeRecord[]

const buildConsentsRepo = (): ConsentsRepository => ({
	findMany: async (userId?: string) => {
		let list = [...consentsStore]
		if (userId) list = list.filter(c => c.user_id === userId)
		return list
	},
	findById: async (id: string) => consentsStore.find(c => c.consent_id === id) ?? null,
	upsert: async data => {
		const idx = consentsStore.findIndex(
			c => c.user_id === data.user_id && c.consent_type === data.consent_type,
		)
		if (idx !== -1) {
			const existing = consentsStore[idx]
			Object.assign(existing, data, { updated_at: new Date() })
			return existing
		}
		const created: ConsentRecord = {
			consent_id: `con-${consentsStore.length + 1}`,
			user_id: data.user_id,
			consent_type: data.consent_type,
			status: data.status,
			signed_date: data.signed_date,
			signature_data: data.signature_data ?? null,
			document_url: data.document_url ?? null,
			notes: data.notes ?? null,
			created_at: new Date(),
			updated_at: new Date(),
		}
		consentsStore.push(created)
		return created
	},
	create: async data => {
		const created: ConsentRecord = {
			consent_id: `con-${consentsStore.length + 1}`,
			user_id: data.user_id,
			consent_type: data.consent_type ?? null,
			status: data.status,
			signed_date: data.signed_date,
			signature_data: data.signature_data ?? null,
			document_url: data.document_url ?? null,
			notes: data.notes ?? null,
			created_at: new Date(),
			updated_at: new Date(),
		}
		consentsStore.push(created)
		return created
	},
	update: async (id, data) => {
		const existing = consentsStore.find(c => c.consent_id === id)
		if (!existing) throw new Error('Not found')
		Object.assign(existing, data, { updated_at: new Date() })
		return existing
	},
	delete: async id => {
		const idx = consentsStore.findIndex(c => c.consent_id === id)
		if (idx !== -1) consentsStore.splice(idx, 1)
	},
})

const buildQuestionnairesRepo = (): QuestionnairesRepository => ({
	findMany: async (userId?: string) => {
		let list = [...questionnairesStore]
		if (userId) list = list.filter(q => q.user_id === userId)
		return list
	},
	create: async data => {
		const created: QuestionnaireRecord = {
			questionnaire_id: `q-${questionnairesStore.length + 1}`,
			user_id: data.user_id,
			title: data.title,
			data: data.data,
			created_at: new Date(),
			updated_at: new Date(),
		}
		questionnairesStore.push(created)
		return created
	},
	update: async (id, data) => {
		const existing = questionnairesStore.find(q => q.questionnaire_id === id)
		if (!existing) throw new Error('Not found')
		Object.assign(existing, data, { updated_at: new Date() })
		return existing
	},
	delete: async id => {
		const idx = questionnairesStore.findIndex(q => q.questionnaire_id === id)
		if (idx !== -1) questionnairesStore.splice(idx, 1)
	},
})

const buildRevokesRepo = (): RevokesRepository => ({
	findMany: async (userId?: string) => {
		let list = [...revokesStore]
		if (userId) list = list.filter(r => r.user_id === userId)
		return list
	},
	create: async data => {
		const created: RevokeRecord = {
			revoke_id: `rev-${revokesStore.length + 1}`,
			user_id: data.user_id,
			reason: data.reason ?? null,
			date_revoked: data.date_revoked,
			created_at: new Date(),
			updated_at: new Date(),
		}
		revokesStore.push(created)
		return created
	},
	update: async (id, data) => {
		const existing = revokesStore.find(r => r.revoke_id === id)
		if (!existing) throw new Error('Not found')
		Object.assign(existing, data, { updated_at: new Date() })
		return existing
	},
	delete: async id => {
		const idx = revokesStore.findIndex(r => r.revoke_id === id)
		if (idx !== -1) revokesStore.splice(idx, 1)
	},
})

describe('Compliance Module (Consents, Questionnaires, Revokes) - Hexagonal Architecture', () => {
	beforeEach(() => {
		consentsStore = [
			{
				consent_id: 'con-1',
				user_id: 'user-1',
				consent_type: 'LGPD',
				status: 'SIGNED',
				signed_date: new Date('2026-01-01'),
				created_at: new Date('2026-01-01'),
				updated_at: new Date('2026-01-01'),
			},
			{
				consent_id: 'con-2',
				user_id: 'user-1',
				consent_type: 'INDIBA',
				status: 'UNSIGNED',
				signed_date: new Date('2026-01-02'),
				created_at: new Date('2026-01-02'),
				updated_at: new Date('2026-01-02'),
			},
		]

		questionnairesStore = [
			{
				questionnaire_id: 'q-1',
				user_id: 'user-1',
				title: 'Anamnesis Facial',
				data: '{"skinType":"combination"}',
				created_at: new Date('2026-01-01'),
				updated_at: new Date('2026-01-01'),
			},
		]

		revokesStore = [
			{
				revoke_id: 'rev-1',
				user_id: 'user-1',
				reason: 'Revocación por solicitud de la clienta',
				date_revoked: new Date('2026-01-05'),
				created_at: new Date('2026-01-05'),
				updated_at: new Date('2026-01-05'),
			},
		]
	})

	describe('Consents', () => {
		it('listConsents returns all or filters by userId', async () => {
			const repo = buildConsentsRepo()
			const all = await listConsents({ consents: repo })
			assert.equal(all.length, 2)

			const filtered = await listConsents({ consents: repo }, { userId: 'user-2' })
			assert.equal(filtered.length, 0)
		})

		it('createConsent upserts typed consent', async () => {
			const repo = buildConsentsRepo()
			const upserted = await createConsent(
				{ consents: repo },
				{ user_id: 'user-1', consent_type: 'INDIBA', status: 'SIGNED' },
			)
			assert.equal(upserted.consent_id, 'con-2')
			assert.equal(upserted.status, 'SIGNED')
		})

		it('updateConsent blocks mutation on signed consent', async () => {
			const repo = buildConsentsRepo()
			await assert.rejects(
				async () => updateConsent({ consents: repo }, { id: 'con-1', data: { notes: 'intento' } }),
				(err: any) => err.statusCode === 409 && err.statusMessage.includes('firmado'),
			)
		})

		it('updateConsent allows mutation on unsigned consent', async () => {
			const repo = buildConsentsRepo()
			const updated = await updateConsent(
				{ consents: repo },
				{ id: 'con-2', data: { status: 'SIGNED' } },
			)
			assert.equal(updated.status, 'SIGNED')
		})

		it('deleteConsent blocks deletion of signed consent', async () => {
			const repo = buildConsentsRepo()
			await assert.rejects(
				async () => deleteConsent({ consents: repo }, { id: 'con-1' }),
				(err: any) => err.statusCode === 409 && err.statusMessage.includes('firmado'),
			)
		})

		it('deleteConsent deletes unsigned consent', async () => {
			const repo = buildConsentsRepo()
			const res = await deleteConsent({ consents: repo }, { id: 'con-2' })
			assert.deepEqual(res, { success: true })
			assert.equal(consentsStore.length, 1)
		})
	})

	describe('Questionnaires', () => {
		it('list, create, update, delete questionnaires', async () => {
			const repo = buildQuestionnairesRepo()
			const list = await listQuestionnaires({ questionnaires: repo }, { userId: 'user-1' })
			assert.equal(list.length, 1)

			const created = await createQuestionnaire(
				{ questionnaires: repo },
				{ user_id: 'user-1', title: 'Hábitos', data: { water: '2L' } },
			)
			assert.equal(created.title, 'Hábitos')
			assert.equal(questionnairesStore.length, 2)

			const updated = await updateQuestionnaire(
				{ questionnaires: repo },
				{ id: created.questionnaire_id, data: { title: 'Hábitos y Nutrición' } },
			)
			assert.equal(updated.title, 'Hábitos y Nutrición')

			const res = await deleteQuestionnaire({ questionnaires: repo }, { id: created.questionnaire_id })
			assert.deepEqual(res, { success: true })
			assert.equal(questionnairesStore.length, 1)
		})
	})

	describe('Revokes', () => {
		it('list, create, update, delete revokes', async () => {
			const repo = buildRevokesRepo()
			const list = await listRevokes({ revokes: repo }, { userId: 'user-1' })
			assert.equal(list.length, 1)

			const created = await createRevoke(
				{ revokes: repo },
				{ user_id: 'user-1', reason: 'Cambio de parecer' },
			)
			assert.equal(created.reason, 'Cambio de parecer')
			assert.equal(revokesStore.length, 2)

			const updated = await updateRevoke(
				{ revokes: repo },
				{ id: created.revoke_id, data: { reason: 'Cambio justificado' } },
			)
			assert.equal(updated.reason, 'Cambio justificado')

			const res = await deleteRevoke({ revokes: repo }, { id: created.revoke_id })
			assert.deepEqual(res, { success: true })
			assert.equal(revokesStore.length, 1)
		})
	})
})

