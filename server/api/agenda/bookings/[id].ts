

export default defineEventHandler(async event => {
	const method = event.node.req.method
	const id = getRouterParam(event, 'id')

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Booking ID is required' })
	}

	if (method === 'GET') {
		const booking = await prisma.booking.findUnique({
			where: { booking_id: id },
			include: {
				client: { select: { name: true, surname: true, email: true, phone: true } },
				staff: { select: { name: true, surname: true } },
			},
		})

		if (!booking) {
			throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
		}

		return booking
	}

	if (method === 'PUT') {
		const body = await readBody(event)
		const payload: any = { ...body }

		delete payload.booking_id
		delete payload.created_at
		delete payload.updated_at

		if (payload.booking_date) {
			payload.booking_date = new Date(payload.booking_date)
		}

		// Recalculate end_time if start_time or duration changed
		if (payload.start_time && payload.duration) {
			const [hours, minutes] = payload.start_time.split(':').map(Number)
			const dateObj = new Date()
			dateObj.setHours(hours, minutes + Number(payload.duration), 0)
			payload.end_time = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`
		}

		const updatedBooking = await prisma.booking.update({
			where: { booking_id: id },
			data: payload,
			include: {
				client: { select: { name: true, surname: true, phone: true } },
				staff: { select: { name: true, surname: true } },
			},
		})

		return updatedBooking
	}

	if (method === 'DELETE') {
		await prisma.booking.delete({ where: { booking_id: id } })
		return { success: true }
	}
})
