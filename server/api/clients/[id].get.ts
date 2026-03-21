import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/auth'
import { maskDocument } from '../../utils/privacy'

export default defineEventHandler(async event => {
	try {
		requireAdmin(event)
		const query = getQuery(event)
		const reveal = query.reveal === 'true'

		const id = getRouterParam(event, 'id')
		if (!id) {
			throw createError({ statusCode: 400, statusMessage: 'ID requerido' })
		}

		const client = await prisma.user.findUnique({
			where: { user_id: id, role: 'CLIENT' },
			include: {
				consents: true,
				questionnaires: true,
				revokes: true,
				client_bookings: {
					orderBy: { booking_date: 'desc' },
				},
				carts: {
					where: { status: 'completed' },
					orderBy: { created_at: 'desc' },
					include: { items: true }
				},
				debts: {
					where: { status: { in: ['pending', 'partial'] } },
					include: {
						cart: {
							include: { items: true }
						},
						payments: {
							orderBy: { payment_date: 'desc' }
						}
					}
				},
			},
		})

		if (!client) {
			throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
		}

		// KPI Calculation
		const topServices = await prisma.cartItem.groupBy({
			by: ['name'],
			where: { cart: { user_id: id, status: 'completed' }, item_type: 'service' },
			_sum: { quantity: true, total: true },
			orderBy: { _sum: { quantity: 'desc' } },
			take: 3
		})

		const topProducts = await prisma.cartItem.groupBy({
			by: ['name'],
			where: { cart: { user_id: id, status: 'completed' }, item_type: 'product' },
			_sum: { quantity: true, total: true },
			orderBy: { _sum: { quantity: 'desc' } },
			take: 3
		})

		const cartStats = await prisma.cart.aggregate({
			where: { user_id: id, status: 'completed' },
			_sum: { total: true },
			_count: { cart_id: true }
		})
		const ltv = cartStats._sum.total || 0
		const totalPurchases = cartStats._count.cart_id || 0
		const aov = totalPurchases > 0 ? ltv / totalPurchases : 0

		const bookings = await prisma.booking.findMany({
			where: { client_id: id },
			orderBy: { booking_date: 'asc' },
			select: { booking_date: true }
		})
		let bookingFrequencyDays = 0
		if (bookings.length > 1) {
			const firstDate = new Date(bookings[0]?.booking_date || new Date()).getTime()
			const lastDate = new Date(bookings[bookings.length - 1]?.booking_date || new Date()).getTime()
			const diffDays = Math.max(0, (lastDate - firstDate) / (1000 * 60 * 60 * 24))
			bookingFrequencyDays = Math.round(diffDays / (bookings.length - 1))
		}

		const kpis = {
			topServices: topServices.map(ts => ({ name: ts.name, qty: ts._sum.quantity || 0, total: ts._sum.total || 0 })),
			topProducts: topProducts.map(tp => ({ name: tp.name, qty: tp._sum.quantity || 0, total: tp._sum.total || 0 })),
			ltv,
			aov,
			bookingFrequencyDays,
			totalBookings: bookings.length
		}

		// Remove password from response and mask document number if not revealed
		const { password, ...rest } = client
		return {
			...rest,
			kpis,
			document_number: reveal ? client.document_number : maskDocument(client.document_number),
		}
	} catch (error: any) {
		if (error.statusCode) throw error
		throw createError({
			statusCode: 500,
			statusMessage: 'Error al obtener el cliente',
		})
	}
})
