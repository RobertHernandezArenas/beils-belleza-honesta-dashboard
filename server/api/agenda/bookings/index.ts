

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

		try {
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
				const firstAdmin = await prisma.user.findFirst({
					where: { role: 'ADMIN', status: 'ON' },
					orderBy: { created_at: 'asc' }
				})
				if (firstAdmin) {
					staffId = firstAdmin.user_id
				}
			}

			// Validate and normalize Date (ensure it's just the date part for overlap check)
			const bookingDate = new Date(body.booking_date)
			if (isNaN(bookingDate.getTime())) {
				throw createError({ statusCode: 400, statusMessage: 'Fecha de cita inválida' })
			}
			bookingDate.setHours(0, 0, 0, 0)

			// Calculate total duration from items
			const totalDuration = body.items.reduce((acc: number, item: any) => acc + (Number(item.duration) || 0), 0)

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

			// --- VALIDATION: OVERLAP CHECK ---
			if (staffId && staffId !== '') {
				const overlappingLabel = await prisma.booking.findFirst({
					where: {
						booking_date: bookingDate,
						status: { notIn: ['CANCELADA', 'AUSENTE', 'cancelled', 'no_show'] },
						staff_id: staffId,
						start_time: { lt: endTime },
						end_time: { gt: startTime }
					}
				})

				if (overlappingLabel) {
					throw createError({
						statusCode: 409,
						statusMessage: `Conflicto de Agenda: El profesional ya tiene una cita de ${overlappingLabel.start_time} a ${overlappingLabel.end_time}`
					})
				}
			}

			// Create the booking
			const booking = await prisma.booking.create({
				data: {
					client_id: body.client_id,
					staff_id: staffId && staffId !== '' ? staffId : null,
					status: (body.status || 'PENDIENTE').toUpperCase(),
					booking_date: bookingDate,
					start_time: startTime,
					end_time: endTime,
					duration: totalDuration,
					notes: body.notes || '',
					booking_items: {
						create: body.items.map((item: any) => ({
							item_type: item.item_type || 'SERVICE',
							item_id: item.item_id || '',
							name: item.name || 'Servicio',
							duration: Number(item.duration) || 0,
						}))
					},
				},
				include: {
					client: { select: { name: true, surname: true, phone: true, avatar: true } },
					staff: { select: { name: true, surname: true } },
					booking_items: true
				},
			})

			return booking
		} catch (error: any) {
			console.error('[BOOKING_CREATE_ERROR]', error)
			
			// Temporary debug logging to a file since I cannot see the terminal
			try {
				const fs = await import('fs/promises')
				const path = 'C:/Users/VENOM/.gemini/antigravity/brain/0b975e6a-6ea8-4c06-bbfb-de290b70def2/scratch/api_error.log'
				await fs.writeFile(path, JSON.stringify({
					timestamp: new Date().toISOString(),
					error: error.message,
					stack: error.stack,
					body: body,
					prismaCode: error.code,
					prismaMeta: error.meta
				}, null, 2))
			} catch (e) {
				console.error('Failed to write debug log', e)
			}

			// Ensure we return a statusMessage that can be read by the frontend
			const finalMessage = error.data?.statusMessage || error.statusMessage || error.message || 'Error interno del servidor al crear la cita'
			throw createError({
				statusCode: error.statusCode || 500,
				statusMessage: finalMessage
			})
		}
	}
})
