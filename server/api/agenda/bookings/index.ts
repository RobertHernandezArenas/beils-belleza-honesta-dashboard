

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
				item_type: true,
				item_id: true,
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

		// In a real scenario, you'd fetch the item (service/pack) to get its duration automatically
		// Here we assume duration is passed, or we default to 60 min if missing for simplicity
		// Calculating end_time based on start_time and duration

		let endTime = body.end_time
		if (!endTime && body.start_time && body.duration) {
			const [hours, minutes] = body.start_time.split(':').map(Number)
			const dateObj = new Date()
			dateObj.setHours(hours, minutes + Number(body.duration), 0)
			endTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`
		}

		const booking = await prisma.booking.create({
			data: {
				client_id: body.client_id,
				staff_id: body.staff_id || null, // Optional assignment
				item_type: body.item_type,
				item_id: body.item_id,
				status: body.status || 'pending',
				booking_date: new Date(body.booking_date),
				start_time: body.start_time,
				end_time: endTime || '23:59',
				duration: Number(body.duration) || 60,
				notes: body.notes,
			},
			include: {
				client: { select: { name: true, surname: true, phone: true, avatar: true } },
				staff: { select: { name: true, surname: true } },
			},
		})

		return booking
	}
})
