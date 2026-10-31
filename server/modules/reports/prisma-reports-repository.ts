import type { PrismaClient } from '@prisma/client'
import type { FetchReportsDataParams, RawReportsData, ReportsRepository } from './ports'

export function createPrismaReportsRepository(db: PrismaClient): ReportsRepository {
	return {
		async fetchReportsData({ startDate, now, prevStartDate, prevEndDate }: FetchReportsDataParams): Promise<RawReportsData> {
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
				// Current period sales
				db.cart.findMany({
					where: {
						status: 'completed',
						...(startDate
							? {
									OR: [
										{
											booking: {
												booking_date: { gte: startDate, lte: now },
											},
										},
										{
											booking_id: null,
											created_at: { gte: startDate, lte: now },
										},
									],
								}
							: {}),
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
						},
					},
					orderBy: { created_at: 'asc' },
				}),

				// Previous period sales
				prevStartDate && prevEndDate
					? db.cart.findMany({
							where: {
								status: 'completed',
								OR: [
									{
										booking: {
											booking_date: { gte: prevStartDate, lte: prevEndDate },
										},
									},
									{
										booking_id: null,
										created_at: { gte: prevStartDate, lte: prevEndDate },
									},
								],
							},
							select: { total: true, discount: true },
						})
					: Promise.resolve([]),

				// Bookings in the selected period
				db.booking.findMany({
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
					? db.booking.count({
							where: {
								booking_date: { gte: prevStartDate, lte: prevEndDate },
							},
						})
					: Promise.resolve(0),

				// New clients registered in current period
				db.user.count({
					where: {
						role: 'CLIENT',
						...(startDate ? { created_at: { gte: startDate, lte: now } } : {}),
					},
				}),

				// New clients in previous period
				prevStartDate && prevEndDate
					? db.user.count({
							where: {
								role: 'CLIENT',
								created_at: { gte: prevStartDate, lte: prevEndDate },
							},
						})
					: Promise.resolve(0),

				// Total clients all-time
				db.user.count({ where: { role: 'CLIENT' } }).catch(() => db.user.count()),

				// Total catalog products
				db.product.count(),

				// Debts created in the period
				db.debt.aggregate({
					_sum: { amount: true, remaining: true },
					where: {
						...(startDate ? { created_at: { gte: startDate, lte: now } } : {}),
					},
				}),

				// Clients history for retention analysis
				db.cart.findMany({
					where: { status: 'completed' },
					select: { user_id: true, created_at: true },
				}),
			])

			return {
				completedSales: completedSales as unknown as RawReportsData['completedSales'],
				prevSales,
				bookings: bookings as unknown as RawReportsData['bookings'],
				prevBookingsCount,
				newClientsCount,
				prevNewClientsCount,
				totalClientsAllTime,
				totalProductsCount,
				debtsSummary,
				allTimeUsersWithCarts,
			}
		},
	}
}

