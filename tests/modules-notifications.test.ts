import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getNotificationStatus } from '../server/modules/notifications/get-notification-status'
import type { NotificationsService } from '../server/modules/notifications/ports'

describe('getNotificationStatus', () => {
	it('returns configured notification status', () => {
		const fakeService: NotificationsService = {
			getStatus: () => ({ email: true }),
		}
		const status = getNotificationStatus({ notifications: fakeService })
		assert.deepEqual(status, { email: true })
	})

	it('returns false when email is unconfigured', () => {
		const fakeService: NotificationsService = {
			getStatus: () => ({ email: false }),
		}
		const status = getNotificationStatus({ notifications: fakeService })
		assert.deepEqual(status, { email: false })
	})
})

