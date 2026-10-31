import { createSystemNotificationsService } from '../../modules/notifications/system-notifications-service'
import { getNotificationStatus } from '../../modules/notifications/get-notification-status'

export default defineEventHandler(() => {
	const service = createSystemNotificationsService()
	return getNotificationStatus({ notifications: service })
})
