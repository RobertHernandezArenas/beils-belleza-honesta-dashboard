import { toApiError } from '../../../utils/errors'
import { sendBookingConfirmation, type EmailNotificationStatus } from '../../../utils/booking-email'
import { getMailConfig, isMailConfigured, sendMail } from '../../../utils/mailer'
import { listBookings } from '../../../modules/bookings/list-bookings'
import { createBooking } from '../../../modules/bookings/create-booking'
import { createPrismaBookingsRepository } from '../../../modules/bookings/prisma-bookings-repository'
import type { BookingsRepository } from '../../../modules/bookings/ports'

interface CreatedBooking {
	client_id: string
	booking_date: Date
	start_time: string
	duration: number
	staff: { name: string; surname: string | null } | null
	booking_items: { name: string }[]
}

async function notifyBookingByEmail(repo: BookingsRepository, booking: CreatedBooking): Promise<EmailNotificationStatus> {
	try {
		const config = useRuntimeConfig()
		const mailConfigured = isMailConfigured(getMailConfig())
		const recipient = mailConfigured
			? await repo.findRecipient(booking.client_id)
			: null
		const professional = booking.staff ? `${booking.staff.name} ${booking.staff.surname || ''}`.trim() : null

		return await sendBookingConfirmation({
			requested: true,
			mailConfigured,
			recipient,
			send: sendMail,
			content: {
				salon: { name: config.salonName, address: config.salonAddress, phone: config.salonPhone },
				clientName: recipient?.name || '',
				bookingDate: booking.booking_date,
				startTime: booking.start_time,
				duration: booking.duration,
				services: booking.booking_items.map(item => item.name),
				professional,
			},
		})
	} catch {
		console.error('[BOOKING_EMAIL_ERROR] Could not prepare the confirmation email')
		return 'failed'
	}
}

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const repo = createPrismaBookingsRepository(prisma)

	if (method === 'GET') {
		const query = getQuery(event)
		const start = query.start as string | undefined
		const end = query.end as string | undefined
		const staff_id = query.staff_id as string | undefined
		const client_id = query.client_id as string | undefined
		const search = query.search as string | undefined

		return await listBookings({ bookings: repo }, { start, end, staff_id, client_id, search })
	}

	if (method === 'POST') {
		const body = await readBody(event)
		try {
			return await createBooking(
				{ bookings: repo, notifier: { notify: booking => notifyBookingByEmail(repo, booking) } },
				body,
			)
		} catch (rawError) {
			const error = toApiError(rawError)
			console.error('[BOOKING_CREATE_ERROR]', error)
			const finalMessage =
				error.data?.statusMessage || error.statusMessage || error.message || 'Error interno del servidor al crear la cita'
			throw createError({
				statusCode: error.statusCode || 500,
				statusMessage: finalMessage,
			})
		}
	}
})
