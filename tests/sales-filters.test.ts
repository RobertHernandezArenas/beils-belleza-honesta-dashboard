import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Sale } from '../shared/types/domain'
import {
	parseLocalDateStart,
	parseLocalDateEnd,
	getTicketDisplay,
	compareTicketIds,
	filterSalesList,
} from '../app/utils/salesFilterCalculations'

const mockSales: Sale[] = [
	{
		cart_id: 'c1111111-2222-3333-4444-555555555555',
		user_id: 'u1',
		booking_id: null,
		status: 'completed',
		subtotal: 100,
		discount: 0,
		total: 100,
		payment_method: 'bizum',
		notes: null,
		invoice_number: null, // synthetic ticket -> BBH-2026-c111
		created_at: new Date(2026, 3, 1, 0, 30, 0).toISOString(), // 1 Apr 2026 00:30 local
		items: [],
		user: {
			name: 'Elena',
			surname: 'Gómez',
			email: 'elena.gomez@example.com',
			avatar: '',
		},
	},
	{
		cart_id: 'c2222222-3333-4444-5555-666666666666',
		user_id: 'u2',
		booking_id: null,
		status: 'completed',
		subtotal: 50,
		discount: 10,
		total: 40,
		payment_method: 'cash',
		notes: null,
		invoice_number: 'FAC-2026-0099',
		created_at: new Date(2026, 3, 1, 14, 0, 0).toISOString(), // 1 Apr 2026 14:00 local
		items: [],
		user: {
			name: 'Carlos',
			surname: 'Ruiz',
			email: 'carlos.ruiz@example.com',
			avatar: '',
		},
	},
	{
		cart_id: 'c3333333-4444-5555-6666-777777777777',
		user_id: 'u3',
		booking_id: null,
		status: 'completed',
		subtotal: 200,
		discount: 0,
		total: 200,
		payment_method: 'card',
		notes: null,
		invoice_number: 'BBH-2026-0105',
		created_at: new Date(2026, 3, 5, 18, 0, 0).toISOString(), // 5 Apr 2026 18:00 local
		items: [],
		user: {
			name: 'Beatriz',
			surname: 'Álvarez',
			email: 'beatriz@example.com',
			avatar: '',
		},
	},
]

