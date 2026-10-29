import { getMailConfig, isMailConfigured } from '../../utils/mailer'

// Tells the dashboard which notification channels are available. Booleans only: never the SMTP settings.
export default defineEventHandler(() => ({
	email: isMailConfigured(getMailConfig()),
}))
