<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import PurchaseDetailsModal from '~/components/shared/PurchaseDetailsModal.vue'
import SalesMetrics from '~/components/ventas/SalesMetrics.vue'
import SalesFilters from '~/components/ventas/SalesFilters.vue'
import SalesTable from '~/components/ventas/SalesTable.vue'
import SalesPagination from '~/components/ventas/SalesPagination.vue'
import { useSales } from '~/composables/useSales'

definePageMeta({ layout: 'default' })
useHead({ title: 'Ventas | Finanzas' })

const { t } = useI18n()
const queryClient = useQueryClient()

// Instantiate state & logic from useSales composable
const {
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
	toggleSort,
	getPaymentMethodBadge,
	getTotalItems,
	formatCurrency,
	formatCustomDate,
	getTicketDisplay,
	downloadCsv,
	downloadPdf,
} = useSales()

// Modal reference & action
const purchaseDetailsModalRef = ref<any>(null)

const openDetails = (sale: any) => {
	purchaseDetailsModalRef.value?.open(sale)
}

// Compute sum totals for historic values
const salesCount = computed(() => sales.value?.length || 0)
const salesTotalSum = computed(() => sales.value?.reduce((sum, s) => sum + s.total, 0) || 0)
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

			<!-- METRICS AND FILTERS ROW -->
			<div class="flex flex-col xl:flex-row gap-5 items-stretch justify-between w-full">
				<SalesMetrics
					:timeframe-labels="timeframeLabels"
					:summary-timeframe="summaryTimeframe"
					:summary-stats="summaryStats"
					:sales-count="salesCount"
					:sales-total-sum="salesTotalSum"
					:total-sparkline="totalSparkline"
					:total-sparkline-area="totalSparklineArea"
					:count-sparkline="countSparkline"
					:count-sparkline-area="countSparklineArea"
					:average-sparkline="averageSparkline"
					:average-sparkline-area="averageSparklineArea"
					:monthly-projection="monthlyProjection"
					:format-currency="formatCurrency"
				/>

				<SalesFilters
					v-model:search-query="searchQuery"
					v-model:filter-date-mode="filterDateMode"
					v-model:filter-date-single="filterDateSingle"
					v-model:filter-date-range="filterDateRange"
					v-model:filter-payment-method="filterPaymentMethod"
					:has-filtered-sales="filteredSales.length > 0"
					:is-generating-pdf="isGeneratingPdf"
					@download-csv="downloadCsv"
					@download-pdf="downloadPdf"
				/>
			</div>

			<!-- TABLE AREA -->
			<div class="bg-bg-card border border-border-default rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.02)]">
				<SalesTable
					:paginated-sales="paginatedSales"
					:is-pending="isPending"
					:sort-key="sortKey"
					:sort-order="sortOrder"
					:get-ticket-display="getTicketDisplay"
					:format-custom-date="formatCustomDate"
					:get-payment-method-badge="getPaymentMethodBadge"
					:get-total-items="getTotalItems"
					:format-currency="formatCurrency"
					@open-details="openDetails"
					@toggle-sort="toggleSort"
				/>

				<SalesPagination
					v-model:current-page="currentPage"
					:filtered-sales-length="filteredSales.length"
					:items-per-page="itemsPerPage"
					:total-pages="totalPages"
				/>
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
