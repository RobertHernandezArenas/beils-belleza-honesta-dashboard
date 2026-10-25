import { parseBookingUpdate } from '../../../utils/booking-validation'


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
				client: { select: { user_id: true, name: true, surname: true, email: true, phone: true, avatar: true } },
				staff: { select: { name: true, surname: true } },
				booking_items: true,
				carts: {
					select: {
						cart_id: true,
						status: true,
						invoice_number: true,
						total: true,
					},
				},
			},
		})

		if (!booking) {
			throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
		}

		const hasCompletedCart = booking.carts && booking.carts.some(c => c.status === 'completed' || !!c.invoice_number)
		return {
			...booking,
			status: hasCompletedCart ? 'COMPLETADA' : booking.status,
		}
	}

	if (method === 'PUT') {
		// Allow-listed, validated fields only (client, professional, status, date, time, duration, notes, items)
		const input = parseBookingUpdate(await readBody(event))

		try {
			// --- VALIDATION: OVERLAP CHECK ---
			const current = await prisma.booking.findUnique({ where: { booking_id: id } })
			if (!current) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })

			if (input.client_id && input.client_id !== current.client_id) {
				const client = await prisma.user.findFirst({ where: { user_id: input.client_id, role: 'CLIENT' }, select: { user_id: true } })
				if (!client) throw createError({ statusCode: 400, statusMessage: 'El cliente indicado no existe' })
			}
			if (input.staff_id) {
				const staff = await prisma.user.findFirst({ where: { user_id: input.staff_id, role: { in: ['ADMIN', 'STAFF'] } }, select: { user_id: true } })
				if (!staff) throw createError({ statusCode: 400, statusMessage: 'El profesional indicado no existe' })
			}

			const finalDateRaw = input.booking_date ? new Date(input.booking_date) : current.booking_date
			const finalDate = new Date(Date.UTC(finalDateRaw.getUTCFullYear(), finalDateRaw.getUTCMonth(), finalDateRaw.getUTCDate(), 0, 0, 0, 0))
			const finalStart = input.start_time || current.start_time

			// If items are provided, recalculate duration
			const duration = input.items ? input.items.reduce((acc, item) => acc + item.duration, 0) : input.duration
			const finalDuration = duration ?? current.duration

			// Calculate final end_time
			let finalEnd = current.end_time
			let endTime: string | undefined
			if (input.start_time !== undefined || duration !== undefined) {
				const [h = 0, m = 0] = finalStart.split(':').map(Number)
				const dObj = new Date()
				dObj.setHours(h, m + finalDuration, 0)
				finalEnd = `${String(dObj.getHours()).padStart(2, '0')}:${String(dObj.getMinutes()).padStart(2, '0')}`
				endTime = finalEnd
			}

			// Only check overlap if it's not being cancelled
			const finalStatus = input.status || current.status
			if (['CANCELADA', 'AUSENTE', 'cancelled', 'no_show'].includes(finalStatus)) {
				const hasCompletedCart = await prisma.cart.findFirst({
					where: { booking_id: id, status: 'completed' },
				})
				if (hasCompletedCart) {
					throw createError({
						statusCode: 400,
						statusMessage: 'No se puede cancelar ni marcar ausente una cita que ya tiene una venta o factura cobrada',
					})
				}
			} else {
				// staff_id: undefined = unchanged, null = unassigned
				const checkStaffId = input.staff_id !== undefined ? input.staff_id : current.staff_id

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

			const updatedBooking = await prisma.booking.update({
				where: { booking_id: id },
				data: {
					client_id: input.client_id,
					staff_id: input.staff_id,
					status: input.status,
					booking_date: input.booking_date ? new Date(input.booking_date) : undefined,
					start_time: input.start_time,
					duration,
					end_time: endTime,
					notes: input.notes,
					booking_items: input.items ? {
						deleteMany: {},
						create: input.items.map(item => ({
							item_type: item.item_type,
							item_id: item.item_id,
							name: item.name,
							duration: item.duration,
						}))
					} : undefined
				},
				include: {
					client: { select: { user_id: true, name: true, surname: true, phone: true, avatar: true } },
					staff: { select: { name: true, surname: true } },
					booking_items: true
				},
			})

			return updatedBooking
		} catch (rawError) {
			const error = toApiError(rawError)
			console.error('[BOOKING_UPDATE_ERROR]', error)
			throw createError({
				statusCode: error.statusCode || 500,
				statusMessage: error.statusMessage || 'Error interno al actualizar la cita'
			})
		}
	}

	if (method === 'DELETE') {
		const hasCompletedCart = await prisma.cart.findFirst({
			where: { booking_id: id, status: 'completed' },
		})
		if (hasCompletedCart) {
			throw createError({
				statusCode: 400,
				statusMessage: 'No se puede eliminar una cita que ya tiene una factura o venta cobrada',
			})
		}
		await prisma.booking.delete({ where: { booking_id: id } })
		return { success: true }
	}
})
