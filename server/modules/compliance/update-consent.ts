import { createError } from 'h3'
import { assertConsentMutable } from '../../utils/consent-policy'
import type { ConsentsRepository, ConsentRecord } from './ports'

export interface UpdateConsentDeps {
	consents: ConsentsRepository
}

export interface UpdateConsentInput {
	document_url?: string
	signed_date?: string
	status?: 'UNSIGNED' | 'SIGNED'
	notes?: string | null
}

export async function updateConsent(
	deps: UpdateConsentDeps,
	{ id, data }: { id: string; data: UpdateConsentInput },
): Promise<ConsentRecord> {
	const existing = await deps.consents.findById(id)
	if (!existing) {
		throw createError({ statusCode: 404, statusMessage: 'Consentimiento no encontrado' })
	}

	assertConsentMutable(existing.status)

	return await deps.consents.update(id, {
		status: data.status,
		document_url: data.document_url,
		notes: data.notes,
		signed_date: data.signed_date ? new Date(data.signed_date) : undefined,
	})
}

