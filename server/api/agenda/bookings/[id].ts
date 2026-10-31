import { prisma } from '../../../utils/prisma'
import { toApiError } from '../../../utils/errors'
import { parseBookingUpdate } from '../../../utils/booking-validation'
import { getBooking } from '../../../modules/bookings/get-booking'
import { updateBooking } from '../../../modules/bookings/update-booking'
import { deleteBooking } from '../../../modules/bookings/delete-booking'
import { createPrismaBookingsRepository } from '../../../modules/bookings/prisma-bookings-repository'

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Booking ID is required' })
	}

	const repo = createPrismaBookingsRepository(prisma)

	if (method === 'GET') {
		return await getBooking({ bookings: repo }, { id })
	}

	if (method === 'PUT') {
		const input = parseBookingUpdate(await readBody(event))
		try {
			return await updateBooking({ bookings: repo }, { id, input })
		} catch (rawError) {
			const error = toApiError(rawError)
			console.error('[BOOKING_UPDATE_ERROR]', error)
			throw createError({
				statusCode: error.statusCode || 500,
				statusMessage: error.statusMessage || 'Error interno al actualizar la cita',
			})
		}
	}

	if (method === 'DELETE') {
		return await deleteBooking({ bookings: repo }, { id })
	}
})
