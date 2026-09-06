import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Sale } from '../shared/types/domain'

import {
	getQuarterDateBounds,
	getPeriodDateBounds,
	calculateFiscalSummary,
	calculatePeriodicSummaries,
	buildSalesCsvContent,
} from '../app/utils/salesExportCalculations'

describe('Sales Export & Quarterly Filters Logic', () => {
	it('should calculate accurate date bounds for quarters Q1, Q2, Q3, Q4 (full calendar months: Ene-Mar, Abr-Jun, Jul-Sep, Oct-Dic)', () => {
		const year = 2026

		// Q1: 1 Ene 2026 - 31 Mar 2026
		const q1 = getQuarterDateBounds(1, year)
		assert.equal(q1.start.getFullYear(), 2026)
		assert.equal(q1.start.getMonth(), 0) // January (0-indexed)
		assert.equal(q1.start.getDate(), 1)
		assert.equal(q1.end.getFullYear(), 2026)
		assert.equal(q1.end.getMonth(), 2) // March
		assert.equal(q1.end.getDate(), 31)

		// Q2: 1 Abr 2026 - 30 Jun 2026
		const q2 = getQuarterDateBounds(2, year)
		assert.equal(q2.start.getMonth(), 3) // April
		assert.equal(q2.start.getDate(), 1)
		assert.equal(q2.end.getMonth(), 5) // June
		assert.equal(q2.end.getDate(), 30)

		// Q3: 1 Jul 2026 - 30 Sep 2026
		const q3 = getQuarterDateBounds(3, year)
		assert.equal(q3.start.getMonth(), 6) // July
		assert.equal(q3.start.getDate(), 1)
		assert.equal(q3.end.getMonth(), 8) // September
		assert.equal(q3.end.getDate(), 30)

		// Q4: 1 Oct 2026 - 31 Dic 2026
		const q4 = getQuarterDateBounds(4, year)
		assert.equal(q4.start.getFullYear(), 2026)
		assert.equal(q4.start.getMonth(), 9) // October
		assert.equal(q4.start.getDate(), 1)
		assert.equal(q4.end.getFullYear(), 2026)
		assert.equal(q4.end.getMonth(), 11) // December
		assert.equal(q4.end.getDate(), 31)
	})

	it('should calculate period bounds for all timeframe modes', () => {
		const boundsDay = getPeriodDateBounds('day')
		assert.ok(boundsDay.start)
		assert.ok(boundsDay.end)

		const boundsQuarter = getPeriodDateBounds('quarter', { quarter: 2, year: 2026 })
		assert.equal(boundsQuarter.start?.getMonth(), 3)
		assert.equal(boundsQuarter.start?.getDate(), 1)
		assert.equal(boundsQuarter.end?.getMonth(), 5)
		assert.equal(boundsQuarter.end?.getDate(), 30)

		const boundsAll = getPeriodDateBounds('all')
		assert.equal(boundsAll.start, null)
		assert.equal(boundsAll.end, null)
	})

	const mockSales: Sale[] = [
		{
			cart_id: 'cart-1',
			status: 'completed',
			subtotal: 100,
			discount: 0,
			total: 100,
			payment_method: 'card',
			invoice_number: 'BBH-2026-0001',
			created_at: '2026-02-15T10:30:00.000Z',
			user: { name: 'Lucía', surname: 'Gómez', email: 'lucia@example.com' },
			items: [
				{
					item_type: 'service',
					item_id: 'srv-1',
					name: 'Higiene Facial',
					quantity: 1,
					unit_price: 60,
					tax_rate: 21,
					subtotal: 60,
					total: 60,
				},
				{
					item_type: 'product',
					item_id: 'prd-1',
					name: 'Crema Hidratante',
					quantity: 2,
					unit_price: 20,
					tax_rate: 21,
					subtotal: 40,
					total: 40,
				},
			],
		},
		{
			cart_id: 'cart-2',
			status: 'completed',
			subtotal: 50,
			discount: 5,
			total: 45,
			payment_method: 'cash',
			invoice_number: 'BBH-2026-0002',
			created_at: '2026-02-20T16:00:00.000Z',
			user: { name: 'Carlos', surname: 'Martín', email: 'carlos@example.com' },
			items: [
				{
					item_type: 'service',
					item_id: 'srv-2',
					name: 'Manicura Spa',
					quantity: 1,
					unit_price: 45,
					tax_rate: 21,
					subtotal: 45,
					total: 45,
				},
			],
		},
	]

	it('should accurately calculate fiscal summary with tax bases, tax amounts, and payment methods', () => {
		const summary = calculateFiscalSummary(mockSales)
		assert.equal(summary.totalSalesCount, 2)
		assert.equal(summary.grandTotal, 145)

		// Base + IVA calculation: Total 145 / 1.21 = 119.83 Base, 25.17 IVA
		assert.equal(summary.taxesByRate[21]?.totalAmount, 145)
		assert.ok(Math.abs(summary.taxesByRate[21]!.baseAmount - 119.83) < 0.05)
		assert.ok(Math.abs(summary.taxesByRate[21]!.taxAmount - 25.17) < 0.05)

		// Payment methods breakdown
		assert.equal(summary.methodsSummary['card']?.count, 1)
		assert.equal(summary.methodsSummary['card']?.total, 100)
		assert.equal(summary.methodsSummary['cash']?.count, 1)
		assert.equal(summary.methodsSummary['cash']?.total, 45)
	})

	it('should generate CSV in breakdown mode with individual item lines', () => {
		const csv = buildSalesCsvContent({
			sales: mockSales,
			mode: 'breakdown',
			periodTitle: '1T 2026 (Trimestre 1)',
		})

		assert.ok(csv.includes('ID Ticket / Factura;Fecha y hora;Cliente;Tipo;Concepto / Item;Cantidad;Precio Unitario (€);Tipo IVA (%);Subtotal (€);Total Ticket (€);Método de pago'))
		assert.ok(csv.includes('Higiene Facial'))
		assert.ok(csv.includes('Crema Hidratante'))
		assert.ok(csv.includes('Manicura Spa'))
		assert.ok(csv.includes('BBH-2026-0001'))
	})

	it('should generate CSV in individual sales mode (one row per ticket)', () => {
		const csv = buildSalesCsvContent({
			sales: mockSales,
			mode: 'individual',
			periodTitle: '1T 2026 (Trimestre 1)',
		})

		assert.ok(csv.includes('ID Ticket / Factura;Fecha y hora;Cliente;Nº Items;Método de pago;Descuento (€);Total (€)'))
		assert.ok(csv.includes('BBH-2026-0001'))
		assert.ok(csv.includes('Lucía Gómez'))
		assert.ok(csv.includes('100,00'))
		assert.ok(csv.includes('BBH-2026-0002'))
		assert.ok(csv.includes('Carlos Martín'))
		assert.ok(csv.includes('45,00'))
	})

	it('should generate CSV in summary mode (fiscal summary for tax declaration)', () => {
		const csv = buildSalesCsvContent({
			sales: mockSales,
			mode: 'summary',
			periodTitle: '1T 2026 (Trimestre 1)',
		})

		assert.ok(csv.includes('RESUMEN FISCAL Y FACTURACIÓN'))
		assert.ok(csv.includes('BASE IMPONIBLE TOTAL (€)'))
		assert.ok(csv.includes('TOTAL IVA (€)'))
		assert.ok(csv.includes('DESGLOSE POR TIPO DE IVA'))
		assert.ok(csv.includes('DESGLOSE POR MÉTODO DE PAGO'))
		assert.ok(csv.includes('145,00'))
	})

	const mockMultiPeriodSales: Sale[] = [
		{
			cart_id: 'cart-1',
			status: 'completed',
			subtotal: 100,
			discount: 0,
			total: 100,
			payment_method: 'card',
			invoice_number: 'BBH-2026-0001',
			created_at: '2026-01-15T10:30:00.000Z',
			user: { name: 'Lucía', surname: 'Gómez', email: 'lucia@example.com' },
			items: [
				{
					item_type: 'service',
					item_id: 'srv-1',
					name: 'Higiene Facial',
					quantity: 1,
					unit_price: 100,
					tax_rate: 21,
					subtotal: 100,
					total: 100,
				},
			],
		},
		{
			cart_id: 'cart-2',
			status: 'completed',
			subtotal: 50,
			discount: 5,
			total: 45,
			payment_method: 'cash',
			invoice_number: 'BBH-2026-0002',
			created_at: '2026-01-15T16:00:00.000Z', // Same day
			user: { name: 'Carlos', surname: 'Martín', email: 'carlos@example.com' },
			items: [
				{
					item_type: 'service',
					item_id: 'srv-2',
					name: 'Manicura Spa',
					quantity: 1,
					unit_price: 45,
					tax_rate: 21,
					subtotal: 45,
					total: 45,
				},
			],
		},
		{
			cart_id: 'cart-3',
			status: 'completed',
			subtotal: 80,
			discount: 0,
			total: 80,
			payment_method: 'card',
			invoice_number: 'BBH-2026-0003',
			created_at: '2026-02-10T12:00:00.000Z', // Different week and month
			user: { name: 'Elena', surname: 'Vega', email: 'elena@example.com' },
			items: [
				{
					item_type: 'service',
					item_id: 'srv-3',
					name: 'Masaje Relajante',
					quantity: 1,
					unit_price: 80,
					tax_rate: 21,
					subtotal: 80,
					total: 80,
				},
			],
		},
		{
			cart_id: 'cart-4',
			status: 'completed',
			subtotal: 60,
			discount: 0,
			total: 60,
			payment_method: 'bizum',
			invoice_number: 'BBH-2025-0099',
			created_at: '2025-11-20T11:00:00.000Z', // Prior year
			user: { name: 'Marcos', surname: 'Ruiz', email: 'marcos@example.com' },
			items: [
				{
					item_type: 'service',
					item_id: 'srv-4',
					name: 'Pedicura',
					quantity: 1,
					unit_price: 60,
					tax_rate: 21,
					subtotal: 60,
					total: 60,
				},
			],
		},
	]

	it('should calculate periodic summaries grouped by day (sumatorio diario)', () => {
		const dailyRows = calculatePeriodicSummaries(mockMultiPeriodSales, 'day')
		assert.equal(dailyRows.length, 3)

		// Chronologically sorted: 2025-11-20, 2026-01-15, 2026-02-10
		assert.equal(dailyRows[0]?.key, '2025-11-20')
		assert.equal(dailyRows[0]?.salesCount, 1)
		assert.equal(dailyRows[0]?.grandTotal, 60)

		// 2026-01-15 has 2 sales: total 145 (100 card + 45 cash)
		assert.equal(dailyRows[1]?.key, '2026-01-15')
		assert.equal(dailyRows[1]?.salesCount, 2)
		assert.equal(dailyRows[1]?.grandTotal, 145)
		assert.equal(dailyRows[1]?.methodsSummary['card'], 100)
		assert.equal(dailyRows[1]?.methodsSummary['cash'], 45)

		// 2026-02-10 has 1 sale: total 80
		assert.equal(dailyRows[2]?.key, '2026-02-10')
		assert.equal(dailyRows[2]?.salesCount, 1)
		assert.equal(dailyRows[2]?.grandTotal, 80)
	})

	it('should calculate periodic summaries grouped by week (sumatorio semanal)', () => {
		const weeklyRows = calculatePeriodicSummaries(mockMultiPeriodSales, 'week')
		assert.equal(weeklyRows.length, 3)
		assert.ok(weeklyRows[0]?.label.includes('Semana'))
		assert.ok(weeklyRows[1]?.label.includes('Semana'))
		assert.equal(weeklyRows[1]?.salesCount, 2) // Both sales on 15 Jan belong to same week
		assert.equal(weeklyRows[1]?.grandTotal, 145)
	})

	it('should calculate periodic summaries grouped by month (sumatorio mensual)', () => {
		const monthlyRows = calculatePeriodicSummaries(mockMultiPeriodSales, 'month')
		assert.equal(monthlyRows.length, 3)

		assert.equal(monthlyRows[0]?.key, '2025-11')
		assert.equal(monthlyRows[0]?.grandTotal, 60)

		assert.equal(monthlyRows[1]?.key, '2026-01')
		assert.equal(monthlyRows[1]?.grandTotal, 145)

		assert.equal(monthlyRows[2]?.key, '2026-02')
		assert.equal(monthlyRows[2]?.grandTotal, 80)
	})

	it('should calculate periodic summaries grouped by year (sumatorio anual)', () => {
		const yearlyRows = calculatePeriodicSummaries(mockMultiPeriodSales, 'year')
		assert.equal(yearlyRows.length, 2)

		assert.equal(yearlyRows[0]?.key, '2025')
		assert.equal(yearlyRows[0]?.salesCount, 1)
		assert.equal(yearlyRows[0]?.grandTotal, 60)

		assert.equal(yearlyRows[1]?.key, '2026')
		assert.equal(yearlyRows[1]?.salesCount, 3)
		assert.equal(yearlyRows[1]?.grandTotal, 225)
	})

	it('should maintain exact mathematical equality between periodic rows and global fiscal summary', () => {
		const globalSummary = calculateFiscalSummary(mockMultiPeriodSales)
		const dailyRows = calculatePeriodicSummaries(mockMultiPeriodSales, 'day')

		const summedBase = Number(dailyRows.reduce((acc, r) => acc + r.baseAmount, 0).toFixed(2))
		const summedTax = Number(dailyRows.reduce((acc, r) => acc + r.totalTaxAmount, 0).toFixed(2))
		const summedGrandTotal = Number(dailyRows.reduce((acc, r) => acc + r.grandTotal, 0).toFixed(2))
		const summedCount = dailyRows.reduce((acc, r) => acc + r.salesCount, 0)

		assert.equal(summedCount, globalSummary.totalSalesCount)
		assert.equal(summedGrandTotal, globalSummary.grandTotal)
		assert.ok(Math.abs(summedBase - globalSummary.totalBaseAmount) < 0.05)
		assert.ok(Math.abs(summedTax - globalSummary.totalTaxAmount) < 0.05)
	})

	it('should generate CSV in periodic summary mode (Día / Mes / Año)', () => {
		const csvDaily = buildSalesCsvContent({
			sales: mockMultiPeriodSales,
			mode: 'summary',
			summaryGrouping: 'day',
			periodTitle: 'Año 2026',
		})

		assert.ok(csvDaily.includes('SUMATORIO PERIÓDICO AGRUPADO POR DÍA'))
		assert.ok(csvDaily.includes('Intervalo / Periodo;Nº Tickets;Base Imponible (€);IVA 21% (€);IVA 10% (€);Total IVA (€);Total Facturado (€);Efectivo (€);Tarjeta (€);Otros (€)'))
		assert.ok(csvDaily.includes('15/01/2026;2'))
		assert.ok(csvDaily.includes('TOTALES ACUMULADOS DEL PERIODO'))
		assert.ok(csvDaily.includes('285,00'))

		const csvMonthly = buildSalesCsvContent({
			sales: mockMultiPeriodSales,
			mode: 'summary',
			summaryGrouping: 'month',
			periodTitle: 'Histórico Total',
		})

		assert.ok(csvMonthly.includes('SUMATORIO PERIÓDICO AGRUPADO POR MES'))
		assert.ok(csvMonthly.includes('Enero 2026;2'))
		assert.ok(csvMonthly.includes('Febrero 2026;1'))
		assert.ok(csvMonthly.includes('Noviembre 2025;1'))
	})
})

