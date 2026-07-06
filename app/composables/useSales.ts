import { ref, computed, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'

export interface TicketSeriesRow {
	start: Date
	label: string
	firstTicket: string
	lastTicket: string
	count: number
	methodCounts: Map<string, number>
	total: number
}

export function useSales() {
	const queryClient = useQueryClient()

	const searchQuery = ref('')
	const filterDateMode = ref<'single' | 'range'>('single')
	const filterDateSingle = ref('')
	const filterDateRange = ref({ start: '', end: '' })
	const filterPaymentMethod = ref('all')

	const summaryTimeframe = ref<'day' | 'week' | 'month' | 'year'>('month')

	const sortKey = ref<'id' | 'date' | 'payment_method' | 'total' | 'client'>('date')
	const sortOrder = ref<'desc' | 'asc'>('desc')

	const currentPage = ref(1)
	const itemsPerPage = ref(20)

	const isGeneratingPdf = ref(false)
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => {
			showToast.value = false
		}, 4000)
	}

	const getTicketDisplay = (sale: any) => {
		return sale.invoice_number ? sale.invoice_number : `BBH-${new Date(sale.created_at).getFullYear()}-${sale.cart_id.split('-')[0].substring(0, 4)}`
	}

	// Fetch sales
	const { data: sales, isPending } = useQuery<any[]>({
		queryKey: ['sales', 'completed'],
		queryFn: () => $fetch('/api/sales/carts', { query: { status: 'completed' } }),
	})

	const filteredSales = computed(() => {
		if (!sales.value) return []
		let result = sales.value

		if (searchQuery.value) {
			const query = searchQuery.value.toLowerCase()
			result = result.filter((s: any) => {
				const clientName = s.user ? `${s.user.name} ${s.user.surname}`.toLowerCase() : ''
				return clientName.includes(query) || s.cart_id.toLowerCase().includes(query)
			})
		}

		if (filterDateMode.value === 'single' && filterDateSingle.value) {
			result = result.filter((s: any) => {
				const saleDate = new Date(s.created_at).toISOString().split('T')[0]
				return saleDate === filterDateSingle.value
			})
		} else if (filterDateMode.value === 'range') {
			const start = filterDateRange.value.start ? new Date(filterDateRange.value.start) : null
			const end = filterDateRange.value.end ? new Date(filterDateRange.value.end) : null
			if (end) end.setHours(23, 59, 59, 999)

			result = result.filter((s: any) => {
				const saleDate = new Date(s.created_at)
				if (start && saleDate < start) return false
				if (end && saleDate > end) return false
				return true
			})
		}

		if (filterPaymentMethod.value !== 'all') {
			result = result.filter((s: any) => s.payment_method === filterPaymentMethod.value)
		}

		// Sorting
		result = [...result].sort((a: any, b: any) => {
			const modifier = sortOrder.value === 'asc' ? 1 : -1
			if (sortKey.value === 'date') {
				return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * modifier
			} else if (sortKey.value === 'total') {
				return (a.total - b.total) * modifier
			} else if (sortKey.value === 'payment_method') {
				return (a.payment_method || '').localeCompare(b.payment_method || '') * modifier
			} else if (sortKey.value === 'client') {
				const nameA = a.user ? `${a.user.name} ${a.user.surname}`.toLowerCase() : 'zzzz'
				const nameB = b.user ? `${b.user.name} ${b.user.surname}`.toLowerCase() : 'zzzz'
				return nameA.localeCompare(nameB) * modifier
			} else if (sortKey.value === 'id') {
				return getTicketDisplay(a).localeCompare(getTicketDisplay(b)) * modifier
			}
			return 0
		})

		return result
	})

	watch([searchQuery, filterDateMode, filterDateSingle, filterDateRange, filterPaymentMethod, sortKey, sortOrder], () => {
		currentPage.value = 1
	})

	const paginatedSales = computed(() => {
		const start = (currentPage.value - 1) * itemsPerPage.value
		const end = start + itemsPerPage.value
		return filteredSales.value.slice(start, end)
	})

	const totalPages = computed(() => Math.ceil(filteredSales.value.length / itemsPerPage.value))

	const getStartOfDate = (type: 'day' | 'week' | 'month' | 'year') => {
		const now = new Date()
		now.setHours(0, 0, 0, 0)

		if (type === 'day') return now
		if (type === 'week') {
			const day = now.getDay() || 7 // 1 is Monday, 7 is Sunday
			now.setDate(now.getDate() - day + 1)
			return now
		}
		if (type === 'month') {
			now.setDate(1)
			return now
		}
		if (type === 'year') {
			now.setMonth(0, 1)
			return now
		}
		return now
	}

	const getEndOfDate = (type: 'day' | 'week' | 'month' | 'year', start: Date) => {
		const end = new Date(start)
		if (type === 'day') end.setDate(end.getDate() + 1)
		if (type === 'week') end.setDate(end.getDate() + 7)
		if (type === 'month') end.setMonth(end.getMonth() + 1)
		if (type === 'year') end.setFullYear(end.getFullYear() + 1)
		return end
	}

	const getPreviousPeriodBounds = (type: 'day' | 'week' | 'month' | 'year', currentStart: Date, elapsedMs: number) => {
		const prevStart = new Date(currentStart)
		if (type === 'day') prevStart.setDate(prevStart.getDate() - 1)
		if (type === 'week') prevStart.setDate(prevStart.getDate() - 7)
		if (type === 'month') prevStart.setMonth(prevStart.getMonth() - 1)
		if (type === 'year') prevStart.setFullYear(prevStart.getFullYear() - 1)
		const prevEnd = new Date(prevStart.getTime() + elapsedMs)
		return { start: prevStart, end: prevEnd }
	}

	const pctChange = (curr: number, prev: number) => {
		if (prev > 0) return ((curr - prev) / prev) * 100
		return curr > 0 ? 100 : 0
	}

	const timeframeLabels: Record<'day' | 'week' | 'month' | 'year', string> = {
		day: 'HOY',
		week: 'ESTA SEMANA',
		month: 'ESTE MES',
		year: 'ESTE AÑO',
	}

	const summaryStats = computed(() => {
		const empty = { total: 0, count: 0, average: 0, totalChange: 0, countChange: 0, averageChange: 0 }
		if (!sales.value) return empty

		const now = new Date()
		const startDate = getStartOfDate(summaryTimeframe.value)
		const elapsed = now.getTime() - startDate.getTime()

		const current = sales.value.filter((s: any) => {
			const d = new Date(s.created_at)
			return d >= startDate && d <= now
		})

		const { start: prevStart, end: prevEnd } = getPreviousPeriodBounds(summaryTimeframe.value, startDate, elapsed)
		const previous = sales.value.filter((s: any) => {
			const d = new Date(s.created_at)
			return d >= prevStart && d <= prevEnd
		})

		const total = current.reduce((sum, s) => sum + s.total, 0)
		const count = current.length
		const average = count > 0 ? total / count : 0

		const prevTotal = previous.reduce((sum, s) => sum + s.total, 0)
		const prevCount = previous.length
		const prevAverage = prevCount > 0 ? prevTotal / prevCount : 0

		return {
			total,
			count,
			average,
			totalChange: pctChange(total, prevTotal),
			countChange: pctChange(count, prevCount),
			averageChange: pctChange(average, prevAverage),
		}
	})

	const bucketCount = computed(() => {
		if (summaryTimeframe.value === 'day') return 8
		if (summaryTimeframe.value === 'week') return 7
		if (summaryTimeframe.value === 'month') {
			const now = new Date()
			return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
		}
		return 12
	})

	const sparklineSeries = computed(() => {
		const buckets = bucketCount.value
		const totals = Array(buckets).fill(0)
		const counts = Array(buckets).fill(0)

		if (sales.value) {
			const start = getStartOfDate(summaryTimeframe.value)
			const end = getEndOfDate(summaryTimeframe.value, start)
			const bucketMs = (end.getTime() - start.getTime()) / buckets

			sales.value.forEach((s: any) => {
				const t = new Date(s.created_at).getTime()
				if (t >= start.getTime() && t < end.getTime()) {
					const idx = Math.min(buckets - 1, Math.floor((t - start.getTime()) / bucketMs))
					totals[idx] += s.total
					counts[idx] += 1
				}
			})
		}

		const averages = totals.map((t, i) => (counts[i] > 0 ? t / counts[i] : 0))
		return { totals, counts, averages }
	})

	const toSparklinePath = (values: number[]) => {
		if (!values.length) return ''
		const max = Math.max(...values)
		const min = Math.min(...values, 0)
		const range = max - min || 1
		const stepX = values.length > 1 ? 100 / (values.length - 1) : 100
		return values
			.map((v, i) => {
				const x = i * stepX
				const y = 18 - ((v - min) / range) * 16
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
			})
			.join(' ')
	}

	const toSparklineAreaPath = (values: number[]) => {
		if (!values.length) return ''
		const max = Math.max(...values)
		const min = Math.min(...values, 0)
		const range = max - min || 1
		const stepX = values.length > 1 ? 100 / (values.length - 1) : 100
		const points = values.map((v, i) => {
			const x = i * stepX
			const y = 18 - ((v - min) / range) * 16
			return `${x.toFixed(1)},${y.toFixed(1)}`
		})
		return `M0,20 L${points.join(' L')} L100,20 Z`
	}

	const totalSparkline = computed(() => toSparklinePath(sparklineSeries.value.totals))
	const totalSparklineArea = computed(() => toSparklineAreaPath(sparklineSeries.value.totals))
	const countSparkline = computed(() => toSparklinePath(sparklineSeries.value.counts))
	const countSparklineArea = computed(() => toSparklineAreaPath(sparklineSeries.value.counts))
	const averageSparkline = computed(() => toSparklinePath(sparklineSeries.value.averages))
	const averageSparklineArea = computed(() => toSparklineAreaPath(sparklineSeries.value.averages))

	const monthlyProjection = computed(() => {
		if (!sales.value) return { projected: 0, changeVsLastMonth: 0 }

		const now = new Date()
		const startMonth = getStartOfDate('month')
		const daysElapsed = Math.max(1, Math.ceil((now.getTime() - startMonth.getTime()) / (1000 * 60 * 60 * 24)))
		const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

		const monthTotal = sales.value
			.filter((s: any) => new Date(s.created_at) >= startMonth && new Date(s.created_at) <= now)
			.reduce((sum, s) => sum + s.total, 0)

		const projected = (monthTotal / daysElapsed) * daysInMonth

		const lastMonthStart = new Date(startMonth)
		lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
		const lastMonthEnd = new Date(startMonth)
		const lastMonthTotal = sales.value
			.filter((s: any) => new Date(s.created_at) >= lastMonthStart && new Date(s.created_at) < lastMonthEnd)
			.reduce((sum, s) => sum + s.total, 0)

		return { projected, changeVsLastMonth: pctChange(projected, lastMonthTotal) }
	})

	const toggleSort = (key: 'id' | 'date' | 'payment_method' | 'total' | 'client') => {
		if (sortKey.value === key) {
			sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
		} else {
			sortKey.value = key
			sortOrder.value = 'desc'
		}
	}

	const getPaymentMethodBadge = (method: string) => {
		const methods: Record<string, { label: string; class: string }> = {
			cash: { label: 'EFECTIVO', class: 'bg-emerald-100 text-emerald-800' },
			card: { label: 'TARJETA', class: 'bg-[#F6EFEA] text-[#9D7D62] border-[#E8DACD]' },
			mixed: { label: 'MIXTO', class: 'bg-purple-100 text-purple-800' },
			transfer: { label: 'TRANSFERENCIA', class: 'bg-orange-100 text-orange-800' },
			stripe: { label: 'STRIPE', class: 'bg-indigo-100 text-indigo-800' },
		}
		return methods[method] || { label: method.toUpperCase(), class: 'bg-neutral text-neutral-content' }
	}

	const getTotalItems = (items: any[]) => {
		if (!items) return 0
		return items.reduce((acc: number, item: any) => acc + item.quantity, 0)
	}

	const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)
	
	const formatCustomDate = (dateString: string) => {
		const date = new Date(dateString)
		const day = date.getDate()
		const month = date.toLocaleString('es-ES', { month: 'short' })
		const year = date.getFullYear()
		const hours = date.getHours().toString().padStart(2, '0')
		const minutes = date.getMinutes().toString().padStart(2, '0')
		return `${day} ${month} ${year}, ${hours}:${minutes}`
	}

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

	const reportData = computed(() => {
		const monthGroups = new Map<string, { key: string; label: string; methods: Map<string, number>; total: number }>()
		let grandTotal = 0

		filteredSales.value.forEach((s: any) => {
			grandTotal += s.total

			const d = new Date(s.created_at)
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
			if (!monthGroups.has(key)) {
				monthGroups.set(key, {
					key,
					label: d.toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
					methods: new Map(),
					total: 0,
				})
			}

			const group = monthGroups.get(key)!
			const methodLabel = getPaymentMethodBadge(s.payment_method).label
			group.methods.set(methodLabel, (group.methods.get(methodLabel) || 0) + s.total)
			group.total += s.total
		})

		const months = Array.from(monthGroups.values()).sort((a, b) => b.key.localeCompare(a.key))
		return { months, grandTotal }
	})

	const buildTicketSeries = (periodStart: (d: Date) => Date, formatLabel: (start: Date) => string): TicketSeriesRow[] => {
		const groups = new Map<number, { start: Date; sales: any[] }>()

		filteredSales.value.forEach((s: any) => {
			const start = periodStart(new Date(s.created_at))
			const key = start.getTime()
			if (!groups.has(key)) groups.set(key, { start, sales: [] })
			groups.get(key)!.sales.push(s)
		})

		const rows = Array.from(groups.values()).map(group => {
			const sorted = [...group.sales].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
			const methodCounts = new Map<string, number>()
			let total = 0
			sorted.forEach(s => {
				total += s.total
				const label = getPaymentMethodBadge(s.payment_method).label
				methodCounts.set(label, (methodCounts.get(label) || 0) + 1)
			})

			return {
				start: group.start,
				label: formatLabel(group.start),
				firstTicket: getTicketDisplay(sorted[0]),
				lastTicket: getTicketDisplay(sorted[sorted.length - 1]),
				count: sorted.length,
				methodCounts,
				total,
			}
		})

		return rows.sort((a, b) => b.start.getTime() - a.start.getTime())
	}

	const dayStart = (d: Date) => {
		const x = new Date(d)
		x.setHours(0, 0, 0, 0)
		return x
	}
	const weekStart = (d: Date) => {
		const x = dayStart(d)
		const day = x.getDay() || 7
		x.setDate(x.getDate() - day + 1)
		return x
	}
	const monthStart = (d: Date) => {
		const x = dayStart(d)
		x.setDate(1)
		return x
	}

	const dailySeries = computed(() =>
		buildTicketSeries(dayStart, start => start.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }))
	)

	const weeklySeries = computed(() =>
		buildTicketSeries(weekStart, start => {
			const end = new Date(start)
			end.setDate(end.getDate() + 6)
			const fmt = (dt: Date) => dt.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
			return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`
		})
	)

	const monthlySeries = computed(() => buildTicketSeries(monthStart, start => start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })))

	const formatMethodBreakdown = (methodCounts: Map<string, number>) =>
		Array.from(methodCounts.entries())
			.map(([method, count]) => `${count} ${method}`)
			.join(', ')

	const downloadCsv = () => {
		if (!filteredSales.value.length) return

		try {
			const header = ['ID Ticket', 'Fecha y hora', 'Método de pago', 'Total (€)']
			const rows = filteredSales.value.map((s: any) => [
				getTicketDisplay(s),
				formatCustomDate(s.created_at),
				getPaymentMethodBadge(s.payment_method).label,
				s.total.toFixed(2).replace('.', ','),
			])

			const lines = [header, ...rows]
			lines.push([])
			lines.push(['TOTAL GENERAL', '', '', reportData.value.grandTotal.toFixed(2).replace('.', ',')])
			lines.push([])
			lines.push(['RESUMEN POR MES Y MÉTODO DE PAGO'])

			reportData.value.months.forEach(month => {
				lines.push([])
				lines.push([month.label.toUpperCase()])
				month.methods.forEach((sum, method) => {
					lines.push([method, sum.toFixed(2).replace('.', ',')])
				})
				lines.push([`Total ${month.label}`, month.total.toFixed(2).replace('.', ',')])
			})

			const seriesHeader = ['Periodo', 'Rango de tickets', 'Nº tickets', 'Desglose métodos de pago', 'Total (€)']
			const pushSeries = (title: string, rows: typeof dailySeries.value) => {
				lines.push([])
				lines.push([title])
				lines.push(seriesHeader)
				rows.forEach(row => {
					lines.push([row.label, `${row.firstTicket} - ${row.lastTicket}`, row.count, formatMethodBreakdown(row.methodCounts), row.total.toFixed(2).replace('.', ',')])
				})
			}

			pushSeries('SERIE DIARIA DE TICKETS', dailySeries.value)
			pushSeries('SERIE SEMANAL DE TICKETS', weeklySeries.value)
			pushSeries('SERIE MENSUAL DE TICKETS', monthlySeries.value)

			const csvContent = lines.map(row => row.map(escapeCsvValue).join(';')).join('\n')
			const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
			triggerDownload(blob, `ventas_${new Date().toISOString().split('T')[0]}.csv`)
		} catch (err) {
			console.error('Error generando el CSV de ventas:', err)
			displayToast('No se pudo generar el CSV. Inténtalo de nuevo.', 'error')
		}
	}

	const downloadPdf = async () => {
		if (!filteredSales.value.length || isGeneratingPdf.value) return
		isGeneratingPdf.value = true

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

			filteredSales.value.forEach((s: any) => {
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
			doc.text(formatCurrency(reportData.value.grandTotal), marginX + contentWidth - 1, y, { align: 'right' })
			y += 10

			ensureSpace(8)
			doc.setFontSize(12)
			doc.text('Resumen por mes y método de pago', marginX, y)
			y += 7

			reportData.value.months.forEach(month => {
				ensureSpace(8)
				doc.setFont('helvetica', 'bold')
				doc.setFontSize(9.5)
				doc.text(month.label.charAt(0).toUpperCase() + month.label.slice(1), marginX, y)
				y += 5.5

				doc.setFont('helvetica', 'normal')
				doc.setFontSize(8.5)
				month.methods.forEach((sum, method) => {
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

			drawSeriesSection('Serie diaria de tickets', dailySeries.value)
			drawSeriesSection('Serie semanal de tickets', weeklySeries.value)
			drawSeriesSection('Serie mensual de tickets', monthlySeries.value)

			doc.save(`ventas_${new Date().toISOString().split('T')[0]}.pdf`)
		} catch (err) {
			console.error('Error generando el PDF de ventas:', err)
			displayToast('No se pudo generar el PDF. Inténtalo de nuevo.', 'error')
		} finally {
			isGeneratingPdf.value = false
		}
	}

	return {
		searchQuery,
		filterDateMode,
		filterDateSingle,
		filterDateRange,
		filterPaymentMethod,
		summaryTimeframe,
		sortKey,
		sortOrder,
		currentPage,
		itemsPerPage,
		sales,
		isPending,
		filteredSales,
		paginatedSales,
		totalPages,
		timeframeLabels,
		summaryStats,
		totalSparkline,
		totalSparklineArea,
		countSparkline,
		countSparklineArea,
		averageSparkline,
		averageSparklineArea,
		monthlyProjection,
		isGeneratingPdf,
		toastMessage,
		toastType,
		showToast,
		displayToast,
		toggleSort,
		getPaymentMethodBadge,
		getTotalItems,
		formatCurrency,
		formatCustomDate,
		getTicketDisplay,
		downloadCsv,
		downloadPdf,
	}
}
