import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseBookingUpdate } from '../server/utils/booking-validation'

const statusOf = (fn: () => unknown) => {
	try {
		fn()
		return 'ok'
	} catch (err) {
		return (err as { statusCode?: number }).statusCode
	}
}

describe('parseBookingUpdate', () => {
	const drawerPayload = {
		client_id: 'c1',
		staff_id: 's1',
		items: [{ item_type: 'SERVICE', item_id: 'svc1', name: 'Indiba', duration: 45 }],
		status: 'CONFIRMADA',
		booking_date: '2026-10-25',
		start_time: '10:30',
		duration: 45,
		notes: 'Primera sesión',
	}

	it('accepts what the booking drawer sends', () => {
		const data = parseBookingUpdate(drawerPayload)
		assert.equal(data.start_time, '10:30')
		assert.equal(data.items?.[0]?.duration, 45)
	})

	it('accepts a status-only update and normalises the case', () => {
		assert.deepEqual(parseBookingUpdate({ status: 'completada' }), { status: 'COMPLETADA' })
	})

	it('drops fields that must not be written from the request (no mass assignment)', () => {
		const data = parseBookingUpdate({ ...drawerPayload, booking_id: 'x', created_at: '2000-01-01', item_id: 'hack', end_time: '23:59' }) as Record<string, unknown>
		for (const key of ['booking_id', 'created_at', 'item_id', 'end_time']) assert.equal(key in data, false, key)
	})

	it('treats an empty staff_id as "unassigned"', () => {
		assert.equal(parseBookingUpdate({ staff_id: '' }).staff_id, null)
	})

	it('rejects invalid times, durations, dates and statuses', () => {
		assert.equal(statusOf(() => parseBookingUpdate({ start_time: '25:00' })), 400)
		assert.equal(statusOf(() => parseBookingUpdate({ start_time: '10h' })), 400)
		assert.equal(statusOf(() => parseBookingUpdate({ duration: -10 })), 400)
		assert.equal(statusOf(() => parseBookingUpdate({ duration: 5000 })), 400)
		assert.equal(statusOf(() => parseBookingUpdate({ booking_date: 'mañana' })), 400)
		assert.equal(statusOf(() => parseBookingUpdate({ status: 'BORRADA' })), 400)
		assert.equal(statusOf(() => parseBookingUpdate({ items: [{ item_type: 'SERVICE', item_id: 'x', name: 'X', duration: -5 }] })), 400)
	})
})
