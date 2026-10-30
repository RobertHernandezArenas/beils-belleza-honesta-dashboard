import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Sale, Debt } from '../shared/types/domain'
import { buildReceiptHtml, buildInvoiceHtml, buildDebtReceiptHtml } from '../app/utils/printTemplates'

const salon = { name: 'Salon Real S.L.', nif: 'B87654321', address: 'C/ Real 7, Sevilla', phone: '600111222' }

const baseSale = (overrides: Partial<Sale> = {}): Sale => ({
	cart_id: 'abcd1234-0000-0000-0000-000000000000',
	status: 'completed',
	subtotal: 100,
	discount: 0,
	total: 100,
	payment_method: 'card',
	invoice_number: 'BBH-01-2026-0042',
	invoice_type: 'I',
	created_at: '2026-01-15T10:00:00.000Z',
	items: [
		{ cart_item_id: 'i1', name: 'Limpieza facial', item_type: 'service', quantity: 1, unit_price: 100, tax_rate: 21, subtotal: 100, total: 100 },
	] as Sale['items'],
	user: { name: 'Ana', surname: 'Lopez' },
	...overrides,
})

const debtSale = (): Sale =>
	baseSale({
		payment_method: 'debt',
		debts: [
			{
				debt_id: 'd1',
				user_id: 'u1',
				amount: 100,
				remaining: 30,
				status: 'partial',
				payments: [
					{ payment_id: 'p1', debt_id: 'd1', amount: 50, payment_method: 'cash', payment_date: '2026-02-01T10:00:00.000Z' },
					{ payment_id: 'p2', debt_id: 'd1', amount: 20, payment_method: 'bizum', payment_date: '2026-03-01T10:00:00.000Z' },
				],
			},
		],
	})

describe('buildReceiptHtml (ticket)', () => {
	it('prints the real business data and never the hard-coded CIF', () => {
		const html = buildReceiptHtml(baseSale(), salon)
		assert.ok(html.includes('B87654321'))
		assert.ok(html.includes('Salon Real S.L.'))
		assert.ok(html.includes('C/ Real 7, Sevilla'))
		assert.ok(html.includes('600111222'))
		assert.ok(!html.includes('B12345678'))
	})

	it('shows the real invoice number, not a cart id prefix', () => {
		const html = buildReceiptHtml(baseSale(), salon)
		assert.ok(html.includes('BBH-01-2026-0042'))
		assert.ok(!html.includes('ABCD1234'))
	})

	it('falls back to "Pendiente de factura" for a legacy cart without invoice', () => {
		const html = buildReceiptHtml(baseSale({ invoice_number: null }), salon)
		assert.ok(html.includes('Pendiente de factura'))
		assert.ok(!html.includes('ABCD1234'))
	})

	it('labels every payment method', () => {
		assert.ok(buildReceiptHtml(baseSale({ payment_method: 'bizum' }), salon).includes('BIZUM'))
		assert.ok(buildReceiptHtml(baseSale({ payment_method: 'transfer' }), salon).includes('TRANSFERENCIA'))
		assert.ok(!buildReceiptHtml(baseSale({ payment_method: 'bizum' }), salon).includes('Tarjeta/Transferencia'))
	})

	it('prints the breakdown of a mixed payment', () => {
		const sale = baseSale({
			payment_method: 'mixed',
			payment_breakdown: JSON.stringify([{ method: 'cash', amount: 30 }, { method: 'card', amount: 70 }]),
		})
		assert.ok(buildReceiptHtml(sale, salon).includes('Mixto: Efectivo 30,00 € · Tarjeta 70,00 €'))
	})

	it('keeps the discount lines', () => {
		const html = buildReceiptHtml(baseSale({ subtotal: 100, discount: 10, total: 90 }), salon)
		assert.ok(html.includes('Subtotal'))
		assert.ok(html.includes('-10.00€'))
	})

	it('a debt sale does not say "pagado" and shows what is pending', () => {
		const html = buildReceiptHtml(debtSale(), salon)
		assert.ok(!html.includes('TOTAL PAGADO'))
		assert.ok(html.includes('Parcial · 2 pagos'))
		assert.ok(html.includes('30,00 €'))
	})
})

