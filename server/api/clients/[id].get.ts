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
					where: { status: { in: ['completed', 'pending'] } },
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

		// KPI Calculation in Parallel
		const [topServices, topProducts, cartStats, bookings, paymentMethodsRaw, spendingHistoryRaw, nextBooking] = await Promise.all([
			prisma.cartItem.groupBy({
				by: ['name'],
				where: { cart: { user_id: id, status: 'completed' }, item_type: 'service' },
				_sum: { quantity: true, total: true },
				orderBy: { _sum: { quantity: 'desc' } },
				take: 3
			}),
			prisma.cartItem.groupBy({
				by: ['name'],
				where: { cart: { user_id: id, status: 'completed' }, item_type: 'product' },
				_sum: { quantity: true, total: true },
				orderBy: { _sum: { quantity: 'desc' } },
				take: 3
			}),
			prisma.cart.aggregate({
				where: { user_id: id, status: 'completed' },
				_sum: { total: true },
				_count: { cart_id: true }
			}),
			prisma.booking.findMany({
				where: { client_id: id },
				orderBy: { booking_date: 'asc' },
				select: { booking_date: true, status: true }
			}),
			prisma.cart.groupBy({
				by: ['payment_method'],
				where: { user_id: id, status: 'completed' },
				_sum: { total: true },
				_count: { cart_id: true }
			}),
			prisma.cart.findMany({
				where: { user_id: id, status: 'completed' },
				orderBy: { created_at: 'asc' },
				select: { created_at: true, total: true, payment_method: true }
			}),
			prisma.booking.findFirst({
				where: {
					client_id: id,
					status: { in: ['PENDIENTE', 'CONFIRMADA'] },
					booking_date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
				},
				orderBy: [{ booking_date: 'asc' }, { start_time: 'asc' }],
				include: {
					booking_items: true,
					staff: { select: { name: true, surname: true } }
				}
			})
		])

		const ltv = cartStats._sum.total || 0
		const totalPurchases = cartStats._count.cart_id || 0
		const aov = totalPurchases > 0 ? ltv / totalPurchases : 0

		let bookingFrequencyDays = 0
		if (bookings.length > 1) {
			const firstDate = new Date(bookings[0]?.booking_date || new Date()).getTime()
			const lastDate = new Date(bookings[bookings.length - 1]?.booking_date || new Date()).getTime()
			const diffDays = Math.max(0, (lastDate - firstDate) / (1000 * 60 * 60 * 24))
			bookingFrequencyDays = Math.round(diffDays / (bookings.length - 1))
		}

		// Engagement Score Calculation (0 - 100)
		let engagementScore = 50 // Base score
		engagementScore += Math.min(25, bookings.length * 5) // Frequency
		engagementScore += Math.min(25, Math.floor(ltv / 30)) // Spending
		if (client.consents.length >= 2) engagementScore += 10 // Compliance
		
		const hasRecent = client.client_bookings.some(b => {
			const d = new Date(b.booking_date)
			const diff = (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
			return diff < 30
		})
		if (hasRecent) engagementScore += 10
		
		const noShows = client.client_bookings.filter(b => b.status === 'no_show' || b.status === 'AUSENTE').length
		engagementScore -= (noShows * 15)
		engagementScore = Math.max(0, Math.min(100, engagementScore))

		// 3-Tier Client Category Classification (Bronce, Plata, Oro VIP)
		let engagementTier: 'BRONZE' | 'SILVER' | 'GOLD_VIP' = 'BRONZE'
		let engagementTierLabel = 'Bronce'
		if (engagementScore >= 71) {
			engagementTier = 'GOLD_VIP'
			engagementTierLabel = 'Oro VIP'
		} else if (engagementScore >= 36) {
			engagementTier = 'SILVER'
			engagementTierLabel = 'Plata'
		}

		// Formatting Payment Methods Chart Data
		const paymentMethodsFormatted = paymentMethodsRaw.map(pm => ({
			method: pm.payment_method || 'Otros',
			total: pm._sum.total || 0,
			count: pm._count.cart_id || 0
		}))

		// Formatting Monthly Spending History
		const monthlySpendingMap = new Map<string, number>()
		spendingHistoryRaw.forEach(item => {
			const date = new Date(item.created_at)
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
			monthlySpendingMap.set(monthKey, (monthlySpendingMap.get(monthKey) || 0) + (item.total || 0))
		})

		const spendingHistoryFormatted = Array.from(monthlySpendingMap.entries()).map(([period, total]) => ({
			period,
			total
		}))

		const kpis = {
			topServices: topServices.map(ts => ({ name: ts.name, qty: ts._sum.quantity || 0, total: ts._sum.total || 0 })),
			topProducts: topProducts.map(tp => ({ name: tp.name, qty: tp._sum.quantity || 0, total: tp._sum.total || 0 })),
			ltv,
			aov,
			bookingFrequencyDays,
			totalBookings: bookings.length,
			engagementScore,
			engagementTier,
			engagementTierLabel,
			paymentMethods: paymentMethodsFormatted,
			spendingHistory: spendingHistoryFormatted,
			nextBooking
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