describe('Sales Filters & Local Date Precision Logic', () => {
	it('should parse local date start to 00:00:00.000 and end to 23:59:59.999 without UTC distortion', () => {
		const start = parseLocalDateStart('2026-04-01')
		const end = parseLocalDateEnd('2026-04-01')

		assert.ok(start !== null)
		assert.ok(end !== null)
		assert.equal(start.getFullYear(), 2026)
		assert.equal(start.getMonth(), 3) // April
		assert.equal(start.getDate(), 1)
		assert.equal(start.getHours(), 0)
		assert.equal(start.getMinutes(), 0)
		assert.equal(start.getSeconds(), 0)
		assert.equal(start.getMilliseconds(), 0)

		assert.equal(end.getFullYear(), 2026)
		assert.equal(end.getMonth(), 3)
		assert.equal(end.getDate(), 1)
		assert.equal(end.getHours(), 23)
		assert.equal(end.getMinutes(), 59)
		assert.equal(end.getSeconds(), 59)
		assert.equal(end.getMilliseconds(), 999)
	})

	it('should generate ticket display correctly for both invoice and synthetic formats', () => {
		const synthetic = getTicketDisplay(mockSales[0]!)
		assert.ok(synthetic.startsWith('BBH-'))
		assert.ok(synthetic.includes('c111'))

		const invoiced = getTicketDisplay(mockSales[1]!)
		assert.equal(invoiced, 'FAC-2026-0099')
	})

	it('should filter sales by single date covering midnight/early morning sales accurately in local time', () => {
		const filtered = filterSalesList(mockSales, {
			filterDateMode: 'single',
			filterDateSingle: '2026-04-01',
		})

		// Both sales on 1 Apr (00:30 local and 14:00 local) must be included
		assert.equal(filtered.length, 2)
		assert.equal(filtered[0]?.cart_id, 'c1111111-2222-3333-4444-555555555555')
		assert.equal(filtered[1]?.cart_id, 'c2222222-3333-4444-5555-666666666666')
	})

	it('should filter sales by date range inclusive of start and end day bounds', () => {
		const filtered = filterSalesList(mockSales, {
			filterDateMode: 'range',
			filterDateRange: { start: '2026-04-01', end: '2026-04-02' },
		})

		assert.equal(filtered.length, 2)

		const allRange = filterSalesList(mockSales, {
			filterDateMode: 'range',
			filterDateRange: { start: '2026-04-01', end: '2026-04-05' },
		})
		assert.equal(allRange.length, 3)
	})

	it('should search sales by synthetic ticket prefix "BBH" or partial ID', () => {
		const filteredByBBH = filterSalesList(mockSales, {
			searchQuery: 'BBH',
		})
		// mockSales[0] has synthetic BBH-..., mockSales[2] has invoice BBH-2026-0105
		assert.equal(filteredByBBH.length, 2)

		const filteredByPartialId = filterSalesList(mockSales, {
			searchQuery: 'c111',
		})
		assert.equal(filteredByPartialId.length, 1)
		assert.equal(filteredByPartialId[0]?.user?.name, 'Elena')
	})

	it('should search sales by invoice number, client name and client email', () => {
		const byInvoice = filterSalesList(mockSales, {
			searchQuery: 'FAC-2026-0099',
		})
		assert.equal(byInvoice.length, 1)
		assert.equal(byInvoice[0]?.user?.name, 'Carlos')

		const byName = filterSalesList(mockSales, {
			searchQuery: 'carlos',
		})
		assert.equal(byName.length, 1)

		const byEmail = filterSalesList(mockSales, {
			searchQuery: 'beatriz@example.com',
		})
		assert.equal(byEmail.length, 1)
	})

	it('should filter sales by payment method including bizum, cash and card', () => {
		const bizumSales = filterSalesList(mockSales, {
			filterPaymentMethod: 'bizum',
		})
		assert.equal(bizumSales.length, 1)
		assert.equal(bizumSales[0]?.payment_method, 'bizum')

		const cashSales = filterSalesList(mockSales, {
			filterPaymentMethod: 'cash',
		})
		assert.equal(cashSales.length, 1)

		const allSales = filterSalesList(mockSales, {
			filterPaymentMethod: 'all',
		})
		assert.equal(allSales.length, 3)
	})

	it('should sort sales correctly by total, date, client and id', () => {
		const sortedDesc = filterSalesList(mockSales, {
			sortKey: 'total',
			sortOrder: 'desc',
		})
		assert.equal(sortedDesc[0]?.total, 200)
		assert.equal(sortedDesc[2]?.total, 40)

		const sortedAsc = filterSalesList(mockSales, {
			sortKey: 'total',
			sortOrder: 'asc',
		})
		assert.equal(sortedAsc[0]?.total, 40)
		assert.equal(sortedAsc[2]?.total, 200)

		const sortedClient = filterSalesList(mockSales, {
			sortKey: 'client',
			sortOrder: 'asc',
		})
		assert.equal(sortedClient[0]?.user?.name, 'Beatriz')
		assert.equal(sortedClient[1]?.user?.name, 'Carlos')
		assert.equal(sortedClient[2]?.user?.name, 'Elena')
	})

	it('should sort tickets chronologically by year, month, and sequence number', () => {
		// Same month tickets: 0001 < 0002 < 0003
		assert.ok(compareTicketIds('BBH-09-2026-0001', 'BBH-09-2026-0002') < 0)
		assert.ok(compareTicketIds('BBH-09-2026-0002', 'BBH-09-2026-0001') > 0)
		assert.equal(compareTicketIds('BBH-09-2026-0001', 'BBH-09-2026-0001'), 0)

		// Cross-month tickets: August < September
		assert.ok(compareTicketIds('BBH-08-2026-0022', 'BBH-09-2026-0001') < 0)
		assert.ok(compareTicketIds('BBH-09-2026-0001', 'BBH-08-2026-0022') > 0)

		// Cross-year tickets: December 2025 < January 2026
		assert.ok(compareTicketIds('BBH-12-2025-0099', 'BBH-01-2026-0001') < 0)
		assert.ok(compareTicketIds('BBH-01-2026-0001', 'BBH-12-2025-0099') > 0)

		// Testing filterSalesList sorting with tickets
		const ticketSales: Sale[] = [
			{ ...mockSales[0]!, invoice_number: 'BBH-09-2026-0002', cart_id: 't2' },
			{ ...mockSales[1]!, invoice_number: 'BBH-08-2026-0022', cart_id: 't1' },
			{ ...mockSales[2]!, invoice_number: 'BBH-09-2026-0001', cart_id: 't3' },
		]

		const sortedAsc = filterSalesList(ticketSales, {
			sortKey: 'id',
			sortOrder: 'asc',
		})
		assert.equal(sortedAsc[0]?.invoice_number, 'BBH-08-2026-0022')
		assert.equal(sortedAsc[1]?.invoice_number, 'BBH-09-2026-0001')
		assert.equal(sortedAsc[2]?.invoice_number, 'BBH-09-2026-0002')

		const sortedDesc = filterSalesList(ticketSales, {
			sortKey: 'id',
			sortOrder: 'desc',
		})
		assert.equal(sortedDesc[0]?.invoice_number, 'BBH-09-2026-0002')
		assert.equal(sortedDesc[1]?.invoice_number, 'BBH-09-2026-0001')
		assert.equal(sortedDesc[2]?.invoice_number, 'BBH-08-2026-0022')
	})
})
