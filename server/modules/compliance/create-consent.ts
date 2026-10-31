import type { ConsentsRepository, ConsentRecord } from './ports'

export interface CreateConsentDeps {
	consents: ConsentsRepository
}

export interface CreateConsentInput {
	user_id: string
	consent_type?: 'LGPD' | 'INDIBA' | 'LASER_INNOVA_PRO_SHR' | null
	document_url?: string | null
	signed_date?: string
	status?: string
	signature_data?: string | null
	notes?: string | null
}

export async function createConsent(deps: CreateConsentDeps, input: CreateConsentInput): Promise<ConsentRecord> {
	const signedDate = input.signed_date ? new Date(input.signed_date) : new Date()

	if (input.consent_type) {
		return await deps.consents.upsert({
			user_id: input.user_id,
			consent_type: input.consent_type,
			status: input.status || 'UNSIGNED',
			signed_date: signedDate,
			signature_data: input.signature_data || null,
			document_url: input.document_url || null,
			notes: input.notes || null,
		})
	}

	return await deps.consents.create({
		user_id: input.user_id,
		consent_type: null,
		status: input.status || 'UNSIGNED',
		signed_date: signedDate,
		signature_data: input.signature_data || null,
		document_url: input.document_url || null,
		notes: input.notes || null,
	})
}

