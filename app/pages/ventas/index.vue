<script setup lang="ts">
	import { useQuery, useQueryClient } from '@tanstack/vue-query'
	import { ShoppingBag, Search, ExternalLink, Calendar, CreditCard, Filter, Download, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'
	import { useDataPrivacy } from '~/composables/useDataPrivacy'
	import PurchaseDetailsModal from '~/components/shared/PurchaseDetailsModal.vue'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Ventas | Finanzas' })

	const { t } = useI18n()
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

	const purchaseDetailsModalRef = ref<any>(null)

	const openDetails = (sale: any) => {
		purchaseDetailsModalRef.value?.open(sale)
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
			let modifier = sortOrder.value === 'asc' ? 1 : -1
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

	// End of the full period (used to build the "so far" chart buckets)
	const getEndOfDate = (type: 'day' | 'week' | 'month' | 'year', start: Date) => {
		const end = new Date(start)
		if (type === 'day') end.setDate(end.getDate() + 1)
		if (type === 'week') end.setDate(end.getDate() + 7)
		if (type === 'month') end.setMonth(end.getMonth() + 1)
		if (type === 'year') end.setFullYear(end.getFullYear() + 1)
		return end
	}

	// Previous period, aligned to the same elapsed time so the comparison is like-for-like
	// (e.g. "today so far" vs "yesterday at the same hour")
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
	const timeframePrevLabels: Record<'day' | 'week' | 'month' | 'year', string> = {
		day: 'que ayer a esta misma hora',
		week: 'que la semana pasada',
		month: 'que el mes pasado',
		year: 'que el año pasado',
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

	// Real sparklines: bucket sales across the selected period so the mini-charts reflect actual data
	const bucketCount = computed(() => {
		if (summaryTimeframe.value === 'day') return 8 // 3h buckets
		if (summaryTimeframe.value === 'week') return 7 // daily
		if (summaryTimeframe.value === 'month') {
			const now = new Date()
			return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() // daily, whole month
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

	// Builds a normalized SVG polyline path (viewBox 0 0 100 20) from a series of values
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

	// Monthly projection: current month run-rate extrapolated to the full month,
	// compared against last month's actual total
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

	const formatChange = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`

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

	const { revealedDocs, revealedLoading, toggleDocumentVisibility } = useDataPrivacy()

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

	// Groups the currently filtered sales by month, and within each month by payment method,
	// so each month's payment-method subtotals always add up to that month's total.
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

	interface TicketSeriesRow {
		start: Date
		label: string
		firstTicket: string
		lastTicket: string
		count: number
		methodCounts: Map<string, number>
		total: number
	}

	// Groups the currently filtered sales into periods (day/week/month), tracking the
	// first/last ticket issued in each period plus a per-payment-method ticket count.
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
			lines.push(['TOTAL GENERAL', '', '', '', reportData.value.grandTotal.toFixed(2).replace('.', ',')])
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
			const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
			triggerDownload(blob, `ventas_${new Date().toISOString().split('T')[0]}.csv`)
		} catch (err) {
			console.error('Error generando el CSV de ventas:', err)
			displayToast('No se pudo generar el CSV. Inténtalo de nuevo.', 'error')
		}
	}

	const isGeneratingPdf = ref(false)
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => (showToast.value = false), 4000)
	}

	// Drawn directly with jsPDF (vector text/lines, no DOM screenshotting) so it never depends
	// on the app's rendered styles — sidesteps html2canvas' incompatibility with Tailwind v4's oklch() colors.
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
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8 lg:h-[calc(100dvh-73px)] lg:flex lg:flex-col lg:overflow-hidden">
		<div class="mx-auto flex h-full w-full max-w-[1400px] flex-col lg:overflow-hidden gap-6">
			
			<!-- HEADER -->
			<div class="flex flex-col md:flex-row justify-between items-center gap-4 mt-2">
				<h1 class="text-text-primary text-2xl font-black tracking-wider uppercase font-sans">HISTORIAL DE VENTAS Y FACTURACIÓN</h1>
				<div class="bg-bg-card border border-border-default/80 rounded-xl p-1 flex items-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] gap-0.5">
					<button @click="summaryTimeframe = 'day'" :class="summaryTimeframe === 'day' ? 'bg-bg-muted/80 text-text-primary shadow-sm ring-1 ring-border-default/50' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/30'" class="px-3.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-200">Día</button>
					<button @click="summaryTimeframe = 'week'" :class="summaryTimeframe === 'week' ? 'bg-bg-muted/80 text-text-primary shadow-sm ring-1 ring-border-default/50' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/30'" class="px-3.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-200">Semana</button>
					<button @click="summaryTimeframe = 'month'" :class="summaryTimeframe === 'month' ? 'bg-bg-muted/80 text-text-primary shadow-sm ring-1 ring-border-default/50' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/30'" class="px-3.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-200">Mes</button>
					<button @click="summaryTimeframe = 'year'" :class="summaryTimeframe === 'year' ? 'bg-bg-muted/80 text-text-primary shadow-sm ring-1 ring-border-default/50' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/30'" class="px-3.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-200">Año</button>
				</div>
			</div>

			<!-- METRICS AND FILTERS ROW (Matched to image layout) -->
			<div class="flex flex-col xl:flex-row gap-5 items-stretch justify-between w-full">
				<!-- METRICS (Left Side - 4 columns) -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full xl:w-[65%] shrink-0">
					<!-- Card 1 -->
					<div class="bg-white border border-border-default/70 rounded-xl p-4.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] relative h-[145px]">
						<div class="flex justify-between items-start">
							<div class="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight text-left">
								<span 
									class="tooltip tooltip-bottom tooltip-first cursor-help text-left inline-block"
									data-tip="¿Qué es? Ingreso total facturado del periodo. &#xa;¿Para qué sirve? Mide el volumen financiero y la facturación en tiempo real. &#xa;¿Cómo se calcula? Sumando el importe total de las ventas completadas.">
									TOTAL<br/>VENTAS {{ timeframeLabels[summaryTimeframe] }}
								</span>
							</div>
							<span
								class="text-[10px] font-bold"
								:class="summaryStats.totalChange >= 0 ? 'text-[#248A3D]' : 'text-[#C53030]'">
								{{ summaryStats.totalChange >= 0 ? '+' : '' }}{{ summaryStats.totalChange.toFixed(1) }}%
							</span>
						</div>
						<div class="mt-1">
							<h3 class="text-2xl font-black text-text-primary tabular-nums tracking-tight font-sans leading-none mb-1">{{ formatCurrency(summaryStats.total) }}</h3>
							<span class="text-[9px] font-bold text-text-muted/80 block">
								Histórico: {{ formatCurrency(sales?.reduce((sum, s) => sum + s.total, 0) || 0) }}
							</span>
						</div>
						<div class="h-8 w-full -mx-1 -mb-1 opacity-90">
							<svg viewBox="0 0 100 20" class="w-full h-full text-text-primary" preserveAspectRatio="none">
								<path :d="totalSparklineArea" fill="currentColor" class="text-text-primary/5" />
								<path :d="totalSparkline" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</div>
					</div>

					<!-- Card 2 -->
					<div class="bg-white border border-border-default/70 rounded-xl p-4.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] relative h-[145px]">
						<div class="flex justify-between items-start">
							<div class="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight text-left">
								<span 
									class="tooltip tooltip-bottom cursor-help text-left inline-block"
									data-tip="¿Qué es? Cantidad de comprobantes emitidos. &#xa;¿Para qué sirve? Evalúa el flujo de clientes y transacciones procesadas. &#xa;¿Cómo se calcula? Contando las ventas con estado completado en el periodo.">
									TICKETS<br/>EMITIDOS
								</span>
							</div>
							<span
								class="text-[10px] font-bold"
								:class="summaryStats.countChange >= 0 ? 'text-[#248A3D]' : 'text-[#C53030]'">
								{{ summaryStats.countChange >= 0 ? '+' : '' }}{{ summaryStats.countChange.toFixed(1) }}%
							</span>
						</div>
						<div class="mt-1">
							<h3 class="text-2xl font-black text-text-primary tabular-nums tracking-tight font-sans leading-none mb-1">{{ summaryStats.count }}</h3>
							<span class="text-[9px] font-bold text-text-muted/80 block">
								Histórico: {{ sales?.length || 0 }} tickets
							</span>
						</div>
						<div class="h-8 w-full -mx-1 -mb-1 opacity-90">
							<svg viewBox="0 0 100 20" class="w-full h-full text-text-primary" preserveAspectRatio="none">
								<path :d="countSparklineArea" fill="currentColor" class="text-text-primary/5" />
								<path :d="countSparkline" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</div>
					</div>

					<!-- Card 3 -->
					<div class="bg-white border border-border-default/70 rounded-xl p-4.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] relative h-[145px]">
						<div class="flex justify-between items-start">
							<div class="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight text-left">
								<span 
									class="tooltip tooltip-bottom cursor-help text-left inline-block"
									data-tip="¿Qué es? Gasto promedio por cada ticket emitido. &#xa;¿Para qué sirve? Ayuda a entender el consumo medio de los clientes. &#xa;¿Cómo se calcula? Dividiendo el total de ventas del periodo por el total de tickets.">
									PROM. POR<br/>VENTA
								</span>
							</div>
							<span
								class="text-[10px] font-bold"
								:class="summaryStats.averageChange >= 0 ? 'text-[#248A3D]' : 'text-[#C53030]'">
								{{ summaryStats.averageChange >= 0 ? '+' : '' }}{{ summaryStats.averageChange.toFixed(1) }}%
							</span>
						</div>
						<div class="mt-1">
							<h3 class="text-2xl font-black text-text-primary tabular-nums tracking-tight font-sans leading-none mb-1">{{ formatCurrency(summaryStats.average) }}</h3>
							<!-- Empty placeholder to match heights of Card 1 and 2 -->
							<div class="h-3"></div>
						</div>
						<div class="h-8 w-full -mx-1 -mb-1 opacity-90">
							<svg viewBox="0 0 100 20" class="w-full h-full" :class="summaryStats.averageChange >= 0 ? 'text-text-primary' : 'text-[#C53030]'" preserveAspectRatio="none">
								<path :d="averageSparklineArea" fill="currentColor" class="opacity-5" />
								<path :d="averageSparkline" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</div>
					</div>

					<!-- Card 4 (Pure Black Card Matching Image) -->
					<div class="bg-black border border-black rounded-xl p-4.5 flex flex-col justify-between shadow-sm relative h-[145px] text-white">
						<!-- Subcontainer to absolute clip watermark arrow without overflow-hidden on parent -->
						<div class="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
							<!-- Big arrow watermark on the right -->
							<div class="absolute right-[-2px] top-4 bottom-4 text-neutral-800 flex items-center justify-center opacity-65">
								<svg class="w-[90px] h-[90px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round">
									<line x1="12" y1="19" x2="12" y2="5"></line>
									<polyline points="5 12 12 5 19 12"></polyline>
								</svg>
							</div>
						</div>
						<div class="relative z-10 flex flex-col h-full justify-between">
							<div class="text-left">
								<span 
									class="text-[9px] font-bold text-neutral-400 tracking-wider uppercase block tooltip tooltip-bottom tooltip-last cursor-help text-left inline-block"
									data-tip="¿Qué es? Estimación de ventas al finalizar el mes en curso. &#xa;¿Para qué sirve? Evalúa la proyección de metas y objetivos mensuales. &#xa;¿Cómo se calcula? Multiplicando el promedio diario del mes por los días totales del mes.">
									PROYECCIÓN<br/>MENSUAL
								</span>
								<h3 class="text-3xl font-black tabular-nums tracking-tight font-sans leading-none mb-1.5 mt-1">{{ formatCurrency(monthlyProjection.projected) }}</h3>
							</div>
							<p class="text-[10px] text-neutral-400 font-medium max-w-[80%] leading-snug">
								Superando el mes anterior en {{ Math.abs(monthlyProjection.changeVsLastMonth).toFixed(1) }}%
							</p>
						</div>
					</div>
				</div>

				<!-- FILTERS (Right Side) -->
				<div class="flex flex-col gap-3 w-full xl:w-[33%] bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.015)] justify-center">
					<!-- Fila 1: Búsqueda, Filtro, Descarga -->
					<div class="flex gap-2 w-full">
						<div class="flex-1 flex items-center bg-bg-card border border-border-default/85 focus-within:border-text-primary/45 rounded-xl px-3 h-10 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
							<Search class="w-3.5 h-3.5 text-text-muted mr-2 shrink-0" />
							<input v-model="searchQuery" type="text" placeholder="Buscar ticket o cliente..." class="bg-transparent text-xs border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-full placeholder-text-muted/60 font-medium" />
						</div>
						<button class="w-10 h-10 bg-bg-card border border-border-default hover:border-text-primary/30 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-muted/40 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]" aria-label="Filtrar">
							<Filter class="w-3.5 h-3.5" />
						</button>
						<div class="dropdown dropdown-end">
							<button
								tabindex="0"
								:disabled="!filteredSales.length || isGeneratingPdf"
								class="w-10 h-10 bg-bg-card border border-border-default hover:border-text-primary/30 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-muted/40 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)] disabled:opacity-40"
							>
								<span v-if="isGeneratingPdf" class="loading loading-spinner loading-xs"></span>
								<Download v-else class="w-3.5 h-3.5" />
							</button>
							<ul tabindex="0" class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-30 mt-1.5 w-48 rounded-xl border p-2 shadow-lg">
								<li><button @click="downloadCsv" class="hover:bg-bg-muted font-bold text-xs px-3 py-2 rounded-lg">Descargar CSV</button></li>
								<li><button @click="downloadPdf" class="hover:bg-bg-muted font-bold text-xs px-3 py-2 rounded-lg">Descargar PDF</button></li>
							</ul>
						</div>
					</div>
					<!-- Fila 2: Rango y Métodos de pago -->
					<div class="flex gap-2 w-full">
						<div class="flex-1 flex items-center bg-bg-card border border-border-default/85 rounded-xl px-2 h-10 shadow-[0_1px_2px_rgba(0,0,0,0.01)] overflow-hidden">
							<Calendar class="w-3.5 h-3.5 text-text-muted mx-1.5 shrink-0" />
							<div v-if="filterDateMode === 'single'" class="flex items-center w-full">
								<input v-model="filterDateSingle" type="date" class="bg-transparent text-xs font-semibold border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-full cursor-pointer" />
							</div>
							<div v-else class="flex items-center w-full justify-between pr-1">
								<input v-model="filterDateRange.start" type="date" class="bg-transparent text-[10px] font-semibold border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-[78px] cursor-pointer" />
								<span class="text-text-muted mx-1 text-xs font-bold">-</span>
								<input v-model="filterDateRange.end" type="date" class="bg-transparent text-[10px] font-semibold border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-[78px] cursor-pointer" />
							</div>
							<label class="cursor-pointer ml-1 flex items-center border-l border-border-default/85 pl-2 select-none shrink-0 pr-1">
								<input type="checkbox" class="checkbox checkbox-xs checkbox-primary rounded-[4px]" :checked="filterDateMode === 'range'" @change="filterDateMode = filterDateMode === 'range' ? 'single' : 'range'" />
							</label>
						</div>
						<div class="w-[45%] flex items-center bg-bg-card border border-border-default/85 rounded-xl px-3 h-10 shadow-[0_1px_2px_rgba(0,0,0,0.01)] relative">
							<CreditCard class="w-3.5 h-3.5 text-text-muted mr-2 shrink-0" />
							<select v-model="filterPaymentMethod" class="bg-transparent text-xs font-semibold border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-full cursor-pointer appearance-none">
								<option value="all">Métodos de pago</option>
								<option value="cash">Efectivo</option>
								<option value="card">Tarjeta</option>
								<option value="mixed">Mixto</option>
								<option value="transfer">Transferencia</option>
								<option value="stripe">Stripe</option>
							</select>
							<span class="absolute right-3.5 pointer-events-none text-text-muted/70 text-[10px]">▼</span>
						</div>
					</div>
				</div>
			</div>

			<!-- TABLE AREA -->
			<div class="bg-bg-card border border-border-default rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.02)]">
				<div class="flex-1 overflow-auto w-full">
					<table class="w-full text-left min-w-[950px] border-collapse relative">
						<thead class="bg-bg-muted/30 sticky top-0 z-10 backdrop-blur-md border-b border-border-default">
							<tr class="text-[10px] font-extrabold text-text-muted tracking-widest uppercase select-none">
								<th class="py-4.5 pl-6 w-44 cursor-pointer hover:text-text-primary transition-colors" @click="toggleSort('id')">
									<div class="flex items-center gap-1.5">
										ID TICKET
										<ArrowUp v-if="sortKey === 'id' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-text-primary" />
										<ArrowDown v-else-if="sortKey === 'id' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-text-primary" />
										<ArrowUpDown v-else class="w-3 h-3 opacity-30" />
									</div>
								</th>
								<th class="py-4.5 px-4 cursor-pointer hover:text-text-primary transition-colors" @click="toggleSort('date')">
									<div class="flex items-center gap-1.5">
										FECHA Y HORA
										<ArrowUp v-if="sortKey === 'date' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-text-primary" />
										<ArrowDown v-else-if="sortKey === 'date' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-text-primary" />
										<ArrowUpDown v-else class="w-3 h-3 opacity-30" />
									</div>
								</th>
								<th class="py-4.5 px-4 cursor-pointer hover:text-text-primary transition-colors" @click="toggleSort('client')">
									<div class="flex items-center gap-1.5">
										CLIENTE
										<ArrowUp v-if="sortKey === 'client' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-text-primary" />
										<ArrowDown v-else-if="sortKey === 'client' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-text-primary" />
										<ArrowUpDown v-else class="w-3 h-3 opacity-30" />
									</div>
								</th>
								<th class="py-4.5 px-4">ARTÍCULOS</th>
								<th class="py-4.5 px-4 cursor-pointer hover:text-text-primary transition-colors text-center" @click="toggleSort('payment_method')">
									<div class="flex items-center justify-center gap-1.5">
										MÉTODO PAGO
										<ArrowUp v-if="sortKey === 'payment_method' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-text-primary" />
										<ArrowDown v-else-if="sortKey === 'payment_method' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-text-primary" />
										<ArrowUpDown v-else class="w-3 h-3 opacity-30" />
									</div>
								</th>
								<th class="py-4.5 px-4 cursor-pointer hover:text-text-primary transition-colors text-right" @click="toggleSort('total')">
									<div class="flex items-center justify-end gap-1.5">
										TOTAL
										<ArrowUp v-if="sortKey === 'total' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-text-primary" />
										<ArrowDown v-else-if="sortKey === 'total' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-text-primary" />
										<ArrowUpDown v-else class="w-3 h-3 opacity-30" />
									</div>
								</th>
								<th class="py-4.5 pr-6 text-center w-36">ACCIONES</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border-default/60 bg-bg-card">
							<tr v-for="sale in paginatedSales" :key="sale.cart_id" @click.stop.prevent="openDetails(sale)" class="hover:bg-neutral-50/70 transition-colors cursor-pointer group">
								<td class="py-4 pl-6">
									<div class="text-[11px] font-bold text-text-muted tracking-wider uppercase font-mono">
										{{ getTicketDisplay(sale) }}
									</div>
								</td>
								<td class="py-4 px-4 text-sm font-semibold text-text-muted tabular-nums">
									{{ formatCustomDate(sale.created_at) }}
								</td>
								<td class="py-4 px-4">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded-full bg-[#1C1C1E] text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
											{{ sale.user ? `${sale.user.name?.charAt(0)}${sale.user.surname?.charAt(0)}` : 'CR' }}
										</div>
										<div class="flex flex-col">
											<span v-if="sale.user" class="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
												{{ sale.user.name }} <span class="font-medium text-text-secondary group-hover:text-primary transition-colors">{{ sale.user.surname }}</span>
											</span>
											<span v-else class="text-sm font-bold text-text-muted">
												Cliente No Registrado
											</span>
										</div>
									</div>
								</td>
								<td class="py-4 px-4">
									<span class="bg-bg-muted/80 text-text-secondary border border-border-default/70 text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase font-sans">
										{{ getTotalItems(sale.items) }} items
									</span>
								</td>
								<td class="py-4 px-4 text-center">
									<span class="text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border shadow-sm" :class="getPaymentMethodBadge(sale.payment_method).class">
										{{ getPaymentMethodBadge(sale.payment_method).label }}
									</span>
								</td>
								<td class="py-4 px-4 text-right">
									<div class="text-[15px] font-bold text-text-primary tabular-nums whitespace-nowrap font-sans">
										{{ formatCurrency(sale.total) }}
									</div>
								</td>
								<td class="py-4 pr-6">
									<button class="flex items-center justify-center gap-2 w-full text-text-primary hover:text-primary transition-colors bg-bg-muted/40 hover:bg-bg-muted px-3 py-1.5 rounded-lg border border-border-default/30 shadow-sm" aria-label="Ver Detalles">
										<ExternalLink class="w-3.5 h-3.5" />
										<span class="text-xs font-bold">Ver Detalles</span>
									</button>
								</td>
							</tr>
							
							<!-- Empty State rows -->
							<tr v-if="!paginatedSales.length && !isPending">
								<td colspan="7" class="py-20 text-center">
									<div class="flex flex-col items-center justify-center max-w-xs mx-auto">
										<div class="w-12 h-12 rounded-full bg-bg-muted/80 flex items-center justify-center mb-3">
											<ShoppingBag class="w-5 h-5 text-text-muted" />
										</div>
										<p class="text-text-primary font-bold text-sm mb-1">No se encontraron resultados</p>
										<p class="text-text-muted text-xs">Prueba ajustando los filtros de búsqueda o el rango de fechas.</p>
									</div>
								</td>
							</tr>
							
							<!-- Loading State rows -->
							<template v-if="isPending">
								<tr v-for="i in 5" :key="'loading-' + i">
									<td colspan="7" class="py-4.5 px-6">
										<div class="h-11 bg-bg-muted/40 animate-pulse rounded-xl w-full"></div>
									</td>
								</tr>
							</template>
						</tbody>
					</table>
				</div>

				<!-- Pagination Footer -->
				<div class="border-t border-border-default px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-bg-card">
					<span class="text-xs font-semibold text-text-muted">
						Mostrando <span class="text-text-primary font-bold">{{ filteredSales.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0 }}</span> - <span class="text-text-primary font-bold">{{ Math.min(currentPage * itemsPerPage, filteredSales.length) }}</span> de <span class="text-text-primary font-bold">{{ filteredSales.length.toLocaleString() }}</span> resultados
					</span>
					<div class="flex gap-1">
						<button 
							@click="currentPage > 1 && currentPage--"
							:disabled="currentPage === 1"
							class="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-muted/80 border border-border-default/50 text-text-muted hover:text-text-primary disabled:opacity-40 disabled:hover:text-text-muted disabled:cursor-not-allowed transition-all"
							aria-label="Página anterior"
						>
							<ChevronLeft class="w-4 h-4" />
						</button>
						
						<template v-for="page in totalPages" :key="page">
							<button 
								v-if="page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)"
								@click="currentPage = page"
								:class="currentPage === page ? 'bg-text-primary text-white border-transparent shadow-sm' : 'bg-transparent text-text-secondary border-transparent hover:bg-bg-muted'"
								class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all border"
							>
								{{ page }}
							</button>
							<span v-else-if="page === currentPage - 2 || page === currentPage + 2" class="w-8 h-8 flex items-center justify-center text-text-muted/65 text-xs select-none">...</span>
						</template>

						<button 
							@click="currentPage < totalPages && currentPage++"
							:disabled="currentPage === totalPages || totalPages === 0"
							class="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-muted/80 border border-border-default/50 text-text-muted hover:text-text-primary disabled:opacity-40 disabled:hover:text-text-muted disabled:cursor-not-allowed transition-all"
							aria-label="Siguiente página"
						>
							<ChevronRight class="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Details Modal -->
		<PurchaseDetailsModal ref="purchaseDetailsModalRef" @success="() => queryClient.invalidateQueries({ queryKey: ['sales'] })" />

		<!-- Toast -->
		<div v-if="showToast" class="toast toast-end toast-bottom z-50">
			<div class="alert text-white" :class="toastType === 'success' ? 'bg-success' : 'bg-error'">
				<span class="font-medium">{{ toastMessage }}</span>
			</div>
		</div>
	</div>
</template>

<style>
	@media print {
		body * {
			visibility: hidden;
		}
		.modal-box,
		.modal-box * {
			visibility: visible;
		}
		.modal-box {
			position: absolute !important;
			left: 0 !important;
			top: 0 !important;
			width: 100% !important;
			max-width: 100% !important;
			margin: 0 !important;
			border-radius: 0 !important;
			box-shadow: none !important;
			height: auto !important;
			max-height: none !important;
		}
		.print\:hidden {
			display: none !important;
		}
	}

	/* Custom styling for informative 12px tooltips */
	.tooltip::before {
		font-size: 12px !important;
		text-transform: none !important;
		max-width: 280px !important;
		white-space: pre-line !important;
		text-align: left !important;
		padding: 10px 14px !important;
		line-height: 1.45 !important;
		font-weight: 500 !important;
		background-color: #0f172a !important;
		color: #f8fafc !important;
		border-radius: 8px !important;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1) !important;
		z-index: 9999 !important;
	}
	.tooltip::after {
		z-index: 9999 !important;
	}

	/* Adjust first and last tooltip alignments to prevent edge-of-screen clipping */
	.tooltip-first::before {
		transform: translateX(-18%) !important;
	}
	.tooltip-first::after {
		transform: translateX(130%) !important;
	}
	
	.tooltip-last::before {
		transform: translateX(-82%) !important;
	}
	.tooltip-last::after {
		transform: translateX(-130%) !important;
	}
</style>
