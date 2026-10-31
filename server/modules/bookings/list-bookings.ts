import type { BookingsRepository, BookingFilters, BookingSummaryRecord } from './ports'

export interface ListBookingsDeps {
	bookings: BookingsRepository
}

export async function listBookings(
	deps: ListBookingsDeps,
	filters: BookingFilters = {},
): Promise<BookingSummaryRecord[]> {
	const bookings = await deps.bookings.findMany(filters)

	return bookings.map(b => {
		const hasCompletedCart = b.carts && b.carts.some(c => c.status === 'completed' || !!c.invoice_number)
		return {
			...b,
			status: hasCompletedCart ? 'COMPLETADA' : b.status,
		}
	})
}

