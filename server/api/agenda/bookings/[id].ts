

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
				booking_items: true,
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

		if (payload.status) payload.status = payload.status.toUpperCase()

		try {
			// --- VALIDATION: OVERLAP CHECK ---
			const current = await prisma.booking.findUnique({ where: { booking_id: id } })
			if (!current) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })

			const finalDateRaw = payload.booking_date ? new Date(payload.booking_date) : current.booking_date
			if (finalDateRaw.toString() === 'Invalid Date') {
				throw createError({ statusCode: 400, statusMessage: 'Fecha de cita inválida' })
			}
			const finalDate = finalDateRaw
			const finalStart = payload.start_time || current.start_time
			
			// If items are provided, recalculate duration
			if (payload.items && Array.isArray(payload.items)) {
				payload.duration = payload.items.reduce((acc: number, item: any) => acc + (Number(item.duration) || 0), 0)
			}
			
			const finalDuration = payload.duration !== undefined ? Number(payload.duration) : current.duration
			
			// Calculate final end_time
			let finalEnd = current.end_time
			if (payload.start_time !== undefined || payload.duration !== undefined || payload.items !== undefined) {
				const [h, m] = finalStart.split(':').map(Number)
				const dObj = new Date()
				dObj.setHours(h, m + finalDuration, 0)
				finalEnd = `${String(dObj.getHours()).padStart(2, '0')}:${String(dObj.getMinutes()).padStart(2, '0')}`
				payload.end_time = finalEnd
			}

			// Only check overlap if it's not being cancelled
			const finalStatus = payload.status || current.status
			if (!['CANCELADA', 'AUSENTE', 'cancelled', 'no_show'].includes(finalStatus)) {
				// Normalize staff_id for check
				let checkStaffId = current.staff_id
				if (payload.staff_id !== undefined) {
					checkStaffId = (payload.staff_id === '' || payload.staff_id === null) ? null : payload.staff_id
				}

				if (checkStaffId) {
					const overlapping = await prisma.booking.findFirst({
						where: {
							booking_date: finalDate,
							booking_id: { not: id },
							status: { notIn: ['CANCELADA', 'AUSENTE', 'cancelled', 'no_show'] },
							staff_id: checkStaffId,
							start_time: { lt: finalEnd },
							end_time: { gt: finalStart }
						}
					})

					if (overlapping) {
						throw createError({
							statusCode: 409,
							statusMessage: `Conflicto: El profesional ya tiene una cita asignada en ese horario (${overlapping.start_time} - ${overlapping.end_time})`
						})
					}
				}
			}
			// --- END VALIDATION ---

			const items = payload.items
			delete payload.items

			// Normalize staff_id for update
			const staffIdValue = payload.staff_id && payload.staff_id !== '' ? payload.staff_id : (payload.staff_id === '' ? null : undefined)
			delete payload.staff_id

			const updatedBooking = await prisma.booking.update({
				where: { booking_id: id },
				data: {
					...payload,
					booking_date: payload.booking_date ? new Date(payload.booking_date) : undefined,
					staff_id: staffIdValue,
					booking_items: items ? {
						deleteMany: {},
						create: items.map((item: any) => ({
							item_type: item.item_type,
							item_id: item.item_id,
							name: item.name,
							duration: Number(item.duration) || 0,
						}))
					} : undefined
				},
				include: {
					client: { select: { name: true, surname: true, phone: true } },
					staff: { select: { name: true, surname: true } },
					booking_items: true
				},
			})

			return updatedBooking
		} catch (error: any) {
			console.error('[BOOKING_UPDATE_ERROR]', error)
			throw createError({
				statusCode: error.statusCode || 500,
				statusMessage: error.statusMessage || 'Error interno al actualizar la cita'
			})
		}
	}

	if (method === 'DELETE') {
		await prisma.booking.delete({ where: { booking_id: id } })
		return { success: true }
	}
})
