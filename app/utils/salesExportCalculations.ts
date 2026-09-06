import type { Sale, SaleItem } from '~~/shared/types/domain'

export type ExportDetailMode = 'breakdown' | 'individual' | 'summary'

export interface FiscalTaxBucket {
	taxRate: number
	baseAmount: number
	taxAmount: number
	totalAmount: number
}

export interface FiscalSummary {
	totalSalesCount: number
	grandTotal: number
	totalDiscount: number
	totalBaseAmount: number
	totalTaxAmount: number
	taxesByRate: Record<number, FiscalTaxBucket>
	methodsSummary: Record<string, { count: number; total: number }>
	averageTicket: number
}

export function getQuarterDateBounds(quarter: number, year: number): { start: Date; end: Date } {
	const normalizedQuarter = Math.max(1, Math.min(4, Math.floor(quarter)))
	// Spanish autónomos fiscal quarters span from day 20 of the starting month to day 20 of the 3rd month:
	// 1T: 20 Ene - 20 Abr
	// 2T: 20 Abr - 20 Jul
	// 3T: 20 Jul - 20 Oct
	// 4T: 20 Oct - 20 Ene (year + 1)
	const startMonth = (normalizedQuarter - 1) * 3
	const endMonth = startMonth + 3

	const start = new Date(year, startMonth, 20, 0, 0, 0, 0)
	const endYear = endMonth >= 12 ? year + 1 : year
	const normalizedEndMonth = endMonth % 12
	const end = new Date(endYear, normalizedEndMonth, 20, 23, 59, 59, 999)

	return { start, end }
}

export function getPeriodDateBounds(
	timeframe: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all',
	options?: { quarter?: number; year?: number; referenceDate?: Date }
): { start: Date | null; end: Date | null } {
	const ref = options?.referenceDate ? new Date(options.referenceDate) : new Date()
	const targetYear = options?.year || ref.getFullYear()

	if (timeframe === 'all') {
		return { start: null, end: null }
	}

	if (timeframe === 'day') {
		const start = new Date(ref)
		start.setHours(0, 0, 0, 0)
		const end = new Date(ref)
		end.setHours(23, 59, 59, 999)
		return { start, end }
	}

	if (timeframe === 'week') {
		const start = new Date(ref)
		start.setHours(0, 0, 0, 0)
		const day = start.getDay() || 7 // 1 Monday, 7 Sunday
		start.setDate(start.getDate() - day + 1)

		const end = new Date(start)
		end.setDate(end.getDate() + 6)
		end.setHours(23, 59, 59, 999)
		return { start, end }
	}

	if (timeframe === 'month') {
		const start = new Date(targetYear, ref.getMonth(), 1, 0, 0, 0, 0)
		const end = new Date(targetYear, ref.getMonth() + 1, 0, 23, 59, 59, 999)
		return { start, end }
	}

	if (timeframe === 'quarter') {
		const q = options?.quarter || Math.floor(ref.getMonth() / 3) + 1
		return getQuarterDateBounds(q, targetYear)
	}

	if (timeframe === 'year') {
		const start = new Date(targetYear, 0, 1, 0, 0, 0, 0)
		const end = new Date(targetYear, 11, 31, 23, 59, 59, 999)
		return { start, end }
	}

	return { start: null, end: null }
}

