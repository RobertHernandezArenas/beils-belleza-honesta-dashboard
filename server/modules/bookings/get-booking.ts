import { createError } from 'h3'
import type { BookingsRepository } from './ports'

export interface GetBookingDeps {
	bookings: BookingsRepository
}

export async function getBooking(deps: GetBookingDeps, { id }: { id: string }) {
	const booking = await deps.bookings.findById(id)
	if (!booking) {
		throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
	}

	const hasCompletedCart = booking.carts && booking.carts.some((c: any) => c.status === 'completed' || !!c.invoice_number)
	return {
		...booking,
		status: hasCompletedCart ? 'COMPLETADA' : booking.status,
	}
}

