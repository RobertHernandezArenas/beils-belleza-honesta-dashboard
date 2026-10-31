import type { NotificationStatus, NotificationsService } from './ports'

export interface GetNotificationStatusDeps {
	notifications: NotificationsService
}

export function getNotificationStatus(deps: GetNotificationStatusDeps): NotificationStatus {
	return deps.notifications.getStatus()
}

