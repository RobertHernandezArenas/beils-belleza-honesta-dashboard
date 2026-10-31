import { createError } from 'h3'
import { assertConsentMutable } from '../../utils/consent-policy'
import type { ConsentsRepository } from './ports'

export interface DeleteConsentDeps {
	consents: ConsentsRepository
}

export async function deleteConsent(
	deps: DeleteConsentDeps,
	{ id }: { id: string },
): Promise<{ success: true }> {
	const existing = await deps.consents.findById(id)
	if (!existing) {
		throw createError({ statusCode: 404, statusMessage: 'Consentimiento no encontrado' })
	}

	assertConsentMutable(existing.status)

	await deps.consents.delete(id)
	return { success: true }
}

