import type { Prisma, PrismaClient } from '@prisma/client'
import type {
	ConsentsRepository,
	QuestionnairesRepository,
	RevokesRepository,
	ConsentRecord,
	QuestionnaireRecord,
	RevokeRecord,
} from './ports'

const userSelect = {
	select: { user_id: true, name: true, surname: true, email: true },
}

export function createPrismaConsentsRepository(db: PrismaClient): ConsentsRepository {
	return {
		async findMany(userId?: string): Promise<ConsentRecord[]> {
			const where: Prisma.ConsentWhereInput = {}
			if (userId) where.user_id = userId

			return (await db.consent.findMany({
				where,
				orderBy: { created_at: 'desc' },
				omit: { signature_data: true },
				include: { user: userSelect },
			})) as ConsentRecord[]
		},

		async findById(id: string): Promise<ConsentRecord | null> {
			return (await db.consent.findUnique({
				where: { consent_id: id },
				include: { user: userSelect },
			})) as ConsentRecord | null
		},

		async upsert(data): Promise<ConsentRecord> {
			return (await db.consent.upsert({
				where: {
					unique_user_consent: {
						user_id: data.user_id,
						consent_type: data.consent_type as any,
					},
				},
				create: {
					user_id: data.user_id,
					consent_type: data.consent_type as any,
					status: data.status,
					signed_date: data.signed_date,
					signature_data: data.signature_data,
					document_url: data.document_url,
					notes: data.notes,
				},
				update: {
					status: data.status,
					signed_date: data.signed_date,
					signature_data: data.signature_data !== undefined ? data.signature_data : undefined,
					document_url: data.document_url,
					notes: data.notes,
				},
				include: { user: userSelect },
			})) as ConsentRecord
		},

		async create(data): Promise<ConsentRecord> {
			return (await db.consent.create({
				data: {
					user_id: data.user_id,
					consent_type: data.consent_type as any,
					status: data.status,
					signed_date: data.signed_date,
					signature_data: data.signature_data,
					document_url: data.document_url,
					notes: data.notes,
				},
				include: { user: userSelect },
			})) as ConsentRecord
		},

		async update(id, data): Promise<ConsentRecord> {
			return (await db.consent.update({
				where: { consent_id: id },
				data,
				include: { user: userSelect },
			})) as ConsentRecord
		},

		async delete(id: string): Promise<void> {
			await db.consent.delete({ where: { consent_id: id } })
		},
	} satisfies ConsentsRepository
}

export function createPrismaQuestionnairesRepository(db: PrismaClient): QuestionnairesRepository {
	return {
		async findMany(userId?: string): Promise<QuestionnaireRecord[]> {
			const where: Prisma.QuestionnaireWhereInput = {}
			if (userId) where.user_id = userId

			return (await db.questionnaire.findMany({
				where,
				orderBy: { created_at: 'desc' },
				include: { user: userSelect },
			})) as QuestionnaireRecord[]
		},

		async create(data): Promise<QuestionnaireRecord> {
			return (await db.questionnaire.create({
				data,
				include: { user: userSelect },
			})) as QuestionnaireRecord
		},

		async update(id, data): Promise<QuestionnaireRecord> {
			return (await db.questionnaire.update({
				where: { questionnaire_id: id },
				data,
				include: { user: userSelect },
			})) as QuestionnaireRecord
		},

		async delete(id: string): Promise<void> {
			await db.questionnaire.delete({ where: { questionnaire_id: id } })
		},
	} satisfies QuestionnairesRepository
}

export function createPrismaRevokesRepository(db: PrismaClient): RevokesRepository {
	return {
		async findMany(userId?: string): Promise<RevokeRecord[]> {
			const where: Prisma.RevokeWhereInput = {}
			if (userId) where.user_id = userId

			return (await db.revoke.findMany({
				where,
				orderBy: { created_at: 'desc' },
				include: { user: userSelect },
			})) as RevokeRecord[]
		},

		async create(data): Promise<RevokeRecord> {
			return (await db.revoke.create({
				data,
				include: { user: userSelect },
			})) as RevokeRecord
		},

		async update(id, data): Promise<RevokeRecord> {
			return (await db.revoke.update({
				where: { revoke_id: id },
				data,
				include: { user: userSelect },
			})) as RevokeRecord
		},

		async delete(id: string): Promise<void> {
			await db.revoke.delete({ where: { revoke_id: id } })
		},
	} satisfies RevokesRepository
}

