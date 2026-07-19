import type { Ref } from 'vue'
import type { TicketSeriesRow } from '~/composables/useSales'

export function exportVentasCsv({
	filteredSales,
	reportData,
	dailySeries,
	weeklySeries,
	monthlySeries,
	getTicketDisplay,
	formatCustomDate,
	getPaymentMethodBadge,
	displayToast
}: {
	filteredSales: any[]
	reportData: { months: any[]; grandTotal: number }
	dailySeries: TicketSeriesRow[]
	weeklySeries: TicketSeriesRow[]
	monthlySeries: TicketSeriesRow[]
	getTicketDisplay: (sale: any) => string
	formatCustomDate: (dateString: string) => string
	getPaymentMethodBadge: (method: string) => { label: string; class: string }
	displayToast: (msg: string, type: 'success' | 'error') => void
}) {
	if (!filteredSales.length) return

	const formatMethodBreakdown = (methodCounts: Map<string, number>) =>
		Array.from(methodCounts.entries())
			.map(([method, count]) => `${count} ${method}`)
			.join(', ')

	const escapeCsvValue = (value: any) => {
		const str = String(value ?? '')
		if (/[";\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
		return str
	}

	const triggerDownload = (blob: Blob, filename: string) => {
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = filename
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	}

	try {
		const header = ['ID Ticket', 'Fecha y hora', 'Método de pago', 'Total (€)']
		const rows = filteredSales.map((s: any) => [
			getTicketDisplay(s),
			formatCustomDate(s.created_at),
			getPaymentMethodBadge(s.payment_method).label,
			s.total.toFixed(2).replace('.', ','),
		])

		const lines = [header, ...rows]
		lines.push([])
		lines.push(['TOTAL GENERAL', '', '', reportData.grandTotal.toFixed(2).replace('.', ',')])
		lines.push([])
		lines.push(['RESUMEN POR MES Y MÉTODO DE PAGO'])

		reportData.months.forEach(month => {
			lines.push([])
			lines.push([month.label.toUpperCase()])
			month.methods.forEach((sum: number, method: string) => {
				lines.push([method, sum.toFixed(2).replace('.', ',')])
			})
			lines.push([`Total ${month.label}`, month.total.toFixed(2).replace('.', ',')])
		})

		const seriesHeader = ['Periodo', 'Rango de tickets', 'Nº tickets', 'Desglose métodos de pago', 'Total (€)']
		const pushSeries = (title: string, rows: TicketSeriesRow[]) => {
			lines.push([])
			lines.push([title])
			lines.push(seriesHeader)
			rows.forEach(row => {
				lines.push([row.label, `${row.firstTicket} - ${row.lastTicket}`, row.count, formatMethodBreakdown(row.methodCounts), row.total.toFixed(2).replace('.', ',')])
			})
		}

		pushSeries('SERIE DIARIA DE TICKETS', dailySeries)
		pushSeries('SERIE SEMANAL DE TICKETS', weeklySeries)
		pushSeries('SERIE MENSUAL DE TICKETS', monthlySeries)

		const csvContent = lines.map(row => row.map(escapeCsvValue).join(';')).join('\n')
		const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
		triggerDownload(blob, `ventas_${new Date().toISOString().split('T')[0]}.csv`)
	} catch (err) {
		console.error('Error generando el CSV de ventas:', err)
		displayToast('No se pudo generar el CSV. Inténtalo de nuevo.', 'error')
	}
}

export async function exportVentasPdf({
	filteredSales,
	reportData,
	dailySeries,
	weeklySeries,
	monthlySeries,
	isGeneratingPdf,
	getTicketDisplay,
	formatCustomDate,
	getPaymentMethodBadge,
	formatCurrency,
	displayToast
}: {
	filteredSales: any[]
	reportData: { months: any[]; grandTotal: number }
	dailySeries: TicketSeriesRow[]
	weeklySeries: TicketSeriesRow[]
	monthlySeries: TicketSeriesRow[]
	isGeneratingPdf: Ref<boolean>
	getTicketDisplay: (sale: any) => string
	formatCustomDate: (dateString: string) => string
	getPaymentMethodBadge: (method: string) => { label: string; class: string }
	formatCurrency: (val: number) => string
	displayToast: (msg: string, type: 'success' | 'error') => void
}) {
	if (!filteredSales.length || isGeneratingPdf.value) return
	isGeneratingPdf.value = true

	const formatMethodBreakdown = (methodCounts: Map<string, number>) =>
		Array.from(methodCounts.entries())
			.map(([method, count]) => `${count} ${method}`)
			.join(', ')

	try {
		const { jsPDF } = await import('jspdf')
		const doc = new jsPDF({ unit: 'mm', format: 'a4' })
		const pageWidth = doc.internal.pageSize.getWidth()
		const pageHeight = doc.internal.pageSize.getHeight()
		const marginX = 14
		const contentWidth = pageWidth - marginX * 2
		let y = 18

		const ensureSpace = (needed: number) => {
			if (y + needed > pageHeight - 14) {
				doc.addPage()
				y = 18
			}
		}

		doc.setFont('helvetica', 'bold')
		doc.setFontSize(16)
		doc.text('Historial de tickets y facturación', marginX, y)
		y += 6
		doc.setFont('helvetica', 'normal')
		doc.setFontSize(9)
		doc.setTextColor(120)
		doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, marginX, y)
		doc.setTextColor(20)
		y += 8

		const columns = [
			{ label: 'ID Ticket', width: 44 },
			{ label: 'Fecha y hora', width: 46 },
			{ label: 'Método pago', width: 30 },
			{ label: 'Total', width: 26 },
		]

		const drawTableHeader = () => {
			doc.setFillColor(242, 242, 242)
			doc.rect(marginX, y - 4, contentWidth, 6, 'F')
			doc.setFont('helvetica', 'bold')
			doc.setFontSize(8)
			let x = marginX
			columns.forEach(col => {
				doc.text(col.label, x + 1, y)
				x += col.width
			})
			y += 5
			doc.setFont('helvetica', 'normal')
			doc.setFontSize(7.5)
		}

		ensureSpace(10)
		drawTableHeader()

		const totalColWidth = columns[3]!.width

		filteredSales.forEach((s: any) => {
			ensureSpace(6)
			const cells = [getTicketDisplay(s), formatCustomDate(s.created_at), getPaymentMethodBadge(s.payment_method).label]

			let x = marginX
			cells.forEach((text, i) => {
				const width = columns[i]!.width
				const fitted = doc.splitTextToSize(text, width - 2)[0] || ''
				doc.text(fitted, x + 1, y)
				x += width
			})
			doc.text(formatCurrency(s.total), x + totalColWidth - 1, y, { align: 'right' })

			y += 5
			doc.setDrawColor(230)
			doc.line(marginX, y - 3.5, marginX + contentWidth, y - 3.5)
		})

		ensureSpace(8)
		y += 2
		doc.setFont('helvetica', 'bold')
		doc.setFontSize(9)
		doc.text('TOTAL GENERAL', marginX + contentWidth - totalColWidth - 1, y, { align: 'right' })
		doc.text(formatCurrency(reportData.grandTotal), marginX + contentWidth - 1, y, { align: 'right' })
		y += 10

		ensureSpace(8)
		doc.setFontSize(12)
		doc.text('Resumen por mes y método de pago', marginX, y)
		y += 7

		reportData.months.forEach(month => {
			ensureSpace(8)
			doc.setFont('helvetica', 'bold')
			doc.setFontSize(9.5)
			doc.text(month.label.charAt(0).toUpperCase() + month.label.slice(1), marginX, y)
			y += 5.5

			doc.setFont('helvetica', 'normal')
			doc.setFontSize(8.5)
			month.methods.forEach((sum: number, method: string) => {
				ensureSpace(5.5)
				doc.text(method, marginX + 4, y)
				doc.text(formatCurrency(sum), marginX + contentWidth - 1, y, { align: 'right' })
				y += 5
			})

			ensureSpace(6)
			doc.setFont('helvetica', 'bold')
			doc.text(`Total ${month.label}`, marginX + 4, y)
			doc.text(formatCurrency(month.total), marginX + contentWidth - 1, y, { align: 'right' })
			y += 8
		})

		const seriesColumns = [
			{ label: 'Periodo', width: 34 },
			{ label: 'Rango de tickets', width: 38 },
			{ label: 'Nº tickets (desglose)', width: 76 },
			{ label: 'Total', width: 24 },
		]
		const seriesTotalWidth = seriesColumns[3]!.width

		const drawSeriesSection = (title: string, rows: TicketSeriesRow[]) => {
			ensureSpace(15)
			doc.setFont('helvetica', 'bold')
			doc.setFontSize(12)
			doc.text(title, marginX, y)
			y += 7

			doc.setFillColor(242, 242, 242)
			doc.rect(marginX, y - 4, contentWidth, 6, 'F')
			doc.setFontSize(8)
			let hx = marginX
			seriesColumns.forEach(col => {
				doc.text(col.label, hx + 1, y)
				hx += col.width
			})
			y += 5
			doc.setFont('helvetica', 'normal')
			doc.setFontSize(7.5)

			rows.forEach(row => {
				ensureSpace(6)
				const cells = [row.label, `${row.firstTicket} - ${row.lastTicket}`, `${row.count} (${formatMethodBreakdown(row.methodCounts)})`]
				let x = marginX
				cells.forEach((text, i) => {
					const width = seriesColumns[i]!.width
					const fitted = doc.splitTextToSize(text, width - 2)[0] || ''
					doc.text(fitted, x + 1, y)
					x += width
				})
				doc.text(formatCurrency(row.total), x + seriesTotalWidth - 1, y, { align: 'right' })
				y += 5
				doc.setDrawColor(230)
				doc.line(marginX, y - 3.5, marginX + contentWidth, y - 3.5)
			})
			y += 6
		}

		drawSeriesSection('Serie diaria de tickets', dailySeries)
		drawSeriesSection('Serie semanal de tickets', weeklySeries)
		drawSeriesSection('Serie mensual de tickets', monthlySeries)

		doc.save(`ventas_${new Date().toISOString().split('T')[0]}.pdf`)
	} catch (err) {
		console.error('Error generando el PDF de ventas:', err)
		displayToast('No se pudo generar el PDF. Inténtalo de nuevo.', 'error')
	} finally {
		isGeneratingPdf.value = false
	}
}
