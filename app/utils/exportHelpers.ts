import type { Ref } from 'vue'
import type { Sale } from '~~/shared/types/domain'
import {
	buildSalesCsvContent,
	calculateFiscalSummary,
	calculatePeriodicSummaries,
	formatDateEs,
	formatNumberEs,
	getTicketDisplayLabel,
	type ExportDetailMode,
	type ExportSummaryGrouping,
} from './salesExportCalculations'

export interface ExportSalesOptions {
	sales: Sale[]
	mode: ExportDetailMode
	summaryGrouping?: ExportSummaryGrouping
	periodTitle: string
	isGeneratingPdf?: Ref<boolean>
	displayToast?: (msg: string, type: 'success' | 'error') => void
}

function triggerDownload(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

export function downloadSalesExportCsv({
	sales,
	mode,
	summaryGrouping,
	periodTitle,
	displayToast,
}: ExportSalesOptions): void {
	if (!sales.length) {
		displayToast?.('No hay ventas para exportar en este periodo.', 'error')
		return
	}

	try {
		const csvContent = buildSalesCsvContent({ sales, mode, periodTitle, summaryGrouping })
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
		const cleanTitle = periodTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
		const groupingSuffix = summaryGrouping && summaryGrouping !== 'global' ? `_${summaryGrouping}` : ''
		triggerDownload(blob, `ventas_${cleanTitle}_${mode}${groupingSuffix}.csv`)
		displayToast?.('Archivo CSV descargado correctamente.', 'success')
	} catch (err) {
		console.error('Error generando CSV:', err)
		displayToast?.('No se pudo generar el archivo CSV. Inténtalo de nuevo.', 'error')
	}
}

export async function downloadSalesExportPdf({
	sales,
	mode,
	summaryGrouping,
	periodTitle,
	isGeneratingPdf,
	displayToast,
}: ExportSalesOptions): Promise<void> {
	if (!sales.length) {
		displayToast?.('No hay ventas para exportar en este periodo.', 'error')
		return
	}

	if (isGeneratingPdf && isGeneratingPdf.value) return
	if (isGeneratingPdf) isGeneratingPdf.value = true

	try {
		const { jsPDF } = await import('jspdf')
		const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

		const pageWidth = doc.internal.pageSize.getWidth()
		const pageHeight = doc.internal.pageSize.getHeight()
		const marginX = 14
		const contentWidth = pageWidth - marginX * 2
		const bottomMargin = 16
		let y = 16

		const summary = calculateFiscalSummary(sales)

		// Page header helper
		const drawDocumentHeader = () => {
			// Brand & Title
			doc.setFont('helvetica', 'bold')
			doc.setFontSize(15)
			doc.setTextColor(146, 44, 136) // Brand accent #922c88
			doc.text('BEILS - BELLEZA HONESTA', marginX, y)
			
			doc.setFontSize(9)
			doc.setFont('helvetica', 'normal')
			doc.setTextColor(100, 116, 139)
			doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - marginX, y, { align: 'right' })
			y += 6

			doc.setFont('helvetica', 'bold')
			doc.setFontSize(12)
			doc.setTextColor(30, 41, 59)
			doc.text('INFORME DE VENTAS Y FACTURACIÓN', marginX, y)
			y += 5

			// Subtitle pills info
			doc.setFont('helvetica', 'normal')
			doc.setFontSize(8.5)
			doc.setTextColor(71, 85, 105)
			const modeLabel = mode === 'breakdown'
				? 'Desglose detallado por ítem'
				: mode === 'individual'
					? 'Listado de tickets individuales'
					: summaryGrouping && summaryGrouping !== 'global'
						? `Sumatorio periódico (${summaryGrouping === 'day' ? 'por día' : summaryGrouping === 'week' ? 'por semana' : summaryGrouping === 'month' ? 'por mes' : 'por año'})`
						: 'Sumatorio fiscal para autónomos'
			doc.text(`Periodo: ${periodTitle}   |   Modalidad: ${modeLabel}`, marginX, y)
			y += 6

			// Subtle divider line
			doc.setDrawColor(226, 232, 240)
			doc.setLineWidth(0.3)
			doc.line(marginX, y, marginX + contentWidth, y)
			y += 6
		}

		// Ensure space on current page or add new page
		const ensureSpace = (needed: number, onNewPage?: () => void) => {
			if (y + needed > pageHeight - bottomMargin) {
				doc.addPage()
				y = 16
				onNewPage?.()
			}
		}

		// Draw top summary KPIs box
		const drawKpiSummaryBoxes = () => {
			ensureSpace(22)
			const boxWidth = (contentWidth - 9) / 4
			const boxHeight = 16

			const boxes = [
				{ label: 'FACTURACIÓN TOTAL', value: `${formatNumberEs(summary.grandTotal)} EUR` },
				{ label: 'BASE IMPONIBLE', value: `${formatNumberEs(summary.totalBaseAmount)} EUR` },
				{ label: 'TOTAL CUOTA IVA', value: `${formatNumberEs(summary.totalTaxAmount)} EUR` },
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

		// -------------------------------------------------------------
		// MODE 1: BREAKDOWN (Desglose total con líneas de ítem)
		// -------------------------------------------------------------
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

				// Ticket primary row
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

				// Items sub-table
				if (sale.items && sale.items.length > 0) {
					for (const item of sale.items) {
						doc.setFont('helvetica', 'normal')
						doc.setFontSize(7)
						doc.setTextColor(71, 85, 105)

						const itemName = `${item.quantity}x ${item.name || 'Servicio/Producto'}`
						const itemUnitPrice = `${formatNumberEs(item.unit_price || 0)} EUR/ud`
						const itemTax = `IVA ${item.tax_rate ?? 21}%`
						const itemSubtotal = `${formatNumberEs(item.subtotal || 0)} EUR`

						// Left indent dash
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
		}

		// -------------------------------------------------------------
		// MODE 2: INDIVIDUAL (Solo venta individual en filas limpias)
		// -------------------------------------------------------------
		else if (mode === 'individual') {
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
		}

		// -------------------------------------------------------------
		// MODE 3: SUMMARY (Solo sumatorio / Declaración de Autónomos)
		// -------------------------------------------------------------
		else if (mode === 'summary') {
			if (summaryGrouping && summaryGrouping !== 'global') {
				const periodicRows = calculatePeriodicSummaries(sales, summaryGrouping)
				const groupingTitle = summaryGrouping === 'day' ? 'Día' : summaryGrouping === 'week' ? 'Semana' : summaryGrouping === 'month' ? 'Mes' : 'Año'

				ensureSpace(35)
				doc.setFont('helvetica', 'bold')
				doc.setFontSize(11)
				doc.setTextColor(30, 41, 59)
				doc.text(`Sumatorio Periódico Agrupado por ${groupingTitle}`, marginX, y)
				y += 5

				const periodicCols = [
					{ label: 'Intervalo / Periodo', width: 44 },
					{ label: 'Tickets', width: 18, align: 'center' as const },
					{ label: 'Base Imponible (EUR)', width: 32, align: 'right' as const },
					{ label: 'Cuota IVA 21%', width: 26, align: 'right' as const },
					{ label: 'Cuota IVA 10%', width: 26, align: 'right' as const },
					{ label: 'Total (EUR)', width: 36, align: 'right' as const },
				]

				const drawPeriodicHeader = () => {
					doc.setFillColor(241, 245, 249)
					doc.rect(marginX, y, contentWidth, 6, 'F')
					doc.setFontSize(7.2)
					doc.setTextColor(51, 65, 85)

					let hx = marginX
					periodicCols.forEach(col => {
						if (col.align === 'right') {
							doc.text(col.label, hx + col.width - 2, y + 4.2, { align: 'right' })
						} else if (col.align === 'center') {
							doc.text(col.label, hx + col.width / 2, y + 4.2, { align: 'center' })
						} else {
							doc.text(col.label, hx + 2, y + 4.2)
						}
						hx += col.width
					})
					y += 6.5
				}

				drawPeriodicHeader()

				for (const row of periodicRows) {
					ensureSpace(8, () => {
						drawDocumentHeader()
						drawPeriodicHeader()
					})

					doc.setFont('helvetica', 'normal')
					doc.setFontSize(7.5)
					doc.setTextColor(30, 41, 59)

					let rx = marginX
					// Interval label
					doc.text(row.label, rx + 2, y + 4)
					rx += periodicCols[0]!.width

					// Tickets
					doc.text(String(row.salesCount), rx + periodicCols[1]!.width / 2, y + 4, { align: 'center' })
					rx += periodicCols[1]!.width

					// Base
					doc.text(formatNumberEs(row.baseAmount), rx + periodicCols[2]!.width - 2, y + 4, { align: 'right' })
					rx += periodicCols[2]!.width

					// IVA 21%
					doc.text(formatNumberEs(row.tax21Amount), rx + periodicCols[3]!.width - 2, y + 4, { align: 'right' })
					rx += periodicCols[3]!.width

					// IVA 10%
					doc.text(formatNumberEs(row.tax10Amount), rx + periodicCols[4]!.width - 2, y + 4, { align: 'right' })
					rx += periodicCols[4]!.width

					// Total
					doc.setFont('helvetica', 'bold')
					doc.text(formatNumberEs(row.grandTotal), rx + periodicCols[5]!.width - 2, y + 4, { align: 'right' })

					y += 6
					doc.setDrawColor(226, 232, 240)
					doc.line(marginX, y, marginX + contentWidth, y)
				}

				// Totals row
				ensureSpace(12, () => {
					drawDocumentHeader()
					drawPeriodicHeader()
				})
				y += 1
				doc.setFont('helvetica', 'bold')
				doc.setFontSize(8)
				doc.setTextColor(15, 23, 42)
				doc.text('TOTALES ACUMULADOS', marginX + 2, y + 4)
				doc.text(String(summary.totalSalesCount), marginX + periodicCols[0]!.width + periodicCols[1]!.width / 2, y + 4, { align: 'center' })
				doc.text(formatNumberEs(summary.totalBaseAmount), marginX + periodicCols[0]!.width + periodicCols[1]!.width + periodicCols[2]!.width - 2, y + 4, { align: 'right' })
				doc.text(formatNumberEs(summary.taxesByRate[21]?.taxAmount || 0), marginX + periodicCols[0]!.width + periodicCols[1]!.width + periodicCols[2]!.width + periodicCols[3]!.width - 2, y + 4, { align: 'right' })
				doc.text(formatNumberEs(summary.taxesByRate[10]?.taxAmount || 0), marginX + periodicCols[0]!.width + periodicCols[1]!.width + periodicCols[2]!.width + periodicCols[3]!.width + periodicCols[4]!.width - 2, y + 4, { align: 'right' })
				doc.text(formatNumberEs(summary.grandTotal), marginX + contentWidth - 2, y + 4, { align: 'right' })
				y += 12

				// Methods breakdown table
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
			} else {
				// Tax breakdown table
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

				// Total row for taxes
				y += 1
				doc.setFont('helvetica', 'bold')
				doc.text('TOTALES FISCALES', marginX + 2, y + 4)
				doc.text(`${formatNumberEs(summary.totalBaseAmount)} EUR`, marginX + 85 - 2, y + 4, { align: 'right' })
				doc.text(`${formatNumberEs(summary.totalTaxAmount)} EUR`, marginX + 135 - 2, y + 4, { align: 'right' })
				doc.text(`${formatNumberEs(summary.grandTotal)} EUR`, marginX + contentWidth - 2, y + 4, { align: 'right' })
				y += 12

				// Payment methods summary table
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
		}

		// Add page numbers at the footer of all pages
		const totalPages = doc.getNumberOfPages()
		for (let i = 1; i <= totalPages; i++) {
			doc.setPage(i)
			doc.setFont('helvetica', 'normal')
			doc.setFontSize(7.5)
			doc.setTextColor(148, 163, 184)
			doc.text(`Beils Belleza Honesta - Documento contable y de gestión interna`, marginX, pageHeight - 8)
			doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 8, { align: 'right' })
		}

		const cleanTitle = periodTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
		const groupingSuffix = summaryGrouping && summaryGrouping !== 'global' ? `_${summaryGrouping}` : ''
		doc.save(`ventas_${cleanTitle}_${mode}${groupingSuffix}.pdf`)
		displayToast?.('Documento PDF generado y descargado con éxito.', 'success')
	} catch (err) {
		console.error('Error generando PDF de ventas:', err)
		displayToast?.('No se pudo generar el archivo PDF. Inténtalo de nuevo.', 'error')
	} finally {
		if (isGeneratingPdf) isGeneratingPdf.value = false
	}
}

// Backward compatibility wrappers
export function exportVentasCsv({
	filteredSales,
	displayToast,
}: {
	filteredSales: Sale[]
	displayToast: (msg: string, type: 'success' | 'error') => void
	[key: string]: unknown
}) {
	downloadSalesExportCsv({
		sales: filteredSales,
		mode: 'breakdown',
		periodTitle: 'Historico',
		displayToast,
	})
}

export async function exportVentasPdf({
	filteredSales,
	isGeneratingPdf,
	displayToast,
}: {
	filteredSales: Sale[]
	isGeneratingPdf: Ref<boolean>
	displayToast: (msg: string, type: 'success' | 'error') => void
	[key: string]: unknown
}) {
	await downloadSalesExportPdf({
		sales: filteredSales,
		mode: 'breakdown',
		periodTitle: 'Historico',
		isGeneratingPdf,
		displayToast,
	})
}