export function calculateFiscalSummary(sales: Sale[]): FiscalSummary {
	const taxesByRate: Record<number, FiscalTaxBucket> = {}
	const methodsSummary: Record<string, { count: number; total: number }> = {}

	let grandTotal = 0
	let totalDiscount = 0
	let totalBaseAmount = 0
	let totalTaxAmount = 0

	for (const sale of sales) {
		grandTotal += sale.total
		totalDiscount += sale.discount || 0

		// Payment method
		const methodKey = sale.payment_method || 'no_especificado'
		if (!methodsSummary[methodKey]) {
			methodsSummary[methodKey] = { count: 0, total: 0 }
		}
		methodsSummary[methodKey].count += 1
		methodsSummary[methodKey].total += sale.total

		// If sale has line items, calculate by line item tax_rate
		if (sale.items && sale.items.length > 0) {
			for (const item of sale.items) {
				const rate = item.tax_rate ?? 21
				const itemTotal = item.total || (item.quantity * item.unit_price)
				const itemBase = itemTotal / (1 + rate / 100)
				const itemTax = itemTotal - itemBase

				if (!taxesByRate[rate]) {
					taxesByRate[rate] = { taxRate: rate, baseAmount: 0, taxAmount: 0, totalAmount: 0 }
				}
				taxesByRate[rate].baseAmount += itemBase
				taxesByRate[rate].taxAmount += itemTax
				taxesByRate[rate].totalAmount += itemTotal

				totalBaseAmount += itemBase
				totalTaxAmount += itemTax
			}
		} else {
			// Fallback standard 21% IVA if sale items are not loaded
			const standardRate = 21
			const base = sale.total / (1 + standardRate / 100)
			const tax = sale.total - base

			if (!taxesByRate[standardRate]) {
				taxesByRate[standardRate] = { taxRate: standardRate, baseAmount: 0, taxAmount: 0, totalAmount: 0 }
			}
			taxesByRate[standardRate].baseAmount += base
			taxesByRate[standardRate].taxAmount += tax
			taxesByRate[standardRate].totalAmount += sale.total

			totalBaseAmount += base
			totalTaxAmount += tax
		}
	}

	const totalSalesCount = sales.length
	const averageTicket = totalSalesCount > 0 ? grandTotal / totalSalesCount : 0

	return {
		totalSalesCount,
		grandTotal: Number(grandTotal.toFixed(2)),
		totalDiscount: Number(totalDiscount.toFixed(2)),
		totalBaseAmount: Number(totalBaseAmount.toFixed(2)),
		totalTaxAmount: Number(totalTaxAmount.toFixed(2)),
		taxesByRate,
		methodsSummary,
		averageTicket: Number(averageTicket.toFixed(2)),
	}
}

