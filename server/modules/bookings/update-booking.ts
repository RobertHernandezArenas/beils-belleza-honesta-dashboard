import { createError } from 'h3'
import type { BookingUpdateInput } from '../../utils/booking-validation'
import type { BookingsRepository } from './ports'

export interface UpdateBookingDeps {
	bookings: BookingsRepository
}

export async function updateBooking(
	deps: UpdateBookingDeps,
	{ id, input }: { id: string; input: BookingUpdateInput },
) {
	const current = await deps.bookings.findById(id)
	if (!current) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })

	if (input.client_id && input.client_id !== current.client_id) {
		const clientExists = await deps.bookings.verifyClientExists(input.client_id)
		if (!clientExists) throw createError({ statusCode: 400, statusMessage: 'El cliente indicado no existe' })
	}

	if (input.staff_id) {
		const staffExists = await deps.bookings.verifyStaffExists(input.staff_id)
		if (!staffExists) throw createError({ statusCode: 400, statusMessage: 'El profesional indicado no existe' })
	}

	const finalDateRaw = input.booking_date ? new Date(input.booking_date) : current.booking_date
	const finalDate = new Date(Date.UTC(finalDateRaw.getUTCFullYear(), finalDateRaw.getUTCMonth(), finalDateRaw.getUTCDate(), 0, 0, 0, 0))
	const finalStart = input.start_time || current.start_time

	// If items are provided, recalculate duration
	const duration = input.items ? input.items.reduce((acc, item) => acc + item.duration, 0) : input.duration
	const finalDuration = duration ?? current.duration

	// Calculate final end_time
	let finalEnd = current.end_time
	let endTime: string | undefined
	if (input.start_time !== undefined || duration !== undefined) {
		const [h = 0, m = 0] = finalStart.split(':').map(Number)
		const dObj = new Date()
		dObj.setHours(h, m + finalDuration, 0)
		finalEnd = `${String(dObj.getHours()).padStart(2, '0')}:${String(dObj.getMinutes()).padStart(2, '0')}`
		endTime = finalEnd
	}

	// Only check overlap if it's not being cancelled
	const finalStatus = input.status || current.status
	if (['CANCELADA', 'AUSENTE', 'cancelled', 'no_show'].includes(finalStatus)) {
		const hasCompletedCart = await deps.bookings.hasCompletedCart(id)
		if (hasCompletedCart) {
			throw createError({
				statusCode: 400,
				statusMessage: 'No se puede cancelar ni marcar ausente una cita que ya tiene una venta o factura cobrada',
			})
		}
	} else {
		const checkStaffId = input.staff_id !== undefined ? input.staff_id : current.staff_id
		if (checkStaffId) {
			const overlapping = await deps.bookings.findOverlapping(finalDate, finalStart, finalEnd, checkStaffId, id)
			if (overlapping) {
				throw createError({
					statusCode: 409,
					statusMessage: `Conflicto: El profesional ya tiene una cita asignada en ese horario (${overlapping.start_time} - ${overlapping.end_time})`,
				})
			}
		}
	}

	return await deps.bookings.update(id, {
		client_id: input.client_id,
		staff_id: input.staff_id,
		status: input.status,
		booking_date: input.booking_date ? new Date(input.booking_date) : undefined,
		start_time: input.start_time,
		duration,
		end_time: endTime,
		notes: input.notes,
		items: input.items,
	})
}

