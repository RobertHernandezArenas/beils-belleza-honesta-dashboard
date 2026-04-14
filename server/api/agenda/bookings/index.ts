

export default defineEventHandler(async event => {
	const method = event.node.req.method

	if (method === 'GET') {
		const query = getQuery(event)
		const start = query.start as string | undefined
		const end = query.end as string | undefined
		const staff_id = query.staff_id as string | undefined
		const client_id = query.client_id as string | undefined
		const search = query.search as string | undefined

		const whereClause: any = {}

		if (search) {
			const s = search.toLowerCase()
			whereClause.OR = [
				{ client: { name: { contains: search } } },
				{ client: { surname: { contains: search } } },
				{ client: { phone: { contains: search } } },
				{ staff: { name: { contains: search } } },
				{ notes: { contains: search } }
			]
		} else if (start && end) {
			whereClause.booking_date = {
				gte: new Date(start),
				lte: new Date(end),
			}
		}

		if (staff_id) whereClause.staff_id = staff_id
		if (client_id) whereClause.client_id = client_id

		const bookings = await prisma.booking.findMany({
			where: whereClause,
			select: {
				booking_id: true,
				booking_date: true,
				start_time: true,
				end_time: true,
				status: true,
				booking_items: {
					select: {
						item_type: true,
						item_id: true,
						name: true,
						duration: true,
					}
				},
				duration: true,
				notes: true,
				client_id: true,
				client: { select: { name: true, surname: true, phone: true, avatar: true } },
				staff: { select: { name: true, surname: true } },
			},
			orderBy: [{ booking_date: 'asc' }, { start_time: 'asc' }],
		})

		return bookings
	}

	if (method === 'POST') {
		const body = await readBody(event)

		// Auto-assign first ADMIN if staff_id is missing
		if (!body.staff_id) {
			const firstAdmin = await prisma.user.findFirst({
				where: { role: 'ADMIN', status: 'ON' },
				orderBy: { created_at: 'asc' }
			})
			if (firstAdmin) {
				body.staff_id = firstAdmin.user_id
			}
		}

		// Calculate total duration from items if provided, otherwise use explicit duration
		let totalDuration = 0
		if (body.items && Array.isArray(body.items)) {
			totalDuration = body.items.reduce((acc: number, item: any) => acc + (Number(item.duration) || 0), 0)
		} else {
			totalDuration = Number(body.duration || 0)
		}

		// Calculating end_time based on start_time and duration
		let endTime = body.end_time
		if (!endTime && body.start_time) {
			const [hours, minutes] = body.start_time.split(':').map(Number)
			const dateObj = new Date()
			dateObj.setHours(hours, minutes + totalDuration, 0)
			endTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`
		}

		// --- VALIDATION: OVERLAP CHECK ---
		const bookingDate = new Date(body.booking_date)
		if (bookingDate.toString() === 'Invalid Date') {
			throw createError({ statusCode: 400, statusMessage: 'Fecha de cita inválida' })
		}
		const startTime = body.start_time
		const overlapping = await prisma.booking.findFirst({
			where: {
				booking_date: bookingDate,
				status: { notIn: ['CANCELADA', 'AUSENTE', 'cancelled', 'no_show'] },
				staff_id: body.staff_id, // Check overlap per professional
				// Overlap logic: (s1 < e2) AND (e1 > s2)
				start_time: { lt: endTime },
				end_time: { gt: startTime }
			}
		})

		if (overlapping) {
			throw createError({
				statusCode: 409,
				statusMessage: `Conflicto: ${overlapping.staff_id === body.staff_id ? 'El profesional' : 'Este horario'} ya tiene una cita (${overlapping.start_time} - ${overlapping.end_time})`
			})
		}
		// --- END VALIDATION ---

		const booking = await prisma.booking.create({
			data: {
				client_id: body.client_id,
				staff_id: body.staff_id && body.staff_id !== '' ? body.staff_id : null,
				booking_items: {
					create: body.items?.map((item: any) => ({
						item_type: item.item_type,
						item_id: item.item_id,
						name: item.name,
						duration: Number(item.duration) || 0,
					})) || []
				},
				status: (body.status || 'PENDIENTE').toUpperCase(),
				booking_date: new Date(body.booking_date),
				start_time: body.start_time,
				end_time: endTime || '23:59',
				duration: totalDuration,
				notes: body.notes,
			},
			include: {
				client: { select: { name: true, surname: true, phone: true, avatar: true } },
				staff: { select: { name: true, surname: true } },
				booking_items: true
			},
		})

		return booking
	}
})
