export default defineEventHandler(async (event) => {
	const query = getQuery(event)
	const range = (query.range as string) || '6m'

	const now = new Date()
	let startDate: Date | null = null
	let prevStartDate: Date | null = null
	let prevEndDate: Date | null = null
	let granularity: 'day' | 'month' = 'day'

	switch (range) {
		case '7d': {
			startDate = new Date(now)
			startDate.setDate(now.getDate() - 7)
			startDate.setHours(0, 0, 0, 0)
			prevEndDate = new Date(startDate)
			prevStartDate = new Date(startDate)
			prevStartDate.setDate(prevStartDate.getDate() - 7)
			granularity = 'day'
			break
		}
		case '30d': {
			startDate = new Date(now)
			startDate.setDate(now.getDate() - 30)
			startDate.setHours(0, 0, 0, 0)
			prevEndDate = new Date(startDate)
			prevStartDate = new Date(startDate)
			prevStartDate.setDate(prevStartDate.getDate() - 30)
			granularity = 'day'
			break
		}
		case 'month': {
			startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
			prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0)
			prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
			granularity = 'day'
			break
		}
		case '6m': {
			startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0)
			prevStartDate = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0)
			prevEndDate = new Date(now.getFullYear(), now.getMonth() - 5, 0, 23, 59, 59)
			granularity = 'month'
			break
		}
		case 'quarter': {
			const q = Math.floor(now.getMonth() / 3)
			startDate = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0)
			prevStartDate = new Date(now.getFullYear(), (q - 1) * 3, 1, 0, 0, 0)
			prevEndDate = new Date(startDate.getTime() - 1)
			granularity = 'month'
			break
		}
		case 'year': {
			startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
			prevStartDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0)
			prevEndDate = new Date(now.getFullYear(), 0, 0, 23, 59, 59)
			granularity = 'month'
			break
		}
		case 'all':
		default: {
			startDate = null
			prevStartDate = null
			prevEndDate = null
			granularity = 'month'
			break
		}
	}

	// 1. Parallel database queries for maximum performance
	const [
		completedSales,
		prevSales,
		bookings,
		prevBookingsCount,
		newClientsCount,
		prevNewClientsCount,
		totalClientsAllTime,
		totalProductsCount,
		debtsSummary,
		allTimeUsersWithCarts,
	] = await Promise.all([
		// Current period sales with full relations
		prisma.cart.findMany({
			where: {
				status: 'completed',
				...(startDate ? { created_at: { gte: startDate, lte: now } } : {}),
			},
			include: {
				items: true,
				user: {
					select: {
						user_id: true,
						name: true,
						surname: true,
						email: true,
						avatar: true,
						created_at: true,
					},
				},
				booking: {
					select: {
						staff_id: true,
						staff: {
							select: {
								user_id: true,
								name: true,
								surname: true,
							},
						},
					},
				},
			},
			orderBy: { created_at: 'asc' },
		}),

		// Previous period sales (for comparative delta metrics)
		prevStartDate && prevEndDate
			? prisma.cart.findMany({
					where: {
						status: 'completed',
						created_at: { gte: prevStartDate, lte: prevEndDate },
					},
					select: { total: true, discount: true },
				})
			: Promise.resolve([]),

		// Bookings in the selected period
		prisma.booking.findMany({
			where: {
				...(startDate ? { booking_date: { gte: startDate, lte: now } } : {}),
			},
			select: {
				booking_id: true,
				status: true,
				duration: true,
				booking_date: true,
				staff_id: true,
				staff: {
					select: {
						user_id: true,
						name: true,
						surname: true,
					},
				},
			},
		}),

		// Previous bookings count
		prevStartDate && prevEndDate
			? prisma.booking.count({
					where: {
						booking_date: { gte: prevStartDate, lte: prevEndDate },
					},
				})
			: Promise.resolve(0),

		// New clients registered in current period
		prisma.user.count({
			where: {
				role: 'CLIENT',
				...(startDate ? { created_at: { gte: startDate, lte: now } } : {}),
			},
		}),

		// New clients in previous period
		prevStartDate && prevEndDate
			? prisma.user.count({
					where: {
						role: 'CLIENT',
						created_at: { gte: prevStartDate, lte: prevEndDate },
					},
				})
			: Promise.resolve(0),

		// Total clients all-time
		prisma.user.count({ where: { role: 'CLIENT' } }).catch(() => prisma.user.count()),

		// Total catalog products
		prisma.product.count(),

		// Debts created in the period
		prisma.debt.aggregate({
			_sum: { amount: true, remaining: true },
			where: {
				...(startDate ? { created_at: { gte: startDate, lte: now } } : {}),
			},
		}),

		// Clients history for retention analysis
		prisma.cart.findMany({
			where: { status: 'completed' },
			select: { user_id: true, created_at: true },
		}),
	])

	// 2. Financial & Sales Metrics Calculation
	const grossRevenue = completedSales.reduce((sum, sale) => sum + sale.total, 0)
	const totalDiscounts = completedSales.reduce((sum, sale) => sum + (sale.discount || 0), 0)
	const netRevenue = grossRevenue - totalDiscounts
	const totalSales = completedSales.length
	const aov = totalSales > 0 ? grossRevenue / totalSales : 0
	const discountRate = grossRevenue + totalDiscounts > 0 ? (totalDiscounts / (grossRevenue + totalDiscounts)) * 100 : 0

	// Previous period calculations
	const prevGrossRevenue = prevSales.reduce((sum, sale) => sum + sale.total, 0)
	const prevTotalSales = prevSales.length
	const prevAov = prevTotalSales > 0 ? prevGrossRevenue / prevTotalSales : 0

	const calculateDelta = (current: number, prev: number): number | null => {
		if (prev === 0) return current > 0 ? 100 : 0
		return Math.round(((current - prev) / prev) * 1000) / 10
	}

	const revenueDelta = prevStartDate ? calculateDelta(grossRevenue, prevGrossRevenue) : null
	const salesDelta = prevStartDate ? calculateDelta(totalSales, prevTotalSales) : null
	const aovDelta = prevStartDate ? calculateDelta(aov, prevAov) : null
	const newClientsDelta = prevStartDate ? calculateDelta(newClientsCount, prevNewClientsCount) : null
	const bookingsDelta = prevStartDate ? calculateDelta(bookings.length, prevBookingsCount) : null

	// 3. Continuous Timeline Trend (Revenue & Tickets)
	interface TrendPoint {
		key: string
		label: string
		revenue: number
		tickets: number
		aov: number
	}

	const trendMap = new Map<string, TrendPoint>()

	if (granularity === 'day') {
		// Generate all days in the range to avoid gaps
		const cursor = new Date(startDate || (completedSales[0]?.created_at ?? now))
		cursor.setHours(0, 0, 0, 0)
		const targetEnd = new Date(now)
		targetEnd.setHours(23, 59, 59, 999)

		while (cursor <= targetEnd) {
			const key = cursor.toISOString().split('T')[0] || ''
			const label = cursor.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
			trendMap.set(key, { key, label, revenue: 0, tickets: 0, aov: 0 })
			cursor.setDate(cursor.getDate() + 1)
		}

		// Populate data
		completedSales.forEach((sale) => {
			const key = new Date(sale.created_at).toISOString().split('T')[0] || ''
			const point = trendMap.get(key)
			if (point) {
				point.revenue += sale.total
				point.tickets += 1
			}
		})
	} else {
		// Generate last 6-12 months
		const monthsCount = range === 'quarter' ? 3 : range === 'year' ? 12 : 6
		for (let i = monthsCount - 1; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
			const label = (
				range === '6m' || range === 'quarter'
					? d.toLocaleDateString('es-ES', { month: 'short' })
					: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
			)
				.replace('.', '')
				.toUpperCase()
			trendMap.set(key, { key, label, revenue: 0, tickets: 0, aov: 0 })
		}

		completedSales.forEach((sale) => {
			const d = new Date(sale.created_at)
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
			const point = trendMap.get(key)
			if (point) {
				point.revenue += sale.total
				point.tickets += 1
			}
		})
	}

	const revenueTrend = Array.from(trendMap.values()).map((pt) => ({
		...pt,
		month: pt.label,
		revenue: Math.round(pt.revenue * 100) / 100,
		aov: pt.tickets > 0 ? Math.round((pt.revenue / pt.tickets) * 100) / 100 : 0,
	}))

	// 4. Sales Mix (Servicios vs Cosmética Retail vs Bonos)
	let servicesRevenue = 0
	let servicesQuantity = 0
	let productsRevenue = 0
	let productsQuantity = 0
	let packagesRevenue = 0
	let packagesQuantity = 0

	const itemSalesMap = new Map<string, { name: string; type: string; quantity: number; revenue: number }>()

	completedSales.forEach((sale) => {
		sale.items.forEach((item) => {
			const itemType = (item.item_type || 'service').toLowerCase()
			const itemTotal = item.total || item.unit_price * item.quantity

			if (itemType === 'service') {
				servicesRevenue += itemTotal
				servicesQuantity += item.quantity
			} else if (itemType === 'product') {
				productsRevenue += itemTotal
				productsQuantity += item.quantity
			} else {
				packagesRevenue += itemTotal
				packagesQuantity += item.quantity
			}

			// Aggregate top individual items
			const existing = itemSalesMap.get(item.name) || {
				name: item.name,
				type: itemType,
				quantity: 0,
				revenue: 0,
			}
			existing.quantity += item.quantity
			existing.revenue += itemTotal
			itemSalesMap.set(item.name, existing)
		})
	})

	const totalCategorizedRevenue = servicesRevenue + productsRevenue + packagesRevenue || 1
	const salesMix = [
		{
			type: 'services',
			label: 'Servicios en Cabina',
			revenue: Math.round(servicesRevenue * 100) / 100,
			quantity: servicesQuantity,
			percentage: Math.round((servicesRevenue / totalCategorizedRevenue) * 1000) / 10,
		},
		{
			type: 'products',
			label: 'Cosmética Retail',
			revenue: Math.round(productsRevenue * 100) / 100,
			quantity: productsQuantity,
			percentage: Math.round((productsRevenue / totalCategorizedRevenue) * 1000) / 10,
		},
		{
			type: 'packages',
			label: 'Bonos & Packs',
			revenue: Math.round(packagesRevenue * 100) / 100,
			quantity: packagesQuantity,
			percentage: Math.round((packagesRevenue / totalCategorizedRevenue) * 1000) / 10,
		},
	]

	// Top Services & Top Products
	const allItems = Array.from(itemSalesMap.values())
	const topServices = allItems
		.filter((i) => i.type === 'service')
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 5)

	const topProducts = allItems
		.filter((i) => i.type === 'product')
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 5)

	const topItems = allItems
		.sort((a, b) => b.quantity - a.quantity)
		.slice(0, 5)

	// 5. Payment Methods Analysis (Revenue + Transactions)
	const methodMap: Record<string, string> = {
		cash: 'Efectivo',
		card: 'Tarjeta',
		mixed: 'Mixto',
		transfer: 'Transferencia',
	}

	const methodsAggregate = completedSales.reduce(
		(acc, sale) => {
			const raw = (sale.payment_method || 'card').toLowerCase()
			const normalized = methodMap[raw] || 'Otro'
			if (!acc[normalized]) acc[normalized] = { count: 0, amount: 0 }
			acc[normalized].count += 1
			acc[normalized].amount += sale.total
			return acc
		},
		{} as Record<string, { count: number; amount: number }>,
	)

	const paymentMethods = Object.entries(methodsAggregate).map(([name, val]) => ({
		name,
		count: val.count,
		amount: Math.round(val.amount * 100) / 100,
		percentage: grossRevenue > 0 ? Math.round((val.amount / grossRevenue) * 1000) / 10 : 0,
	}))

	// 6. Marketing & Customer Retention Intelligence
	// Build client historical purchase dates
	const userFirstPurchaseMap = new Map<string, Date>()
	allTimeUsersWithCarts.forEach((c) => {
		if (c.user_id) {
			const prevDate = userFirstPurchaseMap.get(c.user_id)
			const cDate = new Date(c.created_at)
			if (!prevDate || cDate < prevDate) {
				userFirstPurchaseMap.set(c.user_id, cDate)
			}
		}
	})

	const currentPeriodUserIds = new Set(
		completedSales.map((s) => s.user_id).filter((id): id is string => Boolean(id)),
	)
	const uniqueBuyersCount = currentPeriodUserIds.size

	let returningBuyersCount = 0
	let firstTimeBuyersCount = 0

	currentPeriodUserIds.forEach((userId) => {
		const firstDate = userFirstPurchaseMap.get(userId)
		if (startDate && firstDate && firstDate < startDate) {
			returningBuyersCount += 1
		} else {
			firstTimeBuyersCount += 1
		}
	})

	const retentionRate =
		uniqueBuyersCount > 0 ? Math.round((returningBuyersCount / uniqueBuyersCount) * 1000) / 10 : 0

	// Top Clients by Spend
	const clientSpendMap = new Map<
		string,
		{ id: string; name: string; email: string; avatar: string; totalSpend: number; ordersCount: number }
	>()

	completedSales.forEach((sale) => {
		if (sale.user) {
			const u = sale.user
			const fullName = `${u.name} ${u.surname}`.trim()
			const existing = clientSpendMap.get(u.user_id) || {
				id: u.user_id,
				name: fullName,
				email: u.email,
				avatar: u.avatar || '',
				totalSpend: 0,
				ordersCount: 0,
			}
			existing.totalSpend += sale.total
			existing.ordersCount += 1
			clientSpendMap.set(u.user_id, existing)
		}
	})

	const topClients = Array.from(clientSpendMap.values())
		.sort((a, b) => b.totalSpend - a.totalSpend)
		.slice(0, 5)
		.map((c) => ({
			...c,
			totalSpend: Math.round(c.totalSpend * 100) / 100,
		}))

	// 7. Operational & Cabins / Agenda Performance
	const totalBookings = bookings.length
	const normalizeStatus = (st: string) => {
		const s = (st || '').toUpperCase()
		if (s === 'COMPLETADA' || s === 'COMPLETED') return 'completed'
		if (s === 'CONFIRMADA' || s === 'CONFIRMED') return 'confirmed'
		if (s === 'CANCELADA' || s === 'CANCELLED' || s === 'AUSENTE' || s === 'NO_SHOW') return 'cancelled'
		return 'pending'
	}

	let completedBookings = 0
	let confirmedBookings = 0
	let pendingBookings = 0
	let cancelledBookings = 0
	let noShowBookings = 0

	bookings.forEach((b) => {
		const norm = normalizeStatus(b.status)
		if (norm === 'completed') completedBookings += 1
		else if (norm === 'confirmed') confirmedBookings += 1
		else if (norm === 'cancelled') {
			cancelledBookings += 1
			if ((b.status || '').toUpperCase() === 'AUSENTE') noShowBookings += 1
		} else {
			pendingBookings += 1
		}
	})

	const cancellationRate =
		totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 1000) / 10 : 0

	// Staff Performance breakdown
	const staffMap = new Map<
		string,
		{ id: string; name: string; bookingsCount: number; completedBookings: number; generatedRevenue: number }
	>()

	bookings.forEach((b) => {
		if (b.staff) {
			const sName = `${b.staff.name} ${b.staff.surname}`.trim()
			const existing = staffMap.get(b.staff.user_id) || {
				id: b.staff.user_id,
				name: sName,
				bookingsCount: 0,
				completedBookings: 0,
				generatedRevenue: 0,
			}
			existing.bookingsCount += 1
			if (normalizeStatus(b.status) === 'completed') existing.completedBookings += 1
			staffMap.set(b.staff.user_id, existing)
		}
	})

	completedSales.forEach((sale) => {
		const staff = sale.booking?.staff
		if (staff) {
			const existing = staffMap.get(staff.user_id)
			if (existing) {
				existing.generatedRevenue += sale.total
			}
		}
	})

	const staffPerformance = Array.from(staffMap.values())
		.sort((a, b) => b.completedBookings - a.completedBookings)
		.map((s) => ({
			...s,
			generatedRevenue: Math.round(s.generatedRevenue * 100) / 100,
		}))

	// 8. Commercial Velocity & Cross-Selling (Attach Rate)
	let cartsWithService = 0
	let cartsWithProduct = 0
	let cartsWithBoth = 0
	let totalUnitsSold = 0

	completedSales.forEach((sale) => {
		let hasService = false
		let hasProduct = false
		let saleUnits = 0

		sale.items.forEach((it) => {
			const t = (it.item_type || 'service').toLowerCase()
			if (t === 'service') hasService = true
			if (t === 'product') hasProduct = true
			saleUnits += it.quantity
		})

		if (hasService) cartsWithService += 1
		if (hasProduct) cartsWithProduct += 1
		if (hasService && hasProduct) cartsWithBoth += 1
		totalUnitsSold += saleUnits
	})

	const crossSellingRate =
		totalSales > 0 ? Math.round((cartsWithBoth / totalSales) * 1000) / 10 : 0
	const unitsPerTransaction =
		totalSales > 0 ? Math.round((totalUnitsSold / totalSales) * 10) / 10 : 0

	const serviceAov =
		cartsWithService > 0 ? Math.round((servicesRevenue / cartsWithService) * 100) / 100 : 0
	const productAov =
		cartsWithProduct > 0 ? Math.round((productsRevenue / cartsWithProduct) * 100) / 100 : 0

	// Daily velocity and monthly projection
	const daysCount =
		startDate
			? Math.max(1, Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
			: 30
	const dailyRevenueRate = Math.round((grossRevenue / daysCount) * 100) / 100
	const projectedMonthlyRevenue = Math.round(dailyRevenueRate * 30 * 100) / 100

	// 9. Financial Health / Debts
	const pendingDebtsAmount = debtsSummary._sum.remaining || 0

	return {
		period: {
			range,
			startDate: startDate ? startDate.toISOString() : null,
			endDate: now.toISOString(),
			granularity,
		},
		kpis: {
			totalRevenue: Math.round(grossRevenue * 100) / 100,
			grossRevenue: Math.round(grossRevenue * 100) / 100,
			netRevenue: Math.round(netRevenue * 100) / 100,
			revenueDelta,
			totalSales,
			salesDelta,
			aov: Math.round(aov * 100) / 100,
			aovDelta,
			totalDiscounts: Math.round(totalDiscounts * 100) / 100,
			discountRate: Math.round(discountRate * 10) / 10,
			totalClients: totalClientsAllTime,
			newClients: newClientsCount,
			newClientsDelta,
			uniqueBuyers: uniqueBuyersCount,
			returningBuyers: returningBuyersCount,
			firstTimeBuyers: firstTimeBuyersCount,
			retentionRate,
			totalBookings,
			bookingsDelta,
			completedBookings,
			cancelledBookings,
			noShows: noShowBookings,
			cancellationRate,
			totalProducts: totalProductsCount,
			pendingDebts: Math.round(pendingDebtsAmount * 100) / 100,
		},
		revenueTrend,
		salesMix,
		paymentMethods,
		topServices,
		topProducts,
		topItems,
		topClients,
		commercialMetrics: {
			crossSellingRate,
			cartsWithBoth,
			unitsPerTransaction,
			serviceAov,
			productAov,
			dailyRevenueRate,
			projectedMonthlyRevenue,
		},
		staffPerformance,
		bookingStatusDistribution: [
			{ status: 'completed', label: 'Completadas', count: completedBookings },
			{ status: 'confirmed', label: 'Confirmadas', count: confirmedBookings },
			{ status: 'pending', label: 'Pendientes', count: pendingBookings },
			{ status: 'cancelled', label: 'Canceladas / Ausentes', count: cancelledBookings },
		],
	}
})
