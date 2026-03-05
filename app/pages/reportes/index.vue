<script lang="ts" setup>
	import { ref, computed } from 'vue'
	import { useQuery } from '@tanstack/vue-query'
	import {
		PieChart as PieChartIcon,
		Download,
		Users,
		Package,
		TrendingUp,
		CreditCard,
		Loader2,
		AlertCircle,
	} from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Reportes | Finanzas' })

	const { t } = useI18n()

	// Fetch aggregated report data
	const {
		data: reports,
		isPending,
		isError,
	} = useQuery<any>({
		queryKey: ['reportsOverview'],
		queryFn: () => $fetch('/api/reports'),
	})

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
	}

	// Line Chart Options (Revenue Trend)
	const revenueTrendOptions = computed(() => {
		if (!reports.value?.revenueTrend) return {}
		const data = reports.value.revenueTrend
		return {
			tooltip: { trigger: 'axis', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 8 },
			grid: { top: 30, right: 20, bottom: 30, left: 50 },
			xAxis: {
				type: 'category',
				data: data.map((d: any) => d.month),
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: { color: '#8c8c8c' },
			},
			yAxis: {
				type: 'value',
				splitLine: { lineStyle: { color: '#f2f0eb', type: 'dashed' } },
				axisLabel: { color: '#8c8c8c', formatter: '€{value}' },
			},
			series: [
				{
					data: data.map((d: any) => d.revenue),
					type: 'line',
					smooth: true,
					lineStyle: { color: '#1a1a1a', width: 3 },
					itemStyle: { color: '#1a1a1a' },
					areaStyle: {
						color: {
							type: 'linear',
							x: 0,
							y: 0,
							x2: 0,
							y2: 1,
							colorStops: [
								{ offset: 0, color: 'rgba(26,26,26,0.1)' },
								{ offset: 1, color: 'rgba(26,26,26,0)' },
							],
						},
					},
				},
			],
		}
	})

	// Pie Chart Options (Payment Methods)
	const paymentMethodsOptions = computed(() => {
		if (!reports.value?.paymentMethods) return {}
		return {
			tooltip: { trigger: 'item', borderRadius: 8 },
			legend: { bottom: 0, icon: 'circle', textStyle: { color: '#666666' } },
			series: [
				{
					type: 'pie',
					radius: ['40%', '70%'],
					avoidLabelOverlap: false,
					itemStyle: {
						borderRadius: 10,
						borderColor: '#fff',
						borderWidth: 2,
					},
					label: { show: false, position: 'center' },
					labelLine: { show: false },
					data: reports.value.paymentMethods,
				},
			],
			color: ['#1a1a1a', '#8c8c8c', '#d3cdc2', '#f4f1ee'],
		}
	})

	// Bar Chart Options (Top Items)
	const topItemsOptions = computed(() => {
		if (!reports.value?.topItems) return {}
		const data = [...reports.value.topItems].reverse() // Display highest at the top in horizontal
		return {
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, borderRadius: 8 },
			grid: { top: 20, right: 30, bottom: 20, left: 120 },
			xAxis: { type: 'value', show: false },
			yAxis: {
				type: 'category',
				data: data.map((d: any) => d.name),
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: { color: '#404040', fontWeight: 'bold' },
			},
			series: [
				{
					type: 'bar',
					data: data.map((d: any) => d.quantity),
					itemStyle: { borderRadius: [0, 8, 8, 0], color: '#1a1a1a' },
					barWidth: '50%',
					label: { show: true, position: 'right', valueAnimation: true, color: '#1a1a1a' },
				},
			],
		}
	})

	// PDF Export logic
	const isExporting = ref(false)
	const exportToPDF = async () => {
		try {
			isExporting.value = true
			// Wait a bit for the UI to show the 'Generating' state if needed, then trigger native print
			setTimeout(() => {
				window.print()
				isExporting.value = false
			}, 300)
		} catch (error) {
			console.error('Error exporting PDF:', error)
			isExporting.value = false
		}
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-[1400px]">
			<!-- Header -->
			<header class="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">
						{{ $t('finances.reports.title') }}
					</h1>
					<p class="text-text-muted text-sm font-medium">{{ $t('finances.reports.subtitle') }}</p>
				</div>
				<button
					@click="exportToPDF"
					:disabled="isPending || isExporting"
					class="btn bg-bg-card text-text-secondary hover:bg-bg-muted border-border-subtle flex h-12 items-center gap-2 rounded-full border px-6 shadow-sm transition-all disabled:opacity-50 print:hidden">
					<Loader2 v-if="isExporting" class="h-5 w-5 animate-spin" />
					<Download v-else class="h-5 w-5" />
					<span class="font-bold">
						{{ isExporting ? $t('finances.reports.generating') : $t('finances.reports.exportPdf') }}
					</span>
				</button>
			</header>

			<!-- Loading State -->
			<div v-if="isPending" class="flex flex-col gap-6">
				<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
					<div
						v-for="i in 4"
						:key="i"
						class="bg-bg-card border-border-default h-32 animate-pulse rounded-3xl border shadow-sm"></div>
				</div>
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div
						class="bg-bg-card border-border-default h-96 animate-pulse rounded-3xl border shadow-sm"></div>
					<div
						class="bg-bg-card border-border-default h-96 animate-pulse rounded-3xl border shadow-sm"></div>
				</div>
			</div>

			<!-- Error State -->
			<div
				v-else-if="isError"
				class="bg-error/10 text-error flex flex-col items-center justify-center rounded-3xl py-24 text-center">
				<AlertCircle class="mb-2 h-10 w-10 opacity-80" />
				<h2 class="text-xl font-bold">{{ $t('finances.reports.errorTitle') }}</h2>
				<p class="text-sm">{{ $t('finances.reports.errorDesc') }}</p>
			</div>

			<!-- Dashboard Container (Used for PDF Export) -->
			<div v-else id="report-container" class="bg-bg-app flex flex-col gap-6 rounded-xl p-2">
				<!-- KPIs -->
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
					<!-- Revenue KPI -->
					<div
						class="bg-bg-card border-border-default flex items-center gap-4 rounded-3xl border p-6 shadow-sm">
						<div
							class="bg-success/10 text-success flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
							<TrendingUp class="h-7 w-7" />
						</div>
						<div>
							<p class="text-text-muted text-sm font-bold tracking-wider uppercase">
								{{ $t('finances.reports.kpis.revenue') }}
							</p>
							<p class="text-text-primary text-2xl font-black tabular-nums">
								{{ formatCurrency(reports.kpis.totalRevenue) }}
							</p>
						</div>
					</div>

					<!-- Sales KPI -->
					<div
						class="bg-bg-card border-border-default flex items-center gap-4 rounded-3xl border p-6 shadow-sm">
						<div
							class="bg-info/10 text-info flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
							<CreditCard class="h-7 w-7" />
						</div>
						<div>
							<p class="text-text-muted text-sm font-bold tracking-wider uppercase">
								{{ $t('finances.reports.kpis.tickets') }}
							</p>
							<p class="text-text-primary text-2xl font-black tabular-nums">
								{{ reports.kpis.totalSales }}
							</p>
						</div>
					</div>

					<!-- Clients KPI -->
					<div
						class="bg-bg-card border-border-default flex items-center gap-4 rounded-3xl border p-6 shadow-sm">
						<div
							class="bg-warning/10 text-warning flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
							<Users class="h-7 w-7" />
						</div>
						<div>
							<p class="text-text-muted text-sm font-bold tracking-wider uppercase">
								{{ $t('finances.reports.kpis.clients') }}
							</p>
							<p class="text-text-primary text-2xl font-black tabular-nums">
								{{ reports.kpis.totalClients }}
							</p>
						</div>
					</div>

					<!-- Products KPI -->
					<div
						class="bg-bg-card border-border-default flex items-center gap-4 rounded-3xl border p-6 shadow-sm">
						<div
							class="bg-primary/10 text-primary flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
							<Package class="h-7 w-7" />
						</div>
						<div>
							<p class="text-text-muted text-sm font-bold tracking-wider uppercase">
								{{ $t('finances.reports.kpis.products') }}
							</p>
							<p class="text-text-primary text-2xl font-black tabular-nums">
								{{ reports.kpis.totalProducts }}
							</p>
						</div>
					</div>
				</div>

				<!-- Charts Row 1 -->
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<!-- Trend Chart -->
					<div class="bg-bg-card border-border-default flex flex-col rounded-3xl border p-6 shadow-sm">
						<h3 class="text-text-primary mb-1 text-lg font-bold">
							{{ $t('finances.reports.charts.revenueTitle') }}
						</h3>
						<p class="text-text-muted mb-6 text-sm">{{ $t('finances.reports.charts.revenueDesc') }}</p>
						<div class="h-[300px] w-full">
							<ClientChart :option="revenueTrendOptions" />
						</div>
					</div>

					<!-- Payment Methods -->
					<div class="bg-bg-card border-border-default flex flex-col rounded-3xl border p-6 shadow-sm">
						<h3 class="text-text-primary mb-1 text-lg font-bold">
							{{ $t('finances.reports.charts.methodsTitle') }}
						</h3>
						<p class="text-text-muted mb-6 text-sm">{{ $t('finances.reports.charts.methodsDesc') }}</p>
						<div class="h-[300px] w-full">
							<ClientChart :option="paymentMethodsOptions" />
						</div>
					</div>
				</div>

				<!-- Charts Row 2 -->
				<div class="grid grid-cols-1 gap-6">
					<!-- Top Products -->
					<div class="bg-bg-card border-border-default flex flex-col rounded-3xl border p-6 shadow-sm">
						<h3 class="text-text-primary mb-1 text-lg font-bold">
							{{ $t('finances.reports.charts.topItemsTitle') }}
						</h3>
						<p class="text-text-muted mb-6 text-sm">{{ $t('finances.reports.charts.topItemsDesc') }}</p>
						<div class="h-[300px] w-full">
							<ClientChart :option="topItemsOptions" />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
	@media print {
		:global(body),
		:global(html) {
			background-color: white !important;
		}
		:global(.drawer),
		:global(.drawer-content),
		:global(main) {
			height: auto !important;
			overflow: visible !important;
			background-color: white !important;
		}
		:global(.drawer-side),
		:global(nav) {
			display: none !important;
		}
		#report-container {
			box-shadow: none !important;
			margin: 0 !important;
			padding: 0 !important;
			width: 100% !important;
		}
		/* Prevent charts from breaking across pages */
		.grid > div {
			break-inside: avoid;
		}
	}
</style>
<style scoped>
	.chart {
		height: 100%;
		width: 100%;
	}
</style>