describe('buildInvoiceHtml', () => {
	it('prints the real business data', () => {
		const html = buildInvoiceHtml(baseSale(), salon)
		assert.ok(html.includes('B87654321'))
		assert.ok(html.includes('C/ Real 7, Sevilla'))
		assert.ok(!html.includes('B12345678'))
		assert.ok(!html.includes('Muestra 123'))
	})

	it('uses the shared label for the payment method and the mixed breakdown', () => {
		assert.ok(buildInvoiceHtml(baseSale({ payment_method: 'bizum' }), salon).includes('Bizum'))
		const mixed = baseSale({
			payment_method: 'mixed',
			payment_breakdown: [{ method: 'cash', amount: 40 }, { method: 'transfer', amount: 60 }],
		})
		assert.ok(buildInvoiceHtml(mixed, salon).includes('Mixto: Efectivo 40,00 € · Transferencia 60,00 €'))
	})

	it('lists the payment history of a debt sale with totals and what remains', () => {
		const html = buildInvoiceHtml(debtSale(), salon)
		assert.ok(html.includes('Historial de pagos'))
		assert.ok(html.includes('2 pagos'))
		assert.ok(html.includes('Efectivo'))
		assert.ok(html.includes('Bizum'))
		assert.ok(html.includes('50,00 €'))
		assert.ok(html.includes('20,00 €'))
		assert.ok(html.includes('Total cobrado'))
		assert.ok(html.includes('70,00 €'))
		assert.ok(html.includes('Pendiente'))
		assert.ok(html.includes('30,00 €'))
	})

	it('marks a fully collected debt sale as paid', () => {
		const sale = debtSale()
		sale.debts![0]!.remaining = 0
		sale.debts![0]!.status = 'paid'
		const html = buildInvoiceHtml(sale, salon)
		assert.ok(html.includes('Pagada'))
		assert.ok(!html.includes('Pendiente:'))
	})

	it('shows no history block for a sale paid on the spot', () => {
		assert.ok(!buildInvoiceHtml(baseSale(), salon).includes('Historial de pagos'))
	})
})

describe('buildDebtReceiptHtml (ticket de cobro)', () => {
	const debt: Debt = {
		debt_id: 'd1',
		user_id: 'u1',
		amount: 100,
		remaining: 30,
		status: 'partial',
		payments: [
			{ payment_id: 'p1', debt_id: 'd1', amount: 50, payment_method: 'cash', payment_date: '2026-02-01T10:00:00.000Z' },
			{
				payment_id: 'p2',
				debt_id: 'd1',
				amount: 20,
				payment_method: 'mixed',
				payment_breakdown: JSON.stringify([{ method: 'cash', amount: 5 }, { method: 'card', amount: 15 }]),
				payment_date: '2026-03-01T10:00:00.000Z',
			},
		],
	}

	it('shows amount, method with breakdown, payment number, total paid and remaining', () => {
		const html = buildDebtReceiptHtml({ debt, paymentId: 'p2', invoiceNumber: 'BBH-01-2026-0042', clientName: 'Ana Lopez' }, salon)
		assert.ok(html.includes('TICKET DE COBRO'))
		assert.ok(html.includes('B87654321'))
		assert.ok(html.includes('Pago 2 de 2'))
		assert.ok(html.includes('20,00 €'))
		assert.ok(html.includes('Mixto: Efectivo 5,00 € · Tarjeta 15,00 €'))
		assert.ok(html.includes('70,00 €'))
		assert.ok(html.includes('30,00 €'))
		assert.ok(html.includes('BBH-01-2026-0042'))
		assert.ok(html.includes('Ana Lopez'))
	})

	it('numbers an earlier payment against the payments made so far', () => {
		const html = buildDebtReceiptHtml({ debt, paymentId: 'p1', invoiceNumber: null, clientName: 'Ana Lopez' }, salon)
		assert.ok(html.includes('Pago 1 de 2'))
		assert.ok(html.includes('Pendiente de factura'))
	})

	it('returns null for an unknown payment', () => {
		assert.equal(buildDebtReceiptHtml({ debt, paymentId: 'nope', invoiceNumber: null, clientName: '' }, salon), null)
	})
})
