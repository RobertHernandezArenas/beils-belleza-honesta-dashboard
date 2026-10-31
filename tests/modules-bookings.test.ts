/* eslint-disable @typescript-eslint/no-explicit-any -- test fakes */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { listBookings } from '../server/modules/bookings/list-bookings'
import { getBooking } from '../server/modules/bookings/get-booking'
import { createBooking } from '../server/modules/bookings/create-booking'
import { updateBooking } from '../server/modules/bookings/update-booking'
import { deleteBooking } from '../server/modules/bookings/delete-booking'
import type { BookingsRepository } from '../server/modules/bookings/ports'

let bookingsStore: any[]
let cartsStore: any[]
let usersStore: any[]

const buildBookingsRepo = (): BookingsRepository => ({
	findMany: async filters => {
		return bookingsStore.filter(b => {
			if (filters.client_id && b.client_id !== filters.client_id) return false
			if (filters.staff_id && b.staff_id !== filters.staff_id) return false
			if (filters.search) {
				const s = filters.search.toLowerCase()
				if (!b.notes?.toLowerCase().includes(s) && !b.client?.name?.toLowerCase().includes(s)) return false
			}
			return true
		})
	},
	findById: async id => bookingsStore.find(b => b.booking_id === id) ?? null,
	findFirstAdminId: async () => {
		const admin = usersStore.find(u => u.role === 'ADMIN' && u.status === 'ON')
		return admin?.user_id ?? null
	},
	findOverlapping: async (date, startTime, endTime, staffId, excludeBookingId) => {
		const overlapping = bookingsStore.find(b => {
			if (excludeBookingId && b.booking_id === excludeBookingId) return false
			if (b.staff_id !== staffId) return false
			if (['CANCELADA', 'AUSENTE'].includes(b.status)) return false
			if (b.booking_date.getTime() !== date.getTime()) return false
			return b.start_time < endTime && b.end_time > startTime
		})
		return overlapping ? { start_time: overlapping.start_time, end_time: overlapping.end_time } : null
	},
	hasCompletedCart: async bookingId => {
		return cartsStore.some(c => c.booking_id === bookingId && c.status === 'completed')
	},
	verifyClientExists: async clientId => usersStore.some(u => u.user_id === clientId && u.role === 'CLIENT'),
	verifyStaffExists: async staffId => usersStore.some(u => u.user_id === staffId && ['ADMIN', 'STAFF'].includes(u.role)),
	create: async data => {
		const booking = {
			booking_id: `book-${bookingsStore.length + 1}`,
			...data,
			client: usersStore.find(u => u.user_id === data.client_id),
			staff: usersStore.find(u => u.user_id === data.staff_id),
			booking_items: data.items,
			carts: [],
			created_at: new Date(),
		}
		bookingsStore.push(booking)
		return booking
	},
	update: async (id, data) => {
		const booking = bookingsStore.find(b => b.booking_id === id)
		if (!booking) throw new Error('Not found')
		Object.assign(booking, data)
		return booking
	},
	delete: async id => {
		const idx = bookingsStore.findIndex(b => b.booking_id === id)
		if (idx !== -1) bookingsStore.splice(idx, 1)
	},
})

describe('Bookings Module - Hexagonal Architecture', () => {
	beforeEach(() => {
		usersStore = [
			{ user_id: 'admin-1', name: 'Ana', surname: 'Admin', role: 'ADMIN', status: 'ON' },
			{ user_id: 'client-1', name: 'Laura', surname: 'Cliente', role: 'CLIENT', status: 'ON' },
		]

		cartsStore = [
			{ cart_id: 'cart-1', booking_id: 'book-completed', status: 'completed' },
		]

		bookingsStore = [
			{
				booking_id: 'book-1',
				client_id: 'client-1',
				staff_id: 'admin-1',
				booking_date: new Date(Date.UTC(2026, 4, 10)),
				start_time: '10:00',
				end_time: '11:00',
				duration: 60,
				status: 'CONFIRMADA',
				notes: 'Primera cita',
				client: { name: 'Laura', surname: 'Cliente' },
				staff: { name: 'Ana', surname: 'Admin' },
				carts: [],
			},
			{
				booking_id: 'book-completed',
				client_id: 'client-1',
				staff_id: 'admin-1',
				booking_date: new Date(Date.UTC(2026, 4, 10)),
				start_time: '12:00',
				end_time: '13:00',
				duration: 60,
				status: 'CONFIRMADA',
				notes: 'Cita cobrada',
				carts: [{ cart_id: 'cart-1', status: 'completed' }],
			},
		]
	})

	it('listBookings maps status to COMPLETADA if cart is completed', async () => {
		const repo = buildBookingsRepo()
		const list = await listBookings({ bookings: repo })
		assert.equal(list.length, 2)
		assert.equal(list.find(b => b.booking_id === 'book-completed')?.status, 'COMPLETADA')
	})

	it('getBooking returns booking or throws 404', async () => {
		const repo = buildBookingsRepo()
		const b = await getBooking({ bookings: repo }, { id: 'book-1' })
		assert.equal(b.notes, 'Primera cita')

		await assert.rejects(
			async () => getBooking({ bookings: repo }, { id: 'nonexistent' }),
			(err: any) => err.statusCode === 404,
		)
	})

	it('createBooking validates requirements and prevents overlap', async () => {
		const repo = buildBookingsRepo()
		// Missing client
		await assert.rejects(
			async () => createBooking({ bookings: repo }, { items: [{ name: 'S1', duration: 30 }] }),
			(err: any) => err.statusCode === 400 && err.statusMessage.includes('cliente'),
		)

		// Overlap conflict with book-1 (10:00 to 11:00)
		await assert.rejects(
			async () =>
				createBooking(
					{ bookings: repo },
					{
						client_id: 'client-1',
						staff_id: 'admin-1',
						booking_date: '2026-05-10',
						start_time: '10:30',
						items: [{ name: 'S1', duration: 60 }],
					},
				),
			(err: any) => err.statusCode === 409 && err.statusMessage.includes('Conflicto'),
		)

		// Successful create
		const created = await createBooking(
			{ bookings: repo },
			{
				client_id: 'client-1',
				booking_date: '2026-05-10',
				start_time: '14:00',
				items: [{ name: 'Limpieza', duration: 45 }],
			},
		)
		assert.equal(created.end_time, '14:45')
		assert.equal(created.duration, 45)
		assert.equal(bookingsStore.length, 3)
	})

	it('updateBooking blocks cancelling when cart is completed', async () => {
		const repo = buildBookingsRepo()
		await assert.rejects(
			async () => updateBooking({ bookings: repo }, { id: 'book-completed', input: { status: 'CANCELADA' } }),
			(err: any) => err.statusCode === 400 && err.statusMessage.includes('No se puede cancelar'),
		)
	})

	it('deleteBooking blocks deleting when cart is completed', async () => {
		const repo = buildBookingsRepo()
		await assert.rejects(
			async () => deleteBooking({ bookings: repo }, { id: 'book-completed' }),
			(err: any) => err.statusCode === 400 && err.statusMessage.includes('No se puede eliminar'),
		)

		const res = await deleteBooking({ bookings: repo }, { id: 'book-1' })
		assert.deepEqual(res, { success: true })
		assert.equal(bookingsStore.length, 1)
	})
})

