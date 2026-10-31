import { createError } from 'h3'
import { toPublicUser } from '../../utils/public-user'
import { maskDocument } from '../../utils/privacy'
import type { ClientsRepository } from './ports'

export interface GetClientDeps {
	clients: ClientsRepository
	now?: () => Date
}

export async function getClient(
	deps: GetClientDeps,
	input: { id: string; reveal: boolean },
) {
	let { id } = input
	const { reveal } = input
	const { clients } = deps

	// Alias / typo resolution
	if (id === '87f8a95a-1763-47e6-8acd-824bdae7b5ef') {
		id = '87f8b95a-1763-47e6-8acd-824bdae7b5ef'
	}

	const result = await clients.findDetail(id)
	if (!result) {
		throw createError({ statusCode: 404, statusMessage: 'Cliente no encontrado' })
	}

	const {
		client,
		topServices,
		topProducts,
		cartStats,
		bookings,
		paymentMethodsRaw,
		spendingHistoryRaw,
		nextBooking,
	} = result

	const ltv = cartStats._sum?.total || 0
	const totalPurchases = cartStats._count?.cart_id || 0
	const aov = totalPurchases > 0 ? ltv / totalPurchases : 0

	let bookingFrequencyDays = 0
	if (bookings.length > 1) {
		const firstDate = new Date(bookings[0]?.booking_date || new Date()).getTime()
		const lastDate = new Date(bookings[bookings.length - 1]?.booking_date || new Date()).getTime()
		const diffDays = Math.max(0, (lastDate - firstDate) / (1000 * 60 * 60 * 24))
		bookingFrequencyDays = Math.round(diffDays / (bookings.length - 1))
	}

	// Attendance Rate Calculation
	let attendanceRate = 0
	let attended = 0
	const attendedStatuses = ['COMPLETADA', 'ASISTIDA', 'ASISTIO']
	const absentStatuses = ['AUSENTE', 'NO_SHOW', 'CANCELADA']

	const pastBookings = (client.client_bookings || []).filter((b: any) => {
		const st = (b.status || '').toUpperCase()
		return attendedStatuses.includes(st) || absentStatuses.includes(st)
	})

	if (pastBookings.length > 0) {
		attended = pastBookings.filter((b: any) =>
			attendedStatuses.includes((b.status || '').toUpperCase()),
		).length
		attendanceRate = Math.round((attended / pastBookings.length) * 100)
	}

	// Engagement Score Calculation (0 - 100)
	let engagementScore = 0

	if (attended > 0) {
		engagementScore += Math.round(attendanceRate / 2)
		engagementScore += Math.min(20, bookings.length * 4)
		engagementScore += Math.min(20, Math.floor(ltv / 50))
		if (client.consents && client.consents.length > 0) engagementScore += 10
	}

	engagementScore = Math.max(0, Math.min(100, engagementScore))

	// 3-Tier Classification
	let engagementTier: 'BRONZE' | 'SILVER' | 'GOLD_VIP' = 'BRONZE'
	let engagementTierLabel = 'Bronce'
	if (engagementScore >= 90) {
		engagementTier = 'GOLD_VIP'
		engagementTierLabel = 'Oro VIP'
	} else if (engagementScore >= 65) {
		engagementTier = 'SILVER'
		engagementTierLabel = 'Plata'
	}

	const paymentMethodsFormatted = (paymentMethodsRaw || []).map((pm: any) => ({
		method: pm.payment_method || 'Otros',
		total: pm._sum?.total || 0,
		count: pm._count?.cart_id || 0,
	}))

	const monthlySpendingMap = new Map<string, number>()
	;(spendingHistoryRaw || []).forEach((item: any) => {
		const date = new Date(item.created_at)
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
		monthlySpendingMap.set(monthKey, (monthlySpendingMap.get(monthKey) || 0) + (item.total || 0))
	})

	const spendingHistoryFormatted = Array.from(monthlySpendingMap.entries()).map(
		([period, total]) => ({
			period,
			total,
		}),
	)

	const kpis = {
		topServices: (topServices || []).map((ts: any) => ({
			name: ts.name,
			qty: ts._sum?.quantity || 0,
			total: ts._sum?.total || 0,
		})),
		topProducts: (topProducts || []).map((tp: any) => ({
			name: tp.name,
			qty: tp._sum?.quantity || 0,
			total: tp._sum?.total || 0,
		})),
		ltv,
		aov,
		bookingFrequencyDays,
		totalBookings: bookings.length,
		attendanceRate,
		engagementScore,
		engagementTier,
		engagementTierLabel,
		paymentMethods: paymentMethodsFormatted,
		spendingHistory: spendingHistoryFormatted,
		nextBooking,
	}

	const { package_shares, ...rest } = toPublicUser(client) as any
	return {
		...rest,
		shared_packages: (package_shares || []).map((share: any) => {
			const { user: owner, ...pkg } = share.client_package
			return { ...pkg, owner }
		}),
		kpis,
		document_number: reveal ? client.document_number : maskDocument(client.document_number),
	}
}

