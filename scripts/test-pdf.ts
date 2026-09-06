import 'dotenv/config'
import fs from 'node:fs'
import { prisma } from '../server/utils/prisma'
import { jsPDF } from 'jspdf'
import type { Sale } from '../shared/types/domain'
import { calculateFiscalSummary, formatNumberEs, formatDateEs, getTicketDisplayLabel } from '../app/utils/salesExportCalculations'

async function run() {
	const carts = (await prisma.cart.findMany({
		where: { status: 'completed' },
		include: {
			user: { select: { name: true, surname: true, email: true, avatar: true } },
			items: true,
			debts: true,
		},
		orderBy: { created_at: 'desc' },
		take: 5,
	})) as unknown as Sale[]

	const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const marginX = 14
	const contentWidth = pageWidth - marginX * 2
	const bottomMargin = 16
	let y = 16

	const summary = calculateFiscalSummary(carts)
	const mode = 'breakdown'

	console.log('pageWidth:', pageWidth, 'pageHeight:', pageHeight)
	console.log('carts total:', carts.length)

	// Draw document header
	doc.setFont('helvetica', 'bold')
	doc.setFontSize(15)
	doc.setTextColor(146, 44, 136)
	doc.text('BEILS · BELLEZA HONESTA', marginX, y)
	y += 6

	console.log('Header drawn, y:', y)

	// Ticket primary row
	for (const sale of carts) {
		console.log('Drawing ticket:', sale.cart_id, 'y:', y)
		doc.setFillColor(248, 250, 252)
		doc.rect(marginX, y, contentWidth, 5.5, 'F')
		doc.setFont('helvetica', 'bold')
		doc.setFontSize(7.5)
		doc.setTextColor(30, 41, 59)

		const clientName = sale.user ? `${sale.user.name || ''} ${sale.user.surname || ''}`.trim() : 'Cliente general'
		const ticketLabel = getTicketDisplayLabel(sale)

		doc.text(ticketLabel, marginX + 2, y + 3.8)
		doc.setFont('helvetica', 'normal')
		doc.text(formatDateEs(sale.created_at), marginX + 44, y + 3.8)
		doc.text(doc.splitTextToSize(clientName, 42)[0] || '', marginX + 82, y + 3.8)
		doc.text((sale.payment_method || 'N/A').toUpperCase(), marginX + 126, y + 3.8)

		doc.setFont('helvetica', 'bold')
		doc.text(`${formatNumberEs(sale.total)} €`, marginX + contentWidth - 2, y + 3.8, { align: 'right' })
		y += 5.5

		if (sale.items && sale.items.length > 0) {
			for (const item of sale.items) {
				doc.setFont('helvetica', 'normal')
				doc.setFontSize(7)
				doc.setTextColor(71, 85, 105)

				const itemName = `${item.quantity}x ${item.name || 'Servicio/Producto'}`
				const itemUnitPrice = `${formatNumberEs(item.unit_price || 0)} €/ud`
				const itemTax = `IVA ${item.tax_rate ?? 21}%`
				const itemSubtotal = `${formatNumberEs(item.subtotal || 0)} €`

				doc.text('•', marginX + 5, y + 3.5)
				doc.text(doc.splitTextToSize(itemName, 75)[0] || '', marginX + 8, y + 3.5)
				doc.text(itemUnitPrice, marginX + 85, y + 3.5)
				doc.text(itemTax, marginX + 115, y + 3.5)
				doc.text(itemSubtotal, marginX + contentWidth - 6, y + 3.5, { align: 'right' })

				y += 4.5
			}
		}
		y += 2
	}

	const buf = Buffer.from(doc.output('arraybuffer'))
	fs.writeFileSync('real-test-out.pdf', buf)
	console.log('Wrote real-test-out.pdf, size:', buf.length)
	await prisma.$disconnect()
}

run().catch(console.error)
