import { getEmailIneligibility, type EmailRecipient } from '../../shared/utils/email-eligibility'

/** Booking confirmation email: content building (HTML + text, Spanish) and a send step that never throws. */

export interface BookingEmailData {
	salon: { name: string; address?: string | null; phone?: string | null }
	clientName: string
	/** Stored as UTC midnight of the booking day */
	bookingDate: Date
	startTime: string
	duration: number
	services: string[]
	professional?: string | null
}

export interface MailMessage {
	to: string
	subject: string
	html: string
	text: string
}

export type EmailNotificationStatus = 'sent' | 'failed' | 'skipped'

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch] as string)
}

const singleLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim()

export function formatBookingDate(date: Date) {
	// The booking day is stored as UTC midnight, so format it in UTC to avoid shifting the day
	return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
		.format(date)
		.replace(',', '')
}

export function formatDuration(minutes: number) {
	const hours = Math.floor(minutes / 60)
	const rest = minutes % 60
	if (hours === 0) return `${rest} min`
	return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function buildBookingConfirmationEmail(data: BookingEmailData): Omit<MailMessage, 'to'> {
	const salonName = singleLine(data.salon.name)
	const date = formatBookingDate(data.bookingDate)
	const duration = formatDuration(data.duration)
	const address = data.salon.address?.trim()
	const phone = data.salon.phone?.trim()
	const professional = data.professional?.trim()

	const subject = `Tu cita en ${salonName} el ${date}`

	const details: [string, string][] = [
		['Fecha', date],
		['Hora', data.startTime],
		['Duración', duration],
	]
	if (professional) details.push(['Te atenderá', professional])

	const salonLines: [string, string][] = []
	if (address) salonLines.push(['Dirección', address])
	if (phone) salonLines.push(['Teléfono', phone])

	const text = [
		`Hola ${data.clientName},`,
		'',
		`Te confirmamos tu cita en ${salonName}.`,
		'',
		...details.map(([label, value]) => `${label}: ${value}`),
		'',
		'Servicios:',
		...data.services.map(service => `- ${service}`),
		'',
		salonName,
		...salonLines.map(([label, value]) => `${label}: ${value}`),
		'',
		'Si necesitas cambiar o cancelar la cita, ponte en contacto con nosotros.',
		'',
		'¡Te esperamos!',
	].join('\n')

	const e = escapeHtml
	const row = ([label, value]: [string, string]) =>
		`<tr><td style="padding:4px 12px 4px 0;color:#666">${e(label)}</td><td style="padding:4px 0;font-weight:bold">${e(value)}</td></tr>`

	const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px">
<p>Hola ${e(data.clientName)},</p>
<p>Te confirmamos tu cita en <strong>${e(salonName)}</strong>.</p>
<table style="border-collapse:collapse;margin:16px 0">${details.map(row).join('')}</table>
<p style="margin-bottom:4px"><strong>Servicios:</strong></p>
<ul style="margin-top:0">${data.services.map(service => `<li>${e(service)}</li>`).join('')}</ul>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="margin:0"><strong>${e(salonName)}</strong></p>
${salonLines.map(([label, value]) => `<p style="margin:0;color:#666">${e(label)}: ${e(value)}</p>`).join('\n')}
<p style="margin-top:24px">Si necesitas cambiar o cancelar la cita, ponte en contacto con nosotros.</p>
<p>¡Te esperamos!</p>
</div>
</body>
</html>`

	return { subject, html, text }
}

const DEFAULT_TIMEOUT_MS = 10_000

function withTimeout<T>(promise: Promise<T>, ms: number) {
	let timer: ReturnType<typeof setTimeout> | undefined
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(Object.assign(new Error('Mail send timed out'), { code: 'ETIMEOUT' })), ms)
	})
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * Sends the confirmation when it was requested and the recipient is eligible. Never throws:
 * a mail failure must not affect the already saved booking. Logs only a generic message and
 * the transport error code (no recipient, no content).
 */
export async function sendBookingConfirmation(options: {
	requested: boolean
	mailConfigured: boolean
	recipient: EmailRecipient | null
	content: BookingEmailData
	send: (message: MailMessage) => Promise<unknown>
	timeoutMs?: number
	log?: (...args: unknown[]) => void
}): Promise<EmailNotificationStatus> {
	const { requested, mailConfigured, recipient } = options
	if (!requested || getEmailIneligibility({ mailConfigured, client: recipient }) !== null) return 'skipped'

	try {
		const message = { to: (recipient?.email ?? '').trim(), ...buildBookingConfirmationEmail(options.content) }
		await withTimeout(options.send(message), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
		return 'sent'
	} catch (error) {
		const code = (error as { code?: unknown })?.code
		const log = options.log ?? console.error
		log('[BOOKING_EMAIL_ERROR] Confirmation email could not be sent', typeof code === 'string' ? code : 'UNKNOWN')
		return 'failed'
	}
}
