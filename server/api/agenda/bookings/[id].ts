

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

		// --- VALIDATION: OVERLAP CHECK ---
		const current = await prisma.booking.findUnique({ where: { booking_id: id } })
		if (!current) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })

		const finalDate = payload.booking_date ? new Date(payload.booking_date) : current.booking_date
		const finalStart = payload.start_time || current.start_time
		const finalDuration = payload.duration !== undefined ? Number(payload.duration) : current.duration
		
		// Calculate final end_time
		let finalEnd = current.end_time
		if (payload.start_time !== undefined || payload.duration !== undefined) {
			const [h, m] = finalStart.split(':').map(Number)
			const dObj = new Date()
			dObj.setHours(h, m + finalDuration, 0)
			finalEnd = `${String(dObj.getHours()).padStart(2, '0')}:${String(dObj.getMinutes()).padStart(2, '0')}`
			payload.end_time = finalEnd
		}

		// Only check overlap if it's not being cancelled
		const finalStatus = payload.status || current.status
		if (!['cancelled', 'no_show'].includes(finalStatus)) {
			const overlapping = await prisma.booking.findFirst({
				where: {
					booking_date: finalDate,
					booking_id: { not: id },
					status: { notIn: ['cancelled', 'no_show'] },
					start_time: { lt: finalEnd },
					end_time: { gt: finalStart }
				}
			})

			if (overlapping) {
				throw createError({
					statusCode: 409,
					statusMessage: `Conflicto de horario: Ya existe otra cita (${overlapping.start_time} - ${overlapping.end_time})`
				})
			}
		}
		// --- END VALIDATION ---

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
