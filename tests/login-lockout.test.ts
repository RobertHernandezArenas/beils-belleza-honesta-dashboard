import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_FAILED_ATTEMPTS, lockDurationMinutes, isLocked, lockedMessage } from '../server/utils/login-lockout'

const NOW = new Date('2026-10-25T10:00:00Z')
const minutesFromNow = (m: number) => new Date(NOW.getTime() + m * 60_000)

describe('lockDurationMinutes', () => {
	it('does not lock before the 3rd failed attempt', () => {
		assert.equal(MAX_FAILED_ATTEMPTS, 3)
		assert.equal(lockDurationMinutes(1), 0)
		assert.equal(lockDurationMinutes(2), 0)
	})

	it('locks for 15 minutes on the 3rd failure and doubles on each further failure', () => {
		assert.equal(lockDurationMinutes(3), 15)
		assert.equal(lockDurationMinutes(4), 30)
		assert.equal(lockDurationMinutes(5), 60)
		assert.equal(lockDurationMinutes(6), 120)
	})

	it('caps the lock at 24 hours', () => {
		assert.equal(lockDurationMinutes(20), 24 * 60)
	})
})

describe('isLocked', () => {
	it('is locked only while locked_until is in the future', () => {
		assert.equal(isLocked(null, NOW), false)
		assert.equal(isLocked(minutesFromNow(-1), NOW), false)
		assert.equal(isLocked(minutesFromNow(5), NOW), true)
	})
})

describe('lockedMessage', () => {
	it('tells how long to wait, rounded up to whole minutes', () => {
		assert.match(lockedMessage(minutesFromNow(14.2), NOW), /15 min/)
		assert.match(lockedMessage(minutesFromNow(0.1), NOW), /1 min/)
	})
})
