export interface NotificationStatus {
	email: boolean
}

export interface NotificationsService {
	getStatus(): NotificationStatus
}

