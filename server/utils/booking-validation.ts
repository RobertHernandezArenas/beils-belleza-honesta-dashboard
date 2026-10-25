import { z } from 'zod'
import { parseOrBadRequest } from './validation'

/** Booking update body: only the fields the booking drawer / status change send (no mass assignment). */

export const BOOKING_STATUSES = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA', 'AUSENTE'] as const

const minutes = z.number().int('La duración debe ser un número entero').min(0, 'La duración no puede ser negativa').max(24 * 60)

const bookingItem = z.object({
	item_type: z.string().trim().min(1).max(50),
	item_id: z.string().min(1).max(100),
	name: z.string().trim().min(1).max(150),
	duration: minutes.default(0),
})

const bookingUpdate = z.object({
	client_id: z.string().min(1).max(100).optional(),
	// '' or null = unassigned professional
	staff_id: z
		.union([z.string().max(100), z.null()])
		.optional()
		.transform(v => (v === '' ? null : v)),
	status: z
		.string()
		.transform(v => v.trim().toUpperCase())
		.pipe(z.enum(BOOKING_STATUSES, { message: 'Estado de cita no válido' }))
		.optional(),
	booking_date: z
		.string()
		.refine(v => !Number.isNaN(Date.parse(v)), 'Fecha de cita inválida')
		.optional(),
	start_time: z
		.string()
		.regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora de inicio inválida (HH:MM)')
		.optional(),
	duration: minutes.optional(),
	notes: z.string().max(2000).nullish(),
	items: z.array(bookingItem).max(50).optional(),
})

export type BookingUpdateInput = z.infer<typeof bookingUpdate>

export function parseBookingUpdate(body: unknown): BookingUpdateInput {
	const data = parseOrBadRequest(bookingUpdate, body)
	// Only keep keys that were actually sent, so an update never touches other columns
	return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as BookingUpdateInput
}
