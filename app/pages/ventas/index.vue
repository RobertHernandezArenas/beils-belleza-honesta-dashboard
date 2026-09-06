<script setup lang="ts">
import type { Sale, ModalRef } from '~~/shared/types/domain'
import { FileDown } from 'lucide-vue-next'
import { useQueryClient } from '@tanstack/vue-query'
import PurchaseDetailsModal from '~/components/shared/PurchaseDetailsModal.vue'
import SalesMetrics from '~/components/ventas/SalesMetrics.vue'
import SalesFilters from '~/components/ventas/SalesFilters.vue'
import SalesTable from '~/components/ventas/SalesTable.vue'
import SalesPagination from '~/components/ventas/SalesPagination.vue'
import SalesExportModal from '~/components/ventas/SalesExportModal.vue'
import InfoTooltip from '~/components/shared/InfoTooltip.vue'
import { useSales } from '~/composables/useSales'

definePageMeta({ layout: 'default' })
useHead({ title: 'Ventas | Finanzas' })

const queryClient = useQueryClient()

// Live-refresh sales metrics when a sale/debt is collected anywhere (this tab or another)
const { listenSalesChanged } = useRealtimeSales()
listenSalesChanged()

// Instantiate state & logic from useSales composable
const {
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
	toastMessage,
	toastType,
	showToast,
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
} = useSales()

// Modal reference & action
const purchaseDetailsModalRef = ref<ModalRef | null>(null)

const openDetails = (sale: Sale) => {
	purchaseDetailsModalRef.value?.open?.(sale)
}

// Compute sum totals for historic values
const salesCount = computed(() => sales.value?.length || 0)
const salesTotalSum = computed(() => sales.value?.reduce((sum, s) => sum + s.total, 0) || 0)

const availableYears = computed(() => {
	const current = new Date().getFullYear()
	return [current, current - 1, current - 2]
})
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8 lg:h-[calc(100dvh-73px)] lg:flex lg:flex-col lg:overflow-hidden">
		<div class="mx-auto flex size-full max-w-350 flex-col lg:overflow-hidden gap-6">
			
			<!-- HEADER -->
			<div class="flex flex-col md:flex-row justify-between items-center gap-4 mt-2">
				<h1 class="text-text-primary text-2xl font-black tracking-wider uppercase font-sans">HISTORIAL DE VENTAS Y FACTURACIÓN</h1>
				
				<div class="flex flex-wrap items-center gap-2">
					<!-- Píldoras de Selección de Periodo -->
					<div class="bg-bg-card border border-border-default/80 rounded-xl p-1 flex items-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] gap-0.5">
						<button
							:class="summaryTimeframe === 'day' ? 'bg-bg-muted/80 text-text-primary shadow-sm ring-1 ring-border-default/50' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/30'"
							class="px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-200 cursor-pointer"
							@click="setTimeframe('day')"
						>
							Día
						</button>
						<button
							:class="summaryTimeframe === 'week' ? 'bg-bg-muted/80 text-text-primary shadow-sm ring-1 ring-border-default/50' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/30'"
							class="px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-200 cursor-pointer"
							@click="setTimeframe('week')"
						>
							Semana
						</button>
						<button
							:class="summaryTimeframe === 'month' ? 'bg-bg-muted/80 text-text-primary shadow-sm ring-1 ring-border-default/50' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/30'"
							class="px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-200 cursor-pointer"
							@click="setTimeframe('month')"
						>
							Mes
						</button>
						<button
							:class="summaryTimeframe === 'quarter' ? 'bg-[#922c88] text-white shadow-sm ring-1 ring-[#922c88]' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/30'"
							class="px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-200 cursor-pointer"
							@click="setTimeframe('quarter')"
						>
							Trimestre
						</button>
						<button
							:class="summaryTimeframe === 'year' ? 'bg-bg-muted/80 text-text-primary shadow-sm ring-1 ring-border-default/50' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/30'"
							class="px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-200 cursor-pointer"
							@click="setTimeframe('year')"
						>
							Año
						</button>
						<button
							:class="summaryTimeframe === 'all' ? 'bg-bg-muted/80 text-text-primary shadow-sm ring-1 ring-border-default/50' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/30'"
							class="px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-200 cursor-pointer"
							@click="setTimeframe('all')"
						>
							Histórico
						</button>
					</div>

					<!-- Sub-píldoras de Trimestre (1T, 2T, 3T, 4T y año) para Autónomos -->
					<div
						v-if="summaryTimeframe === 'quarter'"
						class="flex items-center gap-1 bg-bg-card border border-[#922c88]/30 rounded-xl p-1 shadow-sm animate-in fade-in zoom-in-95 duration-200"
					>
						<button
							v-for="q in [1, 2, 3, 4]"
							:key="q"
							type="button"
							class="px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer"
							:class="selectedQuarter === q ? 'bg-[#922c88] text-white shadow-xs' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/40'"
							@click="selectedQuarter = q"
						>
							{{ q }}T
						</button>
						<div class="h-3.5 w-px bg-border-default mx-0.5" />
						<select
							v-model="selectedYear"
							class="bg-transparent text-[10px] font-black text-text-secondary outline-none border-none cursor-pointer pr-1"
						>
							<option v-for="yr in availableYears" :key="yr" :value="yr">
								{{ yr }}
							</option>
						</select>
						<InfoTooltip
							title="Ciclo Trimestral Autónomos (Día 20 al 20)"
							what="Alineado con el régimen de autónomos español: 1T (20 Ene - 20 Abr), 2T (20 Abr - 20 Jul), 3T (20 Jul - 20 Oct), 4T (20 Oct - 20 Ene)."
							why="El día 20 es el límite legal fijado por la Agencia Tributaria (AEAT) para liquidar los modelos trimestrales (303 de IVA y 130 de IRPF). Este ciclo evita desfases de facturas con la gestoría."
							how="Filtra ventas registradas entre las 00:00:00 del día 20 inicial y las 23:59:59 del día 20 del tercer mes."
							position="bottom"
							align="end"
						/>
					</div>

					<!-- Botón Destacado Exportar Ventas (.PDF / .CSV) -->
					<button
						type="button"
						class="bg-[#922c88] hover:bg-[#7e2575] text-white px-3.5 py-1.5 rounded-xl text-[11px] font-black tracking-wide uppercase flex items-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
						title="Abrir panel de exportación a PDF o CSV"
						@click="openExportModal"
					>
						<FileDown class="size-3.5" />
						<span>Exportar (.PDF / .CSV)</span>
					</button>
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
					@open-export="openExportModal"
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

		<!-- Export Options Modal -->
		<SalesExportModal
			:is-open="isExportModalOpen"
			:all-sales="sales || []"
			:initial-timeframe="summaryTimeframe"
			:initial-quarter="selectedQuarter"
			:initial-year="selectedYear"
			:is-generating-pdf="isGeneratingPdf"
			@close="closeExportModal"
			@export="executeExport"
		/>

		<!-- Toast Notification -->
		<div v-if="showToast" class="toast toast-end toast-bottom z-50">
			<div class="alert text-white shadow-xl" :class="toastType === 'success' ? 'bg-success' : 'bg-error'">
				<span class="font-bold text-xs">{{ toastMessage }}</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
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
