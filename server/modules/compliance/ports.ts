export interface ComplianceUserSummary {
	user_id: string
	name: string
	surname: string | null
	email: string | null
}

export interface ConsentRecord {
	consent_id: string
	user_id: string
	consent_type: string | null
	status: string
	signed_date: Date
	signature_data?: string | null
	document_url?: string | null
	notes?: string | null
	created_at: Date
	updated_at: Date
	user?: ComplianceUserSummary
}

export interface QuestionnaireRecord {
	questionnaire_id: string
	user_id: string
	title: string
	data: string
	created_at: Date
	updated_at: Date
	user?: ComplianceUserSummary
}

export interface RevokeRecord {
	revoke_id: string
	user_id: string
	reason: string | null
	date_revoked: Date
	created_at: Date
	updated_at: Date
	user?: ComplianceUserSummary
}

export interface ConsentsRepository {
	findMany(userId?: string): Promise<ConsentRecord[]>
	findById(id: string): Promise<ConsentRecord | null>
	upsert(data: {
		user_id: string
		consent_type: string
		status: string
		signed_date: Date
		signature_data?: string | null
		document_url?: string | null
		notes?: string | null
	}): Promise<ConsentRecord>
	create(data: {
		user_id: string
		consent_type?: string | null
		status: string
		signed_date: Date
		signature_data?: string | null
		document_url?: string | null
		notes?: string | null
	}): Promise<ConsentRecord>
	update(
		id: string,
		data: {
			status?: 'UNSIGNED' | 'SIGNED'
			signed_date?: Date
			document_url?: string | null
			notes?: string | null
		},
	): Promise<ConsentRecord>
	delete(id: string): Promise<void>
}

export interface QuestionnairesRepository {
	findMany(userId?: string): Promise<QuestionnaireRecord[]>
	create(data: { user_id: string; title: string; data: string }): Promise<QuestionnaireRecord>
	update(id: string, data: { title?: string; data?: string }): Promise<QuestionnaireRecord>
	delete(id: string): Promise<void>
}

export interface RevokesRepository {
	findMany(userId?: string): Promise<RevokeRecord[]>
	create(data: { user_id: string; reason?: string | null; date_revoked: Date }): Promise<RevokeRecord>
	update(id: string, data: { reason?: string | null; date_revoked?: Date }): Promise<RevokeRecord>
	delete(id: string): Promise<void>
}

