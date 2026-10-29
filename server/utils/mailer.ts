import nodemailer, { type Transporter } from 'nodemailer'

/** SMTP transport configured from runtimeConfig (SMTP_* / MAIL_FROM env vars). Credentials never leave the server. */

export interface MailConfig {
	smtpHost?: string
	smtpPort?: string | number
	smtpSecure?: string | boolean
	smtpUser?: string
	smtpPass?: string
	mailFrom?: string
}

const DEFAULT_PORT = 587
const NETWORK_TIMEOUT_MS = 10_000

export function isMailConfigured(config: MailConfig) {
	return !!config.smtpHost?.trim() && !!config.mailFrom?.trim()
}

export function buildSmtpTransportOptions(config: MailConfig) {
	const parsedPort = Number(config.smtpPort)
	const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_PORT
	const secureFlag = String(config.smtpSecure ?? '').trim().toLowerCase()
	// Implicit TLS on 465; otherwise STARTTLS is negotiated when the server offers it
	const secure = secureFlag === '' ? port === 465 : secureFlag === 'true' || secureFlag === '1'
	const user = config.smtpUser?.trim()

	return {
		host: config.smtpHost?.trim(),
		port,
		secure,
		auth: user ? { user, pass: config.smtpPass ?? '' } : undefined,
		connectionTimeout: NETWORK_TIMEOUT_MS,
		greetingTimeout: NETWORK_TIMEOUT_MS,
		socketTimeout: NETWORK_TIMEOUT_MS,
	}
}

let transporter: Transporter | undefined

export function getMailConfig(): MailConfig {
	return useRuntimeConfig() as MailConfig
}

export async function sendMail(message: { to: string; subject: string; html: string; text: string }) {
	const config = getMailConfig()
	if (!isMailConfigured(config)) throw Object.assign(new Error('Mail is not configured'), { code: 'ENOTCONFIGURED' })
	transporter ??= nodemailer.createTransport(buildSmtpTransportOptions(config))
	return transporter.sendMail({ from: config.mailFrom, ...message })
}
