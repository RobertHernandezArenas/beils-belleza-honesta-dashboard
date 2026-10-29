/**
 * Whether a client can receive a transactional email (e.g. a booking confirmation).
 * Shared by the booking drawer (to disable the option) and the server (which re-checks it).
 */

export type EmailIneligibleReason = 'mail_not_configured' | 'walk_in' | 'no_email'

export interface EmailRecipient {
	name?: string | null
	surname?: string | null
	email?: string | null
}

// Clients created without an email get `sin-correo-…@cliente.local` (server/api/clients/index.post.ts)
const PLACEHOLDER_DOMAIN = '@cliente.local'
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isPlaceholderEmail(email: string) {
	return email.trim().toLowerCase().endsWith(PLACEHOLDER_DOMAIN)
}

/** The shared "no registrado / mostrador" walk-in client used when no client is selected. */
export function isWalkInClient(client: EmailRecipient) {
	const fullName = `${client.name ?? ''} ${client.surname ?? ''}`.toLowerCase()
	return fullName.includes('no registrado') || fullName.includes('mostrador')
}

/** Returns why the email cannot be sent, or null when it can. A missing client means the walk-in fallback. */
export function getEmailIneligibility(input: { mailConfigured: boolean; client?: EmailRecipient | null }): EmailIneligibleReason | null {
	if (!input.mailConfigured) return 'mail_not_configured'
	if (!input.client || isWalkInClient(input.client)) return 'walk_in'
	const email = input.client.email?.trim() ?? ''
	if (!EMAIL_SHAPE.test(email) || isPlaceholderEmail(email)) return 'no_email'
	return null
}
