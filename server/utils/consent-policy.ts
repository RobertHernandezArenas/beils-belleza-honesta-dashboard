import { createError } from 'h3'

/**
 * A signed consent is legal evidence: it can't be edited or deleted. Changes go through a new
 * record (e.g. a REVOKED consent + a revocation), which is how the consent modals already work.
 */
export function assertConsentMutable(status: string) {
	if (status === 'SIGNED') {
		throw createError({
			statusCode: 409,
			statusMessage: 'Un consentimiento firmado no se puede modificar ni eliminar. Registra una revocación.',
		})
	}
}
