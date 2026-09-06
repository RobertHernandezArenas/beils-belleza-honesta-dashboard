import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Sale } from '../shared/types/domain'

import {
	getQuarterDateBounds,
	getPeriodDateBounds,
	calculateFiscalSummary,
	buildSalesCsvContent,
} from '../app/utils/salesExportCalculations'

describe('Sales Export & Quarterly Filters Logic', () => {
	it('should calculate accurate date bounds for quarters Q1, Q2, Q3, Q4 (20-to-20 Spanish autónomos cycle)', () => {
		const year = 2026

		// Q1: 20 Ene 2026 - 20 Abr 2026
		const q1 = getQuarterDateBounds(1, year)
		assert.equal(q1.start.getFullYear(), 2026)
		assert.equal(q1.start.getMonth(), 0) // January (0-indexed)
		assert.equal(q1.start.getDate(), 20)
		assert.equal(q1.end.getFullYear(), 2026)
		assert.equal(q1.end.getMonth(), 3) // April
		assert.equal(q1.end.getDate(), 20)

		// Q2: 20 Abr 2026 - 20 Jul 2026
		const q2 = getQuarterDateBounds(2, year)
		assert.equal(q2.start.getMonth(), 3) // April
		assert.equal(q2.start.getDate(), 20)
		assert.equal(q2.end.getMonth(), 6) // July
		assert.equal(q2.end.getDate(), 20)

		// Q3: 20 Jul 2026 - 20 Oct 2026
		const q3 = getQuarterDateBounds(3, year)
		assert.equal(q3.start.getMonth(), 6) // July
		assert.equal(q3.start.getDate(), 20)
		assert.equal(q3.end.getMonth(), 9) // October
		assert.equal(q3.end.getDate(), 20)

		// Q4: 20 Oct 2026 - 20 Ene 2027 (Year roll)
		const q4 = getQuarterDateBounds(4, year)
		assert.equal(q4.start.getFullYear(), 2026)
		assert.equal(q4.start.getMonth(), 9) // October
		assert.equal(q4.start.getDate(), 20)
		assert.equal(q4.end.getFullYear(), 2027)
		assert.equal(q4.end.getMonth(), 0) // January next year
		assert.equal(q4.end.getDate(), 20)
	})

	it('should calculate period bounds for all timeframe modes', () => {
		const boundsDay = getPeriodDateBounds('day')
		assert.ok(boundsDay.start)
		assert.ok(boundsDay.end)

		const boundsQuarter = getPeriodDateBounds('quarter', { quarter: 2, year: 2026 })
		assert.equal(boundsQuarter.start?.getMonth(), 3)
		assert.equal(boundsQuarter.start?.getDate(), 20)
		assert.equal(boundsQuarter.end?.getMonth(), 6)
		assert.equal(boundsQuarter.end?.getDate(), 20)

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
})
