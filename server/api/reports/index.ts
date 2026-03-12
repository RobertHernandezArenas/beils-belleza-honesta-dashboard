export default defineEventHandler(async event => {
	// 1. KPIs
	// Assuming clients are users with role 'CLIENT'.
	let totalClients = 0
	try {
		totalClients = await prisma.user.count({ where: { role: 'CLIENT' } })
	} catch (e) {
		// Fallback if role doesn't exist
		totalClients = await prisma.user.count()
	}

	const totalProducts = await prisma.product.count()

	const completedSales = await prisma.cart.findMany({
		where: { status: 'completed' },
		select: {
			total: true,
			payment_method: true,
			created_at: true,
			items: {
				select: {
					name: true,
					quantity: true,
				},
			},
		},
	})

	const totalRevenue = completedSales.reduce((sum, sale) => sum + sale.total, 0)
	const totalSalesCount = completedSales.length

	// 2. Revenue Trend (Last 6 months)
	// Calculate the labels for the last 6 months
	const trendLabels = Array.from({ length: 6 }, (_, i) => {
		const d = new Date()
		d.setMonth(d.getMonth() - i)
		return {
			label: d.toLocaleString('es-ES', { month: 'short' }).toUpperCase(),
			month: d.getMonth(),
			year: d.getFullYear(),
		}
	}).reverse()

	const revenueTrend = trendLabels.map(period => {
		const monthSales = completedSales.filter(sale => {
			const saleDate = new Date(sale.created_at)
			return saleDate.getMonth() === period.month && saleDate.getFullYear() === period.year
		})
		const revenue = monthSales.reduce((sum, sale) => sum + sale.total, 0)
		return { month: period.label, revenue }
	})

	// 3. Payment Methods Distribution
	const paymentMethods = completedSales.reduce(
		(acc, sale) => {
			// Normalize method strings
			const methodRaw = sale.payment_method || 'other'
			const methodMap: Record<string, string> = {
				cash: 'Efectivo',
				card: 'Tarjeta',
				mixed: 'Mixto',
				transfer: 'Transferencia',
			}
			const method = methodMap[methodRaw] || methodRaw

			acc[method] = (acc[method] || 0) + 1
			return acc
		},
		{} as Record<string, number>,
	)

	const paymentMethodsData = Object.entries(paymentMethods).map(([name, value]) => ({ name, value }))

	// 4. Top Selling Items
	const itemMap = new Map<string, number>()
	completedSales.forEach(sale => {
		sale.items.forEach(item => {
			itemMap.set(item.name, (itemMap.get(item.name) || 0) + item.quantity)
		})
	})

	const topItems = Array.from(itemMap.entries())
		.map(([name, quantity]) => ({ name, quantity }))
		.sort((a, b) => b.quantity - a.quantity)
		.slice(0, 5) // Top 5

	return {
		kpis: {
			totalRevenue,
			totalClients,
			totalProducts,
			totalSales: totalSalesCount,
		},
		revenueTrend,
		paymentMethods: paymentMethodsData,
		topItems,
	}
})
