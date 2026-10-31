import { createError } from 'h3'
import type { BookingsRepository } from './ports'

export interface DeleteBookingDeps {
	bookings: BookingsRepository
}

export async function deleteBooking(deps: DeleteBookingDeps, { id }: { id: string }): Promise<{ success: true }> {
	const hasCompletedCart = await deps.bookings.hasCompletedCart(id)
	if (hasCompletedCart) {
		throw createError({
			statusCode: 400,
			statusMessage: 'No se puede eliminar una cita que ya tiene una factura o venta cobrada',
		})
	}

	await deps.bookings.delete(id)
	return { success: true }
}