export function escapeCsvValue(value: unknown): string {
	const str = String(value ?? '')
	if (/[";\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`
	}
	return str
}

export function formatNumberEs(num: number): string {
	return num.toFixed(2).replace('.', ',')
}

export function formatDateEs(dateString: string): string {
	const date = new Date(dateString)
	if (isNaN(date.getTime())) return dateString
	const day = String(date.getDate()).padStart(2, '0')
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const year = date.getFullYear()
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	return `${day}/${month}/${year} ${hours}:${minutes}`
}

export function getTicketDisplayLabel(sale: Sale): string {
	if (sale.invoice_number) return sale.invoice_number
	const year = new Date(sale.created_at).getFullYear()
	const shortId = (sale.cart_id.split('-')[0] ?? '').substring(0, 4)
	return `BBH-${year}-${shortId}`
}

export function buildSalesCsvContent({
	sales,
	mode,
	periodTitle,
}: {
	sales: Sale[]
	mode: ExportDetailMode
	periodTitle: string
}): string {
	const lines: string[][] = []

	// Header banner
	lines.push(['BEILS - BELLEZA HONESTA'])
	lines.push(['INFORME DE VENTAS Y FACTURACIÓN'])
	lines.push([`Periodo: ${periodTitle}`])
	lines.push([`Fecha de generación: ${new Date().toLocaleString('es-ES')}`])
	lines.push([`Modo de informe: ${mode === 'breakdown' ? 'Desglose total por línea' : mode === 'individual' ? 'Venta individual' : 'Sumatorio fiscal'}`])
	lines.push([])

	const fiscalSummary = calculateFiscalSummary(sales)

	if (mode === 'breakdown') {
		const header = [
			'ID Ticket / Factura',
			'Fecha y hora',
			'Cliente',
			'Tipo',
			'Concepto / Item',
			'Cantidad',
			'Precio Unitario (€)',
			'Tipo IVA (%)',
			'Subtotal (€)',
			'Total Ticket (€)',
			'Método de pago',
		]
		lines.push(header)

		for (const sale of sales) {
			const ticketLabel = getTicketDisplayLabel(sale)
			const dateFormatted = formatDateEs(sale.created_at)
			const clientName = sale.user ? `${sale.user.name || ''} ${sale.user.surname || ''}`.trim() : 'Cliente general'
			const paymentMethod = sale.payment_method || 'No especificado'

			if (sale.items && sale.items.length > 0) {
				for (const item of sale.items) {
					lines.push([
						ticketLabel,
						dateFormatted,
						clientName,
						item.item_type || 'servicio',
						item.name || 'Sin descripción',
						String(item.quantity || 1),
						formatNumberEs(item.unit_price || 0),
						`${item.tax_rate ?? 21}%`,
						formatNumberEs(item.subtotal || 0),
						formatNumberEs(sale.total),
						paymentMethod,
					])
				}
			} else {
				lines.push([
					ticketLabel,
					dateFormatted,
					clientName,
					'-',
					'Venta directa',
					'1',
					formatNumberEs(sale.total),
					'21%',
					formatNumberEs(sale.subtotal || sale.total),
					formatNumberEs(sale.total),
					paymentMethod,
				])
			}
		}

		lines.push([])
		lines.push(['RESUMEN DE VENTAS'])
		lines.push(['Total de tickets', String(sales.length)])
		lines.push(['Base imponible total (€)', formatNumberEs(fiscalSummary.totalBaseAmount)])
		lines.push(['Total IVA (€)', formatNumberEs(fiscalSummary.totalTaxAmount)])
		lines.push(['TOTAL FACTURADO (€)', formatNumberEs(fiscalSummary.grandTotal)])

	} else if (mode === 'individual') {
		const header = [
			'ID Ticket / Factura',
			'Fecha y hora',
			'Cliente',
			'Nº Items',
			'Método de pago',
			'Descuento (€)',
			'Total (€)',
		]
		lines.push(header)

		for (const sale of sales) {
			const ticketLabel = getTicketDisplayLabel(sale)
			const dateFormatted = formatDateEs(sale.created_at)
			const clientName = sale.user ? `${sale.user.name || ''} ${sale.user.surname || ''}`.trim() : 'Cliente general'
			const itemsCount = sale.items?.reduce((acc: number, it: SaleItem) => acc + (it.quantity || 1), 0) || 0

			lines.push([
				ticketLabel,
				dateFormatted,
				clientName,
				String(itemsCount),
				sale.payment_method || 'No especificado',
				formatNumberEs(sale.discount || 0),
				formatNumberEs(sale.total),
			])
		}

		lines.push([])
		lines.push(['TOTALES'])
		lines.push(['Total de tickets', String(sales.length)])
		lines.push(['Base imponible total (€)', formatNumberEs(fiscalSummary.totalBaseAmount)])
		lines.push(['Total IVA (€)', formatNumberEs(fiscalSummary.totalTaxAmount)])
		lines.push(['TOTAL FACTURADO (€)', formatNumberEs(fiscalSummary.grandTotal)])

	} else if (mode === 'summary') {
		lines.push(['RESUMEN FISCAL Y FACTURACIÓN'])
		lines.push(['Concepto', 'Valor'])
		lines.push(['Número de tickets emitidos', String(fiscalSummary.totalSalesCount)])
		lines.push(['BASE IMPONIBLE TOTAL (€)', formatNumberEs(fiscalSummary.totalBaseAmount)])
		lines.push(['TOTAL IVA (€)', formatNumberEs(fiscalSummary.totalTaxAmount)])
		lines.push(['TOTAL FACTURACIÓN (€)', formatNumberEs(fiscalSummary.grandTotal)])
		lines.push(['Ticket promedio (€)', formatNumberEs(fiscalSummary.averageTicket)])
		lines.push(['Descuentos aplicados (€)', formatNumberEs(fiscalSummary.totalDiscount)])

		lines.push([])
		lines.push(['DESGLOSE POR TIPO DE IVA'])
		lines.push(['Tipo IVA (%)', 'Base Imponible (€)', 'Cuota IVA (€)', 'Total (€)'])
		for (const [rate, bucket] of Object.entries(fiscalSummary.taxesByRate)) {
			lines.push([
				`${rate}%`,
				formatNumberEs(bucket.baseAmount),
				formatNumberEs(bucket.taxAmount),
				formatNumberEs(bucket.totalAmount),
			])
		}

		lines.push([])
		lines.push(['DESGLOSE POR MÉTODO DE PAGO'])
		lines.push(['Método de pago', 'Nº Operaciones', 'Total (€)', '% Facturación'])
		for (const [method, info] of Object.entries(fiscalSummary.methodsSummary)) {
			const pct = fiscalSummary.grandTotal > 0 ? (info.total / fiscalSummary.grandTotal) * 100 : 0
			lines.push([
				method.toUpperCase(),
				String(info.count),
				formatNumberEs(info.total),
				`${pct.toFixed(1).replace('.', ',')}%`,
			])
		}
	}

	return '\ufeff' + lines.map(row => row.map(escapeCsvValue).join(';')).join('\r\n')
}
