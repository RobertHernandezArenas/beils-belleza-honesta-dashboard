import 'dotenv/config'
import fs from 'node:fs'
import { prisma } from '../server/utils/prisma'
import { jsPDF } from 'jspdf'
import type { Sale } from '../shared/types/domain'
import {
	buildSalesCsvContent,
	calculateFiscalSummary,
	formatDateEs,
	formatNumberEs,
	getTicketDisplayLabel,
	type ExportDetailMode,
} from '../app/utils/salesExportCalculations'

async function testExportFull() {
	const sales = (await prisma.cart.findMany({
		where: { status: 'completed' },
		include: {
			user: { select: { name: true, surname: true, email: true, avatar: true } },
			items: true,
			debts: true,
		},
		orderBy: { created_at: 'desc' },
	})) as unknown as Sale[]

	for (const mode of ['breakdown', 'individual', 'summary'] as const) {
		const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

		const pageWidth = doc.internal.pageSize.getWidth()
		const pageHeight = doc.internal.pageSize.getHeight()
		const marginX = 14
		const contentWidth = pageWidth - marginX * 2
		const bottomMargin = 16
		let y = 16
		const periodTitle = 'Septiembre 2026'

		const summary = calculateFiscalSummary(sales)

		// Page header helper
		const drawDocumentHeader = () => {
			doc.setFont('helvetica', 'bold')
			doc.setFontSize(15)
			doc.setTextColor(146, 44, 136)
			doc.text('BEILS · BELLEZA HONESTA', marginX, y)
			
			doc.setFontSize(9)
			doc.setFont('helvetica', 'normal')
			doc.setTextColor(100, 116, 139)
			doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - marginX, y, { align: 'right' })
			y += 6

			doc.setFont('helvetica', 'bold')
			doc.setFontSize(12)
			doc.setTextColor(30, 41, 59)
			doc.text('INFORME DE VENTAS Y FACTURACIÓN', marginX, y)
			y += 5

			doc.setFont('helvetica', 'normal')
			doc.setFontSize(8.5)
			doc.setTextColor(71, 85, 105)
			const modeLabel = mode === 'breakdown' ? 'Desglose detallado por ítem' : mode === 'individual' ? 'Listado de tickets individuales' : 'Sumatorio fiscal para autónomos'
			doc.text(`Periodo: ${periodTitle}   |   Modalidad: ${modeLabel}`, marginX, y)
			y += 6

			doc.setDrawColor(226, 232, 240)
			doc.setLineWidth(0.3)
			doc.line(marginX, y, marginX + contentWidth, y)
			y += 6
		}

		const ensureSpace = (needed: number, onNewPage?: () => void) => {
			if (y + needed > pageHeight - bottomMargin) {
				doc.addPage()
				y = 16
				onNewPage?.()
			}
		}

		const drawKpiSummaryBoxes = () => {
			ensureSpace(22)
			const boxWidth = (contentWidth - 9) / 4
			const boxHeight = 16

			const boxes = [
				{ label: 'FACTURACIÓN TOTAL', value: `${formatNumberEs(summary.grandTotal)} €` },
				{ label: 'BASE IMPONIBLE', value: `${formatNumberEs(summary.totalBaseAmount)} €` },
				{ label: 'TOTAL CUOTA IVA', value: `${formatNumberEs(summary.totalTaxAmount)} €` },
				{ label: 'Nº DE TICKETS', value: `${summary.totalSalesCount}` },
			]

			boxes.forEach((box, i) => {
				const bx = marginX + i * (boxWidth + 3)
				doc.setFillColor(248, 250, 252)
				doc.setDrawColor(226, 232, 240)
				doc.roundedRect(bx, y, boxWidth, boxHeight, 2, 2, 'FD')

				doc.setFont('helvetica', 'bold')
				doc.setFontSize(6.5)
				doc.setTextColor(100, 116, 139)
				doc.text(box.label, bx + 3, y + 5)

				doc.setFontSize(10.5)
				doc.setTextColor(15, 23, 42)
				doc.text(box.value, bx + 3, y + 12)
			})

			y += boxHeight + 8
		}

		drawDocumentHeader()
		drawKpiSummaryBoxes()

		if (mode === 'breakdown') {
			const ticketCols = [
				{ label: 'ID Ticket / Factura', width: 42 },
				{ label: 'Fecha y hora', width: 38 },
				{ label: 'Cliente', width: 44 },
				{ label: 'Método', width: 28 },
				{ label: 'Total Ticket (EUR)', width: 30, align: 'right' as const },
			]

			const drawTicketTableHeader = () => {
				doc.setFillColor(241, 245, 249)
				doc.rect(marginX, y, contentWidth, 6, 'F')
				doc.setFont('helvetica', 'bold')
				doc.setFontSize(7.5)
				doc.setTextColor(51, 65, 85)

				let cx = marginX
				ticketCols.forEach(col => {
					if (col.align === 'right') {
						doc.text(col.label, cx + col.width - 2, y + 4.2, { align: 'right' })
					} else {
						doc.text(col.label, cx + 2, y + 4.2)
					}
					cx += col.width
				})
				y += 6.5
			}

			drawTicketTableHeader()

			for (const sale of sales) {
				const itemsCount = sale.items?.length || 1
				const neededSpace = 6 + itemsCount * 5 + 4
				ensureSpace(neededSpace, () => {
					drawTicketTableHeader()
				})

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
				doc.text(`${formatNumberEs(sale.total)} EUR`, marginX + contentWidth - 2, y + 3.8, { align: 'right' })
				y += 5.5

				if (sale.items && sale.items.length > 0) {
					for (const item of sale.items) {
						doc.setFont('helvetica', 'normal')
						doc.setFontSize(7)
						doc.setTextColor(71, 85, 105)

						const itemName = `${item.quantity}x ${item.name || 'Servicio/Producto'}`
						const itemUnitPrice = `${formatNumberEs(item.unit_price || 0)} EUR/ud`
						const itemTax = `IVA ${item.tax_rate ?? 21}%`
						const itemSubtotal = `${formatNumberEs(item.subtotal || 0)} EUR`

						doc.text('-', marginX + 5, y + 3.5)
						doc.text(doc.splitTextToSize(itemName, 75)[0] || '', marginX + 8, y + 3.5)
						doc.text(itemUnitPrice, marginX + 85, y + 3.5)
						doc.text(itemTax, marginX + 115, y + 3.5)
						doc.text(itemSubtotal, marginX + contentWidth - 6, y + 3.5, { align: 'right' })

						y += 4.5
					}
				} else {
					doc.setFont('helvetica', 'normal')
					doc.setFontSize(7)
					doc.setTextColor(100, 116, 139)
					doc.text('- Venta directa sin desglose de líneas', marginX + 8, y + 3.5)
					y += 4.5
				}

				doc.setDrawColor(226, 232, 240)
				doc.setLineWidth(0.2)
				doc.line(marginX, y, marginX + contentWidth, y)
				y += 2
			}
		} else if (mode === 'individual') {
			const cols = [
				{ label: 'ID Ticket / Factura', width: 44 },
				{ label: 'Fecha y hora', width: 40 },
				{ label: 'Cliente', width: 42 },
				{ label: 'Items', width: 14, align: 'center' as const },
				{ label: 'Método de pago', width: 22 },
				{ label: 'Total (EUR)', width: 20, align: 'right' as const },
			]

			const drawIndividualHeader = () => {
				doc.setFillColor(241, 245, 249)
				doc.rect(marginX, y, contentWidth, 6, 'F')
				doc.setFont('helvetica', 'bold')
				doc.setFontSize(7.5)
				doc.setTextColor(51, 65, 85)

				let cx = marginX
				cols.forEach(col => {
					if (col.align === 'right') {
						doc.text(col.label, cx + col.width - 2, y + 4.2, { align: 'right' })
					} else if (col.align === 'center') {
						doc.text(col.label, cx + col.width / 2, y + 4.2, { align: 'center' })
					} else {
						doc.text(col.label, cx + 2, y + 4.2)
					}
					cx += col.width
				})
				y += 6.5
			}

			drawIndividualHeader()

			sales.forEach((sale, idx) => {
				ensureSpace(6, () => {
					drawIndividualHeader()
				})

				if (idx % 2 === 1) {
					doc.setFillColor(248, 250, 252)
					doc.rect(marginX, y, contentWidth, 5.2, 'F')
				}

				doc.setFont('helvetica', 'normal')
				doc.setFontSize(7.5)
				doc.setTextColor(30, 41, 59)

				const clientName = sale.user ? `${sale.user.name || ''} ${sale.user.surname || ''}`.trim() : 'Cliente general'
				const itemsCount = sale.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1

				doc.setFont('helvetica', 'bold')
				doc.text(getTicketDisplayLabel(sale), marginX + 2, y + 3.8)
				doc.setFont('helvetica', 'normal')
				doc.text(formatDateEs(sale.created_at), marginX + 46, y + 3.8)
				doc.text(doc.splitTextToSize(clientName, 40)[0] || '', marginX + 86, y + 3.8)
				doc.text(String(itemsCount), marginX + 135, y + 3.8, { align: 'center' })
				doc.text((sale.payment_method || 'N/A').toUpperCase(), marginX + 144, y + 3.8)

				doc.setFont('helvetica', 'bold')
				doc.text(formatNumberEs(sale.total), marginX + contentWidth - 2, y + 3.8, { align: 'right' })

				y += 5.5
				doc.setDrawColor(241, 245, 249)
				doc.setLineWidth(0.2)
				doc.line(marginX, y, marginX + contentWidth, y)
			})
		} else if (mode === 'summary') {
			ensureSpace(40)
			doc.setFont('helvetica', 'bold')
			doc.setFontSize(11)
			doc.setTextColor(30, 41, 59)
			doc.text('Desglose de Bases Imponibles y Cuotas de IVA', marginX, y)
			y += 5

			const taxCols = [
				{ label: 'Tipo Impositivo', width: 40 },
				{ label: 'Base Imponible (EUR)', width: 45, align: 'right' as const },
				{ label: 'Cuota IVA (EUR)', width: 50, align: 'right' as const },
				{ label: 'Total Facturado (EUR)', width: 47, align: 'right' as const },
			]

			doc.setFillColor(241, 245, 249)
			doc.rect(marginX, y, contentWidth, 6, 'F')
			doc.setFontSize(7.5)
			doc.setTextColor(51, 65, 85)

			let cx = marginX
			taxCols.forEach(col => {
				if (col.align === 'right') {
					doc.text(col.label, cx + col.width - 2, y + 4.2, { align: 'right' })
				} else {
					doc.text(col.label, cx + 2, y + 4.2)
				}
				cx += col.width
			})
			y += 6.5

			for (const [rate, bucket] of Object.entries(summary.taxesByRate)) {
				doc.setFont('helvetica', 'normal')
				doc.setFontSize(8)
				doc.setTextColor(30, 41, 59)

				doc.text(`Régimen General (${rate}%)`, marginX + 2, y + 4)
				doc.text(`${formatNumberEs(bucket.baseAmount)} EUR`, marginX + 85 - 2, y + 4, { align: 'right' })
				doc.text(`${formatNumberEs(bucket.taxAmount)} EUR`, marginX + 135 - 2, y + 4, { align: 'right' })
				doc.text(`${formatNumberEs(bucket.totalAmount)} EUR`, marginX + contentWidth - 2, y + 4, { align: 'right' })

				y += 6
				doc.setDrawColor(226, 232, 240)
				doc.line(marginX, y, marginX + contentWidth, y)
			}

			y += 1
			doc.setFont('helvetica', 'bold')
			doc.text('TOTALES FISCALES', marginX + 2, y + 4)
			doc.text(`${formatNumberEs(summary.totalBaseAmount)} EUR`, marginX + 85 - 2, y + 4, { align: 'right' })
			doc.text(`${formatNumberEs(summary.totalTaxAmount)} EUR`, marginX + 135 - 2, y + 4, { align: 'right' })
			doc.text(`${formatNumberEs(summary.grandTotal)} EUR`, marginX + contentWidth - 2, y + 4, { align: 'right' })
			y += 12

			ensureSpace(45)
			doc.setFont('helvetica', 'bold')
			doc.setFontSize(11)
			doc.setTextColor(30, 41, 59)
			doc.text('Desglose de Facturación por Método de Cobro', marginX, y)
			y += 5

			const payCols = [
				{ label: 'Método de Cobro', width: 60 },
				{ label: 'Operaciones', width: 35, align: 'center' as const },
				{ label: 'Importe Total (EUR)', width: 47, align: 'right' as const },
				{ label: '% sobre Total', width: 40, align: 'right' as const },
			]

			doc.setFillColor(241, 245, 249)
			doc.rect(marginX, y, contentWidth, 6, 'F')
			doc.setFontSize(7.5)
			doc.setTextColor(51, 65, 85)

			let px = marginX
			payCols.forEach(col => {
				if (col.align === 'right') {
					doc.text(col.label, px + col.width - 2, y + 4.2, { align: 'right' })
				} else if (col.align === 'center') {
					doc.text(col.label, px + col.width / 2, y + 4.2, { align: 'center' })
				} else {
					doc.text(col.label, px + 2, y + 4.2)
				}
				px += col.width
			})
			y += 6.5

			for (const [method, info] of Object.entries(summary.methodsSummary)) {
				doc.setFont('helvetica', 'normal')
				doc.setFontSize(8)
				doc.setTextColor(30, 41, 59)

				const pct = summary.grandTotal > 0 ? (info.total / summary.grandTotal) * 100 : 0
				doc.text(method.toUpperCase(), marginX + 2, y + 4)
				doc.text(String(info.count), marginX + 77.5, y + 4, { align: 'center' })
				doc.text(`${formatNumberEs(info.total)} EUR`, marginX + 142 - 2, y + 4, { align: 'right' })
				doc.text(`${pct.toFixed(1).replace('.', ',')} %`, marginX + contentWidth - 2, y + 4, { align: 'right' })

				y += 6
				doc.setDrawColor(226, 232, 240)
				doc.line(marginX, y, marginX + contentWidth, y)
			}
		}

		const totalPages = doc.getNumberOfPages()
		console.log(`Mode ${mode}: total pages = ${totalPages}`)
		const buf = Buffer.from(doc.output('arraybuffer'))
		fs.writeFileSync(`full-${mode}.pdf`, buf)
		console.log(`Saved full-${mode}.pdf, size: ${buf.length}`)
	}

	await prisma.$disconnect()
}

testExportFull().catch(console.error)
