import { ref, computed, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { Sale, SaleItem } from '~~/shared/types/domain'
import { useSalesAnalytics, type SummaryTimeframe } from './useSalesAnalytics'
import {
	downloadSalesExportCsv,
	downloadSalesExportPdf,
} from '~/utils/exportHelpers'
import {
	getPeriodDateBounds,
	type ExportDetailMode,
} from '~/utils/salesExportCalculations'

export interface SalesMonthGroup {
	key: string
	label: string
	methods: Map<string, number>
	total: number
}

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
	const searchQuery = ref('')
	const filterDateMode = ref<'single' | 'range'>('single')
	const filterDateSingle = ref('')
	const filterDateRange = ref({ start: '', end: '' })
	const filterPaymentMethod = ref('all')

	const summaryTimeframe = ref<SummaryTimeframe>('month')
	const selectedQuarter = ref<number>(Math.floor(new Date().getMonth() / 3) + 1)
	const selectedYear = ref<number>(new Date().getFullYear())

	const sortKey = ref<'id' | 'date' | 'payment_method' | 'total' | 'client'>('date')
	const sortOrder = ref<'desc' | 'asc'>('desc')

	const currentPage = ref(1)
	const itemsPerPage = ref(20)

	const isGeneratingPdf = ref(false)
	const isExportModalOpen = ref(false)
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

	const getTicketDisplay = (sale: Sale) => {
		return sale.invoice_number ? sale.invoice_number : `BBH-${new Date(sale.created_at).getFullYear()}-${(sale.cart_id.split('-')[0] ?? '').substring(0, 4)}`
	}

	// Fetch sales
	const { data: sales, isPending } = useQuery<Sale[]>({
		queryKey: ['sales', 'completed'],
		queryFn: () => $fetch<Sale[]>('/api/sales/carts', { query: { status: 'completed' } }),
	})

	// When user clicks one of the timeframe buttons, clear manual date pickers to prevent conflicting filters
	const setTimeframe = (tf: SummaryTimeframe) => {
		summaryTimeframe.value = tf
		filterDateSingle.value = ''
		filterDateRange.value = { start: '', end: '' }
	}

	const filteredSales = computed(() => {
		if (!sales.value) return []
		let result = sales.value

		// 1. Search Query (Client name or cart id)
		if (searchQuery.value) {
			const query = searchQuery.value.toLowerCase().trim()
			result = result.filter((s: Sale) => {
				const clientName = s.user ? `${s.user.name || ''} ${s.user.surname || ''}`.toLowerCase() : ''
				return clientName.includes(query) || s.cart_id.toLowerCase().includes(query) || (s.invoice_number || '').toLowerCase().includes(query)
			})
		}

		// 2. Date Filtering: Manual picker has precedence if populated; otherwise use summaryTimeframe
		const hasManualSingle = filterDateMode.value === 'single' && Boolean(filterDateSingle.value)
		const hasManualRange = filterDateMode.value === 'range' && Boolean(filterDateRange.value.start || filterDateRange.value.end)

		if (hasManualSingle) {
			result = result.filter((s: Sale) => {
				const saleDate = new Date(s.created_at).toISOString().split('T')[0]
				return saleDate === filterDateSingle.value
			})
		} else if (hasManualRange) {
			const start = filterDateRange.value.start ? new Date(filterDateRange.value.start) : null
			const end = filterDateRange.value.end ? new Date(filterDateRange.value.end) : null
			if (end) end.setHours(23, 59, 59, 999)

			result = result.filter((s: Sale) => {
				const saleDate = new Date(s.created_at)
				if (start && saleDate < start) return false
				if (end && saleDate > end) return false
				return true
			})
		} else if (summaryTimeframe.value !== 'all') {
			// Apply timeframe filter (Día, Semana, Mes, Trimestre, Año)
			const { start, end } = getPeriodDateBounds(summaryTimeframe.value, {
				quarter: selectedQuarter.value,
				year: selectedYear.value,
			})

			if (start && end) {
				result = result.filter((s: Sale) => {
					const saleDate = new Date(s.created_at)
					return saleDate >= start && saleDate <= end
				})
			}
		}

		// 3. Payment Method Filter
		if (filterPaymentMethod.value !== 'all') {
			result = result.filter((s: Sale) => s.payment_method === filterPaymentMethod.value)
		}

		// 4. Sorting
		result = [...result].sort((a: Sale, b: Sale) => {
			const modifier = sortOrder.value === 'asc' ? 1 : -1
			if (sortKey.value === 'date') {
				return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * modifier
			} else if (sortKey.value === 'total') {
				return (a.total - b.total) * modifier
			} else if (sortKey.value === 'payment_method') {
				return (a.payment_method || '').localeCompare(b.payment_method || '') * modifier
			} else if (sortKey.value === 'client') {
				const nameA = a.user ? `${a.user.name || ''} ${a.user.surname || ''}`.toLowerCase() : 'zzzz'
				const nameB = b.user ? `${b.user.name || ''} ${b.user.surname || ''}`.toLowerCase() : 'zzzz'
				return nameA.localeCompare(nameB) * modifier
			} else if (sortKey.value === 'id') {
				return getTicketDisplay(a).localeCompare(getTicketDisplay(b)) * modifier
			}
			return 0
		})

		return result
	})

	watch([
		searchQuery,
		filterDateMode,
		filterDateSingle,
		filterDateRange,
		filterPaymentMethod,
		summaryTimeframe,
		selectedQuarter,
		selectedYear,
		sortKey,
		sortOrder,
	], () => {
		currentPage.value = 1
	})

	const paginatedSales = computed(() => {
		const start = (currentPage.value - 1) * itemsPerPage.value
		const end = start + itemsPerPage.value
		return filteredSales.value.slice(start, end)
	})

	const totalPages = computed(() => Math.ceil(filteredSales.value.length / itemsPerPage.value) || 1)

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
	} = useSalesAnalytics(sales, summaryTimeframe, selectedQuarter, selectedYear)

	const toggleSort = (key: 'id' | 'date' | 'payment_method' | 'total' | 'client') => {
		if (sortKey.value === key) {
			sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
		} else {
			sortKey.value = key
			sortOrder.value = 'desc'
		}
	}

	const getPaymentMethodBadge = (method: string | null | undefined) => {
		const methods: Record<string, { label: string; class: string }> = {
			cash: { label: 'EFECTIVO', class: 'bg-emerald-100 text-emerald-800' },
			card: { label: 'TARJETA', class: 'bg-[#F6EFEA] text-[#9D7D62] border-[#E8DACD]' },
			mixed: { label: 'MIXTO', class: 'bg-purple-100 text-purple-800' },
			transfer: { label: 'TRANSFERENCIA', class: 'bg-orange-100 text-orange-800' },
			stripe: { label: 'STRIPE', class: 'bg-indigo-100 text-indigo-800' },
			bizum: { label: 'BIZUM', class: 'bg-sky-100 text-sky-800' },
		}
		const key = method || ''
		return methods[key] || { label: key.toUpperCase(), class: 'bg-neutral text-neutral-content' }
	}

	const getTotalItems = (items: SaleItem[]) => {
		if (!items) return 0
		return items.reduce((acc: number, item: SaleItem) => acc + item.quantity, 0)
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

	// Current human title of the active period
	const currentPeriodTitle = computed(() => {
		const hasManualSingle = filterDateMode.value === 'single' && Boolean(filterDateSingle.value)
		const hasManualRange = filterDateMode.value === 'range' && Boolean(filterDateRange.value.start || filterDateRange.value.end)

		if (hasManualSingle) {
			return `Día ${filterDateSingle.value}`
		}
		if (hasManualRange) {
			return `Rango ${filterDateRange.value.start || 'inicio'} - ${filterDateRange.value.end || 'hoy'}`
		}

		if (summaryTimeframe.value === 'quarter') {
			const quarterLabels: Record<number, string> = {
				1: '20 Ene - 20 Abr',
				2: '20 Abr - 20 Jul',
				3: '20 Jul - 20 Oct',
				4: `20 Oct ${selectedYear.value} - 20 Ene ${selectedYear.value + 1}`,
			}
			return `${selectedQuarter.value}T ${selectedYear.value} (${quarterLabels[selectedQuarter.value] || `Trimestre ${selectedQuarter.value}`})`
		}
		if (summaryTimeframe.value === 'year') {
			return `Año ${selectedYear.value}`
		}
		if (summaryTimeframe.value === 'all') {
			return 'Histórico Total'
		}
		return timeframeLabels.value[summaryTimeframe.value] || 'Periodo personalizado'
	})

	// Modal Controls
	const openExportModal = () => {
		isExportModalOpen.value = true
	}

	const closeExportModal = () => {
		isExportModalOpen.value = false
	}

	// Execute export with customized options
	const executeExport = async ({
		format,
		mode,
		targetSales,
		periodTitle,
	}: {
		format: 'csv' | 'pdf'
		mode: ExportDetailMode
		targetSales?: Sale[]
		periodTitle?: string
	}) => {
		const salesToExport = targetSales || filteredSales.value
		const title = periodTitle || currentPeriodTitle.value

		if (!salesToExport.length) {
			displayToast('No se encontraron ventas para exportar en este periodo.', 'error')
			return
		}

		if (format === 'csv') {
			downloadSalesExportCsv({
				sales: salesToExport,
				mode,
				periodTitle: title,
				displayToast,
			})
		} else {
			await downloadSalesExportPdf({
				sales: salesToExport,
				mode,
				periodTitle: title,
				isGeneratingPdf,
				displayToast,
			})
		}
	}

	// Legacy direct download helpers
	const downloadCsv = () => {
		executeExport({ format: 'csv', mode: 'breakdown' })
	}

	const downloadPdf = async () => {
		await executeExport({ format: 'pdf', mode: 'breakdown' })
	}

	return {
		searchQuery,
		filterDateMode,
		filterDateSingle,
		filterDateRange,
		filterPaymentMethod,
		summaryTimeframe,
		selectedQuarter,
		selectedYear,
		setTimeframe,
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
		isExportModalOpen,
		currentPeriodTitle,
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
		openExportModal,
		closeExportModal,
		executeExport,
		downloadCsv,
		downloadPdf,
	}
}
