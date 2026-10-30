import { ref, computed, watch } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import type { Sale, SaleItem } from '~~/shared/types/domain'
import { paymentMethodLabel, paymentStatusLabel, salePaymentStatus } from '~~/shared/utils/payments'
import { salesFetchRange } from '~/utils/salesFetchRange'
import { buildSalesLedger, type DebtPaymentRow, type LedgerEntry } from '~/utils/salesLedger'
import { useSalesAnalytics, type SummaryTimeframe } from './useSalesAnalytics'
import {
	downloadSalesExportCsv,
	downloadSalesExportPdf,
} from '~/utils/exportHelpers'
import type {
	ExportDetailMode,
	ExportSummaryGrouping,
} from '~/utils/salesExportCalculations'
import {
	filterSalesList,
	getTicketDisplay,
} from '~/utils/salesFilterCalculations'

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

	const summaryTimeframe = ref<SummaryTimeframe>('all')
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

	// Carts (debt sales included) and debt payments inside the date range the filters need:
	// /ventas lists sales and collections, but never downloads the whole history for a month view
	const fetchRange = computed(() =>
		salesFetchRange({
			mode: filterDateMode.value,
			single: filterDateSingle.value,
			range: filterDateRange.value,
			timeframe: summaryTimeframe.value,
			year: selectedYear.value,
		}),
	)
	const { data: carts, isPending: cartsPending } = useQuery<Sale[]>({
		queryKey: ['sales', 'carts', fetchRange],
		queryFn: () => $fetch<Sale[]>('/api/sales/carts', { query: fetchRange.value }),
		placeholderData: keepPreviousData,
	})
	const { data: debtPayments, isPending: paymentsPending } = useQuery<DebtPaymentRow[]>({
		queryKey: ['sales', 'debt-payments', fetchRange],
		queryFn: () => $fetch<DebtPaymentRow[]>('/api/sales/debt-payments', { query: fetchRange.value }),
		placeholderData: keepPreviousData,
	})
	const isPending = computed(() => cartsPending.value || paymentsPending.value)

	const ledger = computed(() => buildSalesLedger(carts.value ?? [], debtPayments.value ?? []))
	// Invoiced sales: what the KPIs, sparklines and exports work on
	const sales = computed(() => ledger.value.invoiced)
	const ledgerEntries = computed(() => ledger.value.entries)

	// When user clicks one of the timeframe buttons, clear manual date pickers to prevent conflicting filters
	const setTimeframe = (tf: SummaryTimeframe) => {
		summaryTimeframe.value = tf
		filterDateSingle.value = ''
		filterDateRange.value = { start: '', end: '' }
	}

	const filteredSales = computed(() => {
		if (!ledgerEntries.value.length) return []
		return filterSalesList(ledgerEntries.value, {
			searchQuery: searchQuery.value,
			filterDateMode: filterDateMode.value,
			filterDateSingle: filterDateSingle.value,
			filterDateRange: filterDateRange.value,
			filterPaymentMethod: filterPaymentMethod.value,
			summaryTimeframe: summaryTimeframe.value,
			selectedQuarter: selectedQuarter.value,
			selectedYear: selectedYear.value,
			sortKey: sortKey.value,
			sortOrder: sortOrder.value,
		}) as LedgerEntry[]
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
		collectedStats,
		totalSparkline,
		totalSparklineArea,
		countSparkline,
		countSparklineArea,
		averageSparkline,
		averageSparklineArea,
		monthlyProjection,
	} = useSalesAnalytics(sales, summaryTimeframe, selectedQuarter, selectedYear, ledgerEntries)

	const toggleSort = (key: 'id' | 'date' | 'payment_method' | 'total' | 'client') => {
		if (sortKey.value === key) {
			sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
		} else {
			sortKey.value = key
			sortOrder.value = 'desc'
		}
	}

	const getPaymentMethodBadge = (method: string | null | undefined) => {
		const classes: Record<string, string> = {
			cash: 'bg-emerald-100 text-emerald-800',
			card: 'bg-[#F6EFEA] text-[#9D7D62] border-[#E8DACD]',
			mixed: 'bg-purple-100 text-purple-800',
			transfer: 'bg-orange-100 text-orange-800',
			stripe: 'bg-indigo-100 text-indigo-800',
			bizum: 'bg-sky-100 text-sky-800',
			debt: 'bg-red-100 text-red-800',
		}
		const key = (method || '').toLowerCase()
		return {
			label: paymentMethodLabel(method).toUpperCase(),
			class: classes[key] || 'bg-neutral text-neutral-content',
		}
	}

	// Sales paid in installments show their payment status; everything else shows its method
	const getPaymentBadge = (entry: LedgerEntry) => {
		const status = entry.row_kind === 'sale' ? salePaymentStatus(entry) : null
		if (!status) return getPaymentMethodBadge(entry.payment_method)
		const classes = {
			pending: 'bg-red-100 text-red-800',
			partial: 'bg-amber-100 text-amber-800',
			paid: 'bg-emerald-100 text-emerald-800',
		}
		return { label: paymentStatusLabel(status).toUpperCase(), class: classes[status.state] }
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
				1: '1 Ene - 31 Mar',
				2: '1 Abr - 30 Jun',
				3: '1 Jul - 30 Sep',
				4: '1 Oct - 31 Dic',
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
		summaryGrouping,
		targetSales,
		periodTitle,
	}: {
		format: 'csv' | 'pdf'
		mode: ExportDetailMode
		summaryGrouping?: ExportSummaryGrouping
		targetSales?: Sale[]
		periodTitle?: string
	}) => {
		// Exports list sales; collections (debt payments) and not-yet-invoiced debt carts are left out
		const salesToExport = targetSales || filteredSales.value.filter(e => e.row_kind === 'sale' && e.status === 'completed')
		const title = periodTitle || currentPeriodTitle.value

		if (!salesToExport.length) {
			displayToast('No se encontraron ventas para exportar en este periodo.', 'error')
			return
		}

		if (format === 'csv') {
			downloadSalesExportCsv({
				sales: salesToExport,
				mode,
				summaryGrouping,
				periodTitle: title,
				displayToast,
			})
		} else {
			await downloadSalesExportPdf({
				sales: salesToExport,
				mode,
				summaryGrouping,
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
		collectedStats,
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
		getPaymentBadge,
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
