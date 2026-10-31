import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getReports } from '../server/modules/reports/get-reports'
import type { ReportsRepository, RawReportsData } from '../server/modules/reports/ports'

describe('getReports', () => {
	it('calculates metrics and trends across sales and bookings', async () => {
		const fakeRepo: ReportsRepository = {
			fetchReportsData: async (): Promise<RawReportsData> => ({
				completedSales: [
					{
						cart_id: 'c1',
						total: 100,
						discount: 10,
						payment_method: 'card',
						created_at: new Date('2026-03-01T10:00:00Z'),
						user_id: 'u1',
						user: { user_id: 'u1', name: 'Ana', surname: 'Gomez', email: 'ana@example.com' },
						items: [
							{ item_type: 'service', name: 'Facial', quantity: 1, unit_price: 60, total: 60 },
							{ item_type: 'product', name: 'Crema', quantity: 1, unit_price: 40, total: 40 },
						],
					},
				],
				prevSales: [{ total: 80, discount: 0 }],
				bookings: [
					{
						booking_id: 'b1',
						status: 'COMPLETADA',
						duration: 60,
						booking_date: new Date('2026-03-01T10:00:00Z'),
						staff_id: 's1',
						staff: { user_id: 's1', name: 'Laura', surname: 'Estilista' },
					},
				],
				prevBookingsCount: 1,
				newClientsCount: 1,
				prevNewClientsCount: 1,
				totalClientsAllTime: 10,
				totalProductsCount: 5,
				debtsSummary: { _sum: { amount: 0, remaining: 0 } },
				allTimeUsersWithCarts: [{ user_id: 'u1', created_at: new Date('2026-03-01T10:00:00Z') }],
			}),
		}

		const result = await getReports({ reports: fakeRepo, now: () => new Date('2026-03-10T12:00:00Z') }, '7d')

		assert.equal(result.kpis.totalRevenue, 100)
		assert.equal(result.kpis.netRevenue, 90)
		assert.equal(result.kpis.totalSales, 1)
		assert.equal(result.kpis.totalBookings, 1)
		assert.equal(result.kpis.completedBookings, 1)
		assert.equal(result.salesMix.length, 3)
		assert.equal(result.topClients.length, 1)
		assert.equal(result.topClients[0]!.name, 'Ana Gomez')
		assert.equal(result.staffPerformance[0]!.name, 'Laura Estilista')
	})
})

