import { getMailConfig, isMailConfigured } from '../../utils/mailer'
import type { NotificationStatus, NotificationsService } from './ports'

export function createSystemNotificationsService(): NotificationsService {
	return {
		getStatus: (): NotificationStatus => ({
			email: isMailConfigured(getMailConfig()),
		}),
	}
}

