import { createError } from 'h3'
import type { IncomingLineItem } from '~~/shared/types/line-item'
import type { BookingsRepository, BookingNotifier } from './ports'

export interface CreateBookingDeps {
	bookings: BookingsRepository
	notifier?: BookingNotifier
}

export async function createBooking(deps: CreateBookingDeps, body: any) {
	// Basic validation
	if (!body.client_id || body.client_id === '') {
		throw createError({ statusCode: 400, statusMessage: 'Debes seleccionar un cliente' })
	}
	if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
		throw createError({ statusCode: 400, statusMessage: 'Debes añadir al menos un servicio o producto' })
	}

	// Auto-assign first ADMIN if staff_id is missing or empty
	let staffId = body.staff_id
	if (!staffId || staffId === '') {
		const firstAdminId = await deps.bookings.findFirstAdminId()
		if (firstAdminId) {
			staffId = firstAdminId
		}
	}

	// Parse as UTC date to avoid timezone offset shifts
	const parsedDate = new Date(body.booking_date)
	if (isNaN(parsedDate.getTime())) {
		throw createError({ statusCode: 400, statusMessage: 'Fecha de cita inválida' })
	}
	const bookingDate = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate(), 0, 0, 0, 0))

	// Calculate total duration from items
	const totalDuration = body.items.reduce((acc: number, item: IncomingLineItem) => acc + (Number(item.duration) || 0), 0)

	// Calculate end_time based on start_time and duration
	const startTime = body.start_time
	if (!startTime) {
		throw createError({ statusCode: 400, statusMessage: 'La hora de inicio es obligatoria' })
	}

	const [hours, minutes] = startTime.split(':').map(Number)
	if (isNaN(hours) || isNaN(minutes)) {
		throw createError({ statusCode: 400, statusMessage: 'Formato de hora inválido' })
	}

	const dateObj = new Date()
	dateObj.setHours(hours, minutes + totalDuration, 0)
	const endTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`

	// Validation: overlap check
	if (staffId && staffId !== '') {
		const overlapping = await deps.bookings.findOverlapping(bookingDate, startTime, endTime, staffId)
		if (overlapping) {
			throw createError({
				statusCode: 409,
				statusMessage: `Conflicto de Agenda: El profesional ya tiene una cita de ${overlapping.start_time} a ${overlapping.end_time}`,
			})
		}
	}

	// Create booking
	const booking = await deps.bookings.create({
		client_id: body.client_id,
		staff_id: staffId && staffId !== '' ? staffId : null,
		status: (body.status || 'PENDIENTE').toUpperCase(),
		booking_date: bookingDate,
		start_time: startTime,
		end_time: endTime,
		duration: totalDuration,
		notes: body.notes || '',
		item_type: body.items[0]?.item_type || 'SERVICE',
		item_id: body.items[0]?.item_id || '',
		items: body.items,
	})

	let email = 'skipped'
	if (body.notify_email === true && deps.notifier) {
		email = await deps.notifier.notify(booking)
	}

	return { ...booking, notification: { email } }
}

