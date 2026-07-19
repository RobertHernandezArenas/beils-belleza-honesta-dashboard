import { ref, computed, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useSalesAnalytics } from './useSalesAnalytics'
import { exportVentasCsv, exportVentasPdf } from '~/utils/exportHelpers'

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

	const {
		timeframeLabels,
		summaryStats,
		totalSparkline,
		totalSparklineArea,
		countSparkline,
		countSparklineArea,
		averageSparkline,
		averageSparklineArea,
		monthlyProjection,
	} = useSalesAnalytics(sales, summaryTimeframe)

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
			bizum: { label: 'BIZUM', class: 'bg-sky-100 text-sky-800' },
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

	const downloadCsv = () => {
		exportVentasCsv({
			filteredSales: filteredSales.value,
			reportData: reportData.value,
			dailySeries: dailySeries.value,
			weeklySeries: weeklySeries.value,
			monthlySeries: monthlySeries.value,
			getTicketDisplay,
			formatCustomDate,
			getPaymentMethodBadge,
			displayToast
		})
	}

	const downloadPdf = async () => {
		await exportVentasPdf({
			filteredSales: filteredSales.value,
			reportData: reportData.value,
			dailySeries: dailySeries.value,
			weeklySeries: weeklySeries.value,
			monthlySeries: monthlySeries.value,
			isGeneratingPdf,
			getTicketDisplay,
			formatCustomDate,
			getPaymentMethodBadge,
			formatCurrency,
			displayToast
		})
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
