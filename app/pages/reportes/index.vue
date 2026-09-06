<script lang="ts" setup>
	import { useQuery } from '@tanstack/vue-query'
	import {
		TrendingUp,
		Receipt,
		CalendarCheck,
		AlertCircle,
		Printer,
		FileSpreadsheet,
		Award,
		Sparkles,
		ShoppingBag,
		Clock,
		ArrowUpRight,
		ArrowDownRight,
		UserCheck,
		ShieldAlert,
		ChevronRight,
	} from 'lucide-vue-next'
	import { formatCurrency } from '~/utils/format'
	import InfoTooltip from '~/components/shared/InfoTooltip.vue'

	interface ReportsOverview {
		period: {
			range: string
			startDate: string | null
			endDate: string
			granularity: string
		}
		kpis: {
			grossRevenue: number
			netRevenue: number
			revenueDelta: number | null
			totalSales: number
			salesDelta: number | null
			aov: number
			aovDelta: number | null
			totalDiscounts: number
			discountRate: number
			totalClients: number
			newClients: number
			newClientsDelta: number | null
			uniqueBuyers: number
			returningBuyers: number
			firstTimeBuyers: number
			retentionRate: number
			totalBookings: number
			bookingsDelta: number | null
			completedBookings: number
			cancelledBookings: number
			cancellationRate: number
			totalProducts: number
			pendingDebts: number
		}
		revenueTrend: {
			key: string
			label: string
			revenue: number
			tickets: number
			aov: number
		}[]
		salesMix: {
			type: string
			label: string
			revenue: number
			quantity: number
			percentage: number
		}[]
		paymentMethods: {
			name: string
			count: number
			amount: number
			percentage: number
		}[]
		topServices: {
			name: string
			type: string
			quantity: number
			revenue: number
		}[]
		topProducts: {
			name: string
			type: string
			quantity: number
			revenue: number
		}[]
		topClients: {
			id: string
			name: string
			email: string
			avatar: string
			totalSpend: number
			ordersCount: number
		}[]
		commercialMetrics?: {
			crossSellingRate: number
			cartsWithBoth: number
			unitsPerTransaction: number
			serviceAov: number
			productAov: number
			dailyRevenueRate: number
			projectedMonthlyRevenue: number
		}
		bookingStatusDistribution: {
			status: string
			label: string
			count: number
		}[]
	}

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Business Intelligence & Reportes | Beils' })

	// Period ranges configuration
	const ranges = [
		{ key: '7d', label: '7 Días' },
		{ key: '30d', label: '30 Días' },
		{ key: 'month', label: 'Este Mes' },
		{ key: 'quarter', label: 'Trimestre' },
		{ key: 'year', label: 'Este Año' },
		{ key: 'all', label: 'Histórico' },
	]

	const selectedRange = ref('30d')

	// Query with reactive range key
	const {
		data: reports,
		isPending,
		isError,
		refetch,
	} = useQuery<ReportsOverview>({
		queryKey: computed(() => ['reportsOverview', selectedRange.value]),
		queryFn: () => $fetch(`/api/reports?range=${selectedRange.value}`),
	})

	const chart = useChartTheme()

	// Range human label
	const periodLabel = computed(() => {
		if (!reports.value?.period) return ''
		const p = reports.value.period
		if (!p.startDate) return 'Todo el histórico registrado'
		const startStr = new Date(p.startDate).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		})
		const endStr = new Date(p.endDate).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		})
		return `${startStr} — ${endStr}`
	})

	// 1. Revenue & Sales Volume Trend (Dual-Axis Chart)
	const revenueTrendOptions = computed(() => {
		if (!reports.value?.revenueTrend) return null
		const ct = chart.value
		const trend = reports.value.revenueTrend

		return {
			tooltip: {
				trigger: 'axis',
				backgroundColor: ct.tooltipBg,
				borderColor: ct.tooltipBorder,
				textStyle: { color: ct.tooltipText },
				borderRadius: 10,
				padding: [10, 14],
				formatter: (params: unknown) => {
					const items = params as Array<{
						axisValueLabel: string
						seriesName: string
						value: number
						color: string
					}>
					if (!items || items.length === 0 || !items[0]) return ''
					const firstItem = items[0]
					let str = `<div class="font-bold text-xs tracking-wider uppercase mb-1.5 opacity-80">${firstItem.axisValueLabel}</div>`
					items.forEach((it) => {
						const valFormatted =
							it.seriesName === 'Facturación'
								? formatCurrency(it.value)
								: `${it.value} tickets`
						str += `<div class="flex items-center justify-between gap-4 text-xs my-0.5">
							<span class="flex items-center gap-1.5">
								<span class="inline-block size-2 rounded-full" style="background-color: ${it.color};"></span>
								<span>${it.seriesName}:</span>
							</span>
							<b class="tabular-nums font-mono">${valFormatted}</b>
						</div>`
					})
					return str
				},
			},
			legend: {
				top: 0,
				right: 10,
				textStyle: { color: ct.label, fontSize: 12 },
				icon: 'circle',
			},
			grid: { top: 40, right: 45, bottom: 25, left: 55 },
			xAxis: {
				type: 'category',
				data: trend.map((d) => d.label),
				axisLine: { lineStyle: { color: ct.axisLine } },
				axisTick: { show: false },
				axisLabel: { color: ct.axis, fontSize: 11 },
			},
			yAxis: [
				{
					type: 'value',
					name: 'Euros (€)',
					nameTextStyle: { color: ct.axis, fontSize: 10, align: 'left', padding: [0, 0, 0, -40] },
					splitLine: { lineStyle: { color: ct.grid, type: 'dashed' } },
					axisLabel: { color: ct.axis, formatter: '€{value}', fontSize: 11 },
				},
				{
					type: 'value',
					name: 'Tickets',
					nameTextStyle: { color: ct.axis, fontSize: 10, align: 'right', padding: [0, -35, 0, 0] },
					splitLine: { show: false },
					axisLabel: { color: ct.axis, fontSize: 11 },
				},
			],
			series: [
				{
					name: 'Facturación',
					type: 'line',
					smooth: true,
					yAxisIndex: 0,
					data: trend.map((d) => d.revenue),
					lineStyle: { color: ct.accent, width: 3 },
					itemStyle: { color: ct.accent },
					areaStyle: {
						color: {
							type: 'linear',
							x: 0,
							y: 0,
							x2: 0,
							y2: 1,
							colorStops: [
								{ offset: 0, color: ct.areaTop },
								{ offset: 1, color: ct.areaBottom },
							],
						},
					},
				},
				{
					name: 'Tickets Emitidos',
					type: 'bar',
					yAxisIndex: 1,
					data: trend.map((d) => d.tickets),
					barWidth: 10,
					itemStyle: {
						borderRadius: [4, 4, 0, 0],
						color: ct.series,
						opacity: 0.65,
					},
				},
			],
		}
	})

	// Unified color mappings so charts and custom legends match 100%
	const salesMixColors = computed(() => {
		const ct = chart.value
		return [ct.accent, '#f59e0b', '#3b82f6']
	})

	const paymentMethodColors: Record<string, string> = {
		Tarjeta: '#3b82f6',
		Efectivo: '#10b981',
		Transferencia: '#8b5cf6',
		Mixto: '#f59e0b',
		Otro: '#6b7280',
	}

	const bookingStatusColors: Record<string, string> = {
		completed: '#10b981',
		confirmed: '#3b82f6',
		pending: '#f59e0b',
		cancelled: '#ef4444',
	}

	// 2. Sales Mix (Services vs Retail vs Packages)
	const salesMixOptions = computed(() => {
		if (!reports.value?.salesMix) return null
		const ct = chart.value
		const totalRevenue = reports.value.salesMix.reduce((acc, m) => acc + m.revenue, 0)

		// Handle empty state gracefully without misleading colored slices
		if (totalRevenue === 0) {
			return {
				tooltip: { show: false },
				series: [
					{
						type: 'pie',
						radius: ['52%', '78%'],
						center: ['50%', '50%'],
						silent: true,
						itemStyle: {
							color: ct.grid,
							borderRadius: 8,
						},
						label: {
							show: true,
							position: 'center',
							formatter: 'Sin ventas\nen el periodo',
							color: ct.axis,
							fontSize: 12,
							lineHeight: 18,
							fontWeight: 'bold',
						},
						data: [{ value: 1 }],
					},
				],
			}
		}

		const data = reports.value.salesMix.map((m, idx) => ({
			name: m.label,
			value: m.revenue,
			percentage: m.percentage,
			itemStyle: { color: salesMixColors.value[idx] || ct.accent },
		}))

		return {
			tooltip: {
				trigger: 'item',
				backgroundColor: ct.tooltipBg,
				borderColor: ct.tooltipBorder,
				textStyle: { color: ct.tooltipText },
				borderRadius: 8,
				formatter: (params: { name: string; value: number; percent: number }) => {
					return `<div class="text-xs">
						<div class="font-bold mb-1">${params.name}</div>
						<div>Ingresos: <b>${formatCurrency(params.value)}</b> (${params.percent}%)</div>
					</div>`
				},
			},
			legend: { show: false },
			series: [
				{
					type: 'pie',
					radius: ['52%', '78%'],
					center: ['50%', '50%'],
					avoidLabelOverlap: false,
					itemStyle: {
						borderRadius: 8,
						borderColor: ct.surface,
						borderWidth: 2,
					},
					label: { show: false },
					emphasis: {
						label: {
							show: true,
							fontSize: 14,
							fontWeight: 'bold',
							color: ct.text,
							formatter: '{b}\n{d}%',
						},
					},
					data,
				},
			],
		}
	})

	// 3. Payment Methods (Donut)
	const paymentMethodsOptions = computed(() => {
		if (!reports.value?.paymentMethods) return null
		const ct = chart.value
		const totalAmount = reports.value.paymentMethods.reduce((sum, pm) => sum + pm.amount, 0)

		if (totalAmount === 0) {
			return {
				tooltip: { show: false },
				series: [
					{
						type: 'pie',
						radius: ['45%', '72%'],
						center: ['50%', '50%'],
						silent: true,
						itemStyle: { color: ct.grid, borderRadius: 8 },
						label: {
							show: true,
							position: 'center',
							formatter: 'Sin cobros\nen el periodo',
							color: ct.axis,
							fontSize: 12,
							lineHeight: 18,
							fontWeight: 'bold',
						},
						data: [{ value: 1 }],
					},
				],
			}
		}

		const data = reports.value.paymentMethods.map((pm) => ({
			name: pm.name,
			value: pm.amount,
			count: pm.count,
			percentage: pm.percentage,
			itemStyle: { color: paymentMethodColors[pm.name] || '#6b7280' },
		}))

		return {
			tooltip: {
				trigger: 'item',
				backgroundColor: ct.tooltipBg,
				borderColor: ct.tooltipBorder,
				textStyle: { color: ct.tooltipText },
				borderRadius: 8,
				formatter: (params: { name: string; value: number; percent: number; data: { count: number } }) => {
					return `<div class="text-xs">
						<div class="font-bold mb-1">${params.name}</div>
						<div>Total: <b>${formatCurrency(params.value)}</b> (${params.percent}%)</div>
						<div class="opacity-80">Transacciones: <b>${params.data.count}</b></div>
					</div>`
				},
			},
			legend: { show: false },
			series: [
				{
					type: 'pie',
					radius: ['45%', '72%'],
					center: ['50%', '50%'],
					avoidLabelOverlap: false,
					itemStyle: {
						borderRadius: 8,
						borderColor: ct.surface,
						borderWidth: 2,
					},
					label: { show: false },
					data,
				},
			],
		}
	})

	// 4. Booking Status Distribution (Donut)
	const bookingStatusOptions = computed(() => {
		if (!reports.value?.bookingStatusDistribution) return null
		const ct = chart.value
		const totalBookings = reports.value.bookingStatusDistribution.reduce((sum, bs) => sum + bs.count, 0)

		if (totalBookings === 0) {
			return {
				tooltip: { show: false },
				series: [
					{
						type: 'pie',
						radius: ['45%', '72%'],
						center: ['50%', '50%'],
						silent: true,
						itemStyle: { color: ct.grid, borderRadius: 8 },
						label: {
							show: true,
							position: 'center',
							formatter: 'Sin citas\nen el periodo',
							color: ct.axis,
							fontSize: 12,
							lineHeight: 18,
							fontWeight: 'bold',
						},
						data: [{ value: 1 }],
					},
				],
			}
		}

		const data = reports.value.bookingStatusDistribution.map((bs) => ({
			name: bs.label,
			value: bs.count,
			itemStyle: { color: bookingStatusColors[bs.status] || '#6b7280' },
		}))

		return {
			tooltip: {
				trigger: 'item',
				backgroundColor: ct.tooltipBg,
				borderColor: ct.tooltipBorder,
				textStyle: { color: ct.tooltipText },
				borderRadius: 8,
			},
			legend: { show: false },
			series: [
				{
					type: 'pie',
					radius: ['45%', '72%'],
					center: ['50%', '50%'],
					avoidLabelOverlap: false,
					itemStyle: {
						borderRadius: 8,
						borderColor: ct.surface,
						borderWidth: 2,
					},
					label: { show: false },
					data,
				},
			],
		}
	})

	// Export PDF (clean native print)
	const isExporting = ref(false)
	const exportToPDF = () => {
		isExporting.value = true
		setTimeout(() => {
			window.print()
			isExporting.value = false
		}, 300)
	}

	// Export CSV
	const exportToCSV = () => {
		if (!reports.value) return
		const rep = reports.value
		const rows: string[][] = []

		// Header block
		rows.push(['REPORTE DE BUSINESS INTELLIGENCE - BEILS BELLEZA HONESTA'])
		rows.push(['Periodo:', periodLabel.value])
		rows.push(['Fecha de Generación:', new Date().toLocaleString('es-ES')])
		rows.push([])

		// Section 1: KPIs
		rows.push(['METRICAS PRINCIPALES (KPIS)'])
		rows.push(['Indicador', 'Valor', 'Comparativa vs Periodo Previo'])
		rows.push(['Facturación Bruta', `€${rep.kpis.grossRevenue}`, rep.kpis.revenueDelta !== null ? `${rep.kpis.revenueDelta}%` : 'N/A'])
		rows.push(['Facturación Neta', `€${rep.kpis.netRevenue}`, ''])
		rows.push(['Ticket Medio (AOV)', `€${rep.kpis.aov}`, rep.kpis.aovDelta !== null ? `${rep.kpis.aovDelta}%` : 'N/A'])
		rows.push(['Total Tickets Emitidos', `${rep.kpis.totalSales}`, rep.kpis.salesDelta !== null ? `${rep.kpis.salesDelta}%` : 'N/A'])
		rows.push(['Total Descuentos Aplicados', `€${rep.kpis.totalDiscounts}`, `Tasa: ${rep.kpis.discountRate}%`])
		rows.push(['Nuevos Clientes Captados', `${rep.kpis.newClients}`, rep.kpis.newClientsDelta !== null ? `${rep.kpis.newClientsDelta}%` : 'N/A'])
		rows.push(['Tasa de Retención', `${rep.kpis.retentionRate}%`, ''])
		rows.push(['Citas Totales Agendadas', `${rep.kpis.totalBookings}`, ''])
		rows.push(['Citas Completadas', `${rep.kpis.completedBookings}`, ''])
		rows.push(['Tasa de Cancelación / Ausente', `${rep.kpis.cancellationRate}%`, ''])
		rows.push(['Saldo Deudor Pendiente', `€${rep.kpis.pendingDebts}`, ''])
		rows.push([])

		// Section 2: Sales Mix
		rows.push(['MIX DE NEGOCIO'])
		rows.push(['Categoría', 'Ingresos (€)', 'Unidades/Sesiones', 'Porcentaje (%)'])
		rep.salesMix.forEach((sm) => {
			rows.push([sm.label, `€${sm.revenue}`, `${sm.quantity}`, `${sm.percentage}%`])
		})
		rows.push([])

		// Section 3: Commercial Intelligence & Cross-Selling
		rows.push(['INTELIGENCIA COMERCIAL & VENTA CRUZADA'])
		rows.push(['Métrica', 'Valor'])
		rows.push(['Tasa de Venta Cruzada (Attach Rate)', `${rep.commercialMetrics?.crossSellingRate ?? 0}%`])
		rows.push(['Tickets con Venta Cruzada (Servicio + Cosmética)', `${rep.commercialMetrics?.cartsWithBoth ?? 0}`])
		rows.push(['Unidades por Ticket (UPT)', `${rep.commercialMetrics?.unitsPerTransaction ?? 0} arts/ticket`])
		rows.push(['Ticket Medio en Servicios en Cabina', `€${rep.commercialMetrics?.serviceAov ?? 0}`])
		rows.push(['Ticket Medio en Cosmética Retail', `€${rep.commercialMetrics?.productAov ?? 0}`])
		rows.push(['Velocidad Diaria de Facturación', `€${rep.commercialMetrics?.dailyRevenueRate ?? 0}/día`])
		rows.push(['Proyección Mensual Estimada (Run Rate)', `€${rep.commercialMetrics?.projectedMonthlyRevenue ?? 0}`])
		rows.push([])

		// Section 4: Top Services
		rows.push(['TOP TRATAMIENTOS MAS VENDIDOS'])
		rows.push(['Tratamiento', 'Sesiones / Unidades', 'Facturación (€)'])
		rep.topServices.forEach((ts) => {
			rows.push([ts.name, `${ts.quantity}`, `€${ts.revenue}`])
		})
		rows.push([])

		// Section 5: Top Clients
		rows.push(['CLIENTES VIP'])
		rows.push(['Nombre', 'Email', 'Pedidos / Citas', 'Gasto Total (€)'])
		rep.topClients.forEach((tc) => {
			rows.push([tc.name, tc.email, `${tc.ordersCount}`, `€${tc.totalSpend}`])
		})

		const csvContent =
			'\uFEFF' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.setAttribute('href', url)
		link.setAttribute('download', `reporte-bi-beils-${selectedRange.value}-${Date.now()}.csv`)
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-375">
			<!-- Header & Period Switcher -->
			<header class="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
				<div>
					<div class="mb-1 flex items-center gap-2.5">
						<h1 class="text-text-primary text-2xl font-bold tracking-tight lg:text-3xl">
							Business Intelligence & Reportes
						</h1>
						<span class="border-accent/30 bg-accent/10 text-accent rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase">
							Executive BI
						</span>
					</div>
					<p class="text-text-muted text-sm font-medium">
						Control analítico integral: finanzas, ventas comerciales, retención y operativa de cabinas
					</p>
					<p v-if="periodLabel" class="text-text-muted/80 mt-1 flex items-center gap-1.5 text-xs font-mono">
						<Clock class="size-3.5" />
						<span>Periodo analizado: <b>{{ periodLabel }}</b></span>
					</p>
				</div>

				<!-- Controls Bar -->
				<div class="flex flex-wrap items-center gap-3 print:hidden">
					<!-- Range Pills Selector -->
					<div class="bg-bg-card border-border-default flex items-center rounded-2xl border p-1 shadow-xs">
						<button
							v-for="r in ranges"
							:key="r.key"
							:class="[
								'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
								selectedRange === r.key
									? 'bg-accent text-white shadow-xs'
									: 'text-text-muted hover:text-text-primary hover:bg-bg-subtle',
							]"
							@click="selectedRange = r.key">
							{{ r.label }}
						</button>
					</div>

					<!-- Export CSV Button -->
					<button
						:disabled="isPending || !reports"
						title="Exportar a CSV para Excel o Contabilidad"
						class="btn bg-bg-card text-text-primary hover:bg-bg-subtle border-border-default flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
						@click="exportToCSV">
						<FileSpreadsheet class="size-4 text-emerald-600 dark:text-emerald-400" />
						<span>CSV</span>
					</button>

					<!-- Export PDF Button -->
					<button
						:disabled="isPending || isExporting"
						title="Generar informe para impresión o PDF"
						class="btn bg-bg-card text-text-primary hover:bg-bg-subtle border-border-default flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
						@click="exportToPDF">
						<Printer class="size-4 text-accent" />
						<span>{{ isExporting ? 'Preparando...' : 'Informe PDF' }}</span>
					</button>
				</div>
			</header>

			<!-- Loading Skeleton -->
			<div v-if="isPending" class="flex flex-col gap-6">
				<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
					<div
						v-for="i in 4"
						:key="i"
						class="bg-bg-card border-border-default h-36 animate-pulse rounded-3xl border shadow-xs" />
				</div>
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<div class="bg-bg-card border-border-default h-80 animate-pulse rounded-3xl border shadow-xs lg:col-span-2" />
					<div class="bg-bg-card border-border-default h-80 animate-pulse rounded-3xl border shadow-xs" />
				</div>
			</div>

			<!-- Error State -->
			<div
				v-else-if="isError"
				class="bg-error/10 text-error border-error/20 flex flex-col items-center justify-center rounded-3xl border p-12 text-center">
				<AlertCircle class="mb-3 size-10 opacity-80" />
				<h2 class="text-lg font-bold">Error al sincronizar datos analíticos</h2>
				<p class="text-text-muted mt-1 max-w-md text-sm">
					No se pudieron calcular las métricas para el periodo seleccionado. Por favor revisa la conexión con el servidor.
				</p>
				<button
					class="btn bg-bg-card text-text-primary hover:bg-bg-subtle border-border-default mt-4 rounded-xl border px-4 py-2 text-xs font-bold"
					@click="() => refetch()">
					Reintentar análisis
				</button>
			</div>

			<!-- Main Dashboard Body (Print Target) -->
			<div v-else id="report-container" class="flex flex-col gap-8">
				<!-- TIER 1: Executive KPI Bento Grid -->
				<section class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
					<!-- KPI 1: Facturación Bruta & Neta -->
					<div class="bg-bg-card border-border-default flex flex-col justify-between rounded-3xl border p-6 shadow-xs transition-shadow hover:shadow-md">
						<div class="flex items-start justify-between">
							<div class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex size-12 items-center justify-center rounded-2xl">
								<TrendingUp class="size-6" />
							</div>
							<!-- Delta Badge with Tooltip -->
							<InfoTooltip
								v-if="reports?.kpis.revenueDelta !== null"
								title="Variación de Facturación (%)"
								what="Porcentaje de variación de los ingresos brutos comparado con el periodo anterior de igual duración."
								why="Permite saber al instante si la facturación del centro crece (verde con flecha hacia arriba) o se contrae (rojo con flecha hacia abajo) respecto al periodo equivalente previo."
								how="((Facturación actual - Facturación anterior) / Facturación anterior) * 100."
								position="bottom"
								align="end"
							>
								<template #trigger="{ toggle, isOpen }">
									<button
										type="button"
										:class="[
											'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold cursor-help transition-all hover:scale-105',
											(reports?.kpis.revenueDelta ?? 0) >= 0
												? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
												: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20',
											isOpen ? 'ring-2 ring-accent/30' : ''
										]"
										@click.stop="toggle"
									>
										<ArrowUpRight v-if="(reports?.kpis.revenueDelta ?? 0) >= 0" class="size-3.5" />
										<ArrowDownRight v-else class="size-3.5" />
										<span>{{ (reports?.kpis.revenueDelta ?? 0) > 0 ? '+' : '' }}{{ reports?.kpis.revenueDelta }}%</span>
									</button>
								</template>
							</InfoTooltip>
						</div>

						<div class="mt-4">
							<div class="flex items-center gap-1.5">
								<p class="text-text-muted text-xs font-bold tracking-wider uppercase">
									Facturación Bruta
								</p>
								<InfoTooltip
									title="Facturación Bruta y Neta"
									what="Total monetario facturado en el periodo antes y después de aplicar descuentos comerciales y promociones."
									why="Permite evaluar la masa total de ventas del centro y vigilar el impacto real de las promociones sobre el margen operativo."
									how="Facturación Bruta = sumatorio de todos los importes de venta. Facturación Neta = Facturación Bruta menos descuentos otorgados."
									position="bottom"
									align="start"
								/>
							</div>
							<p class="text-text-primary text-2xl font-black tracking-tight tabular-nums lg:text-3xl">
								{{ formatCurrency(reports?.kpis.grossRevenue ?? 0) }}
							</p>
						</div>

						<div class="border-border-subtle text-text-muted mt-3 flex items-center justify-between border-t pt-3 text-xs">
							<span class="inline-flex items-center gap-1">
								<span>Neto: <b>{{ formatCurrency(reports?.kpis.netRevenue ?? 0) }}</b></span>
								<InfoTooltip
									title="Facturación Neta"
									what="Ingreso neto real cobrado en caja una vez descontadas las promociones, cupones o rebajas aplicadas."
									why="Refleja el dinero efectivo real que entra al negocio, distinguiendo la venta nominal o de catálogo de la cobrada."
									how="Facturación Bruta menos Total de Descuentos concedidos. Es la base real de liquidez operativa."
									position="top"
									align="start"
									size="xs"
								/>
							</span>
							<span class="inline-flex items-center gap-1">
								<span>Desc: <b>{{ formatCurrency(reports?.kpis.totalDiscounts ?? 0) }}</b></span>
								<InfoTooltip
									title="Descuentos Totales Concedidos"
									what="Suma en euros del importe rebajado o bonificado a los clientes durante el periodo seleccionado."
									why="Controla el coste comercial de las promociones y evita que rebajas excesivas erosionen el margen de los tratamientos."
									how="Sumatorio directo de todos los importes de descuento aplicados en los carritos de venta cobrados."
									position="top"
									align="end"
									size="xs"
								/>
							</span>
						</div>
					</div>

					<!-- KPI 2: Ticket Medio (AOV) -->
					<div class="bg-bg-card border-border-default flex flex-col justify-between rounded-3xl border p-6 shadow-xs transition-shadow hover:shadow-md">
						<div class="flex items-start justify-between">
							<div class="bg-blue-500/10 text-blue-600 dark:text-blue-400 flex size-12 items-center justify-center rounded-2xl">
								<Receipt class="size-6" />
							</div>
							<!-- Delta Badge with Tooltip -->
							<InfoTooltip
								v-if="reports?.kpis.aovDelta !== null"
								title="Variación del Ticket Medio (%)"
								what="Comparativa porcentual del gasto medio por cliente frente al periodo anterior de igual duración."
								why="Evalúa si los clientes están consumiendo servicios de mayor valor (upselling) o añadiendo productos de cuidado en casa (cross-selling)."
								how="((AOV actual - AOV anterior) / AOV anterior) * 100."
								position="bottom"
								align="end"
							>
								<template #trigger="{ toggle, isOpen }">
									<button
										type="button"
										:class="[
											'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold cursor-help transition-all hover:scale-105',
											(reports?.kpis.aovDelta ?? 0) >= 0
												? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
												: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20',
											isOpen ? 'ring-2 ring-accent/30' : ''
										]"
										@click.stop="toggle"
									>
										<ArrowUpRight v-if="(reports?.kpis.aovDelta ?? 0) >= 0" class="size-3.5" />
										<ArrowDownRight v-else class="size-3.5" />
										<span>{{ (reports?.kpis.aovDelta ?? 0) > 0 ? '+' : '' }}{{ reports?.kpis.aovDelta }}%</span>
									</button>
								</template>
							</InfoTooltip>
						</div>

						<div class="mt-4">
							<div class="flex items-center gap-1.5">
								<p class="text-text-muted text-xs font-bold tracking-wider uppercase flex items-center gap-1">
									<span>Ticket Medio</span>
									<span class="text-accent underline decoration-dotted underline-offset-2 font-black cursor-help" title="Average Order Value">(AOV)</span>
								</p>
								<InfoTooltip
									title="Ticket Medio (AOV - Average Order Value)"
									what="AOV significa 'Average Order Value': es el gasto medio que realiza un cliente en cada visita o paso por caja."
									why="Es la palanca más eficaz para facturar más sin saturar la agenda ni elevar costes fijos."
									how="Facturación bruta total del periodo dividida entre el número de operaciones de venta cerradas."
									position="bottom"
									align="start"
								/>
							</div>
							<p class="text-text-primary text-2xl font-black tracking-tight tabular-nums lg:text-3xl">
								{{ formatCurrency(reports?.kpis.aov ?? 0) }}
							</p>
						</div>

						<div class="border-border-subtle text-text-muted mt-3 flex items-center justify-between border-t pt-3 text-xs">
							<span>Volumen: <b>{{ reports?.kpis.totalSales ?? 0 }} ventas</b></span>
							<span class="inline-flex items-center gap-1">
								<span>Desc/venta: <b>{{ reports?.kpis.discountRate ?? 0 }}%</b></span>
								<InfoTooltip
									title="Tasa de Descuento por Venta"
									what="Porcentaje medio de descuento que se absorbe sobre el importe bruto total."
									why="Vigila que las rebajas no superen el límite sostenible fijado para el salón (se recomienda mantenerlo < 5%)."
									how="(Total Descuentos / Facturación Bruta) * 100."
									position="top"
									align="end"
									size="xs"
								/>
							</span>
						</div>
					</div>

					<!-- KPI 3: Clientes & Marketing -->
					<div class="bg-bg-card border-border-default flex flex-col justify-between rounded-3xl border p-6 shadow-xs transition-shadow hover:shadow-md">
						<div class="flex items-start justify-between">
							<div class="bg-purple-500/10 text-purple-600 dark:text-purple-400 flex size-12 items-center justify-center rounded-2xl">
								<UserCheck class="size-6" />
							</div>
							<!-- Delta Badge with Tooltip -->
							<InfoTooltip
								v-if="reports?.kpis.newClientsDelta !== null"
								title="Variación de Nuevos Clientes (%)"
								what="Variación porcentual en captación de nuevos clientes respecto al periodo homólogo anterior."
								why="Mide la eficacia de las campañas de marketing, redes sociales y recomendaciones en la entrada de clientes por primera vez."
								how="((Nuevos clientes actuales - anteriores) / anteriores) * 100."
								position="bottom"
								align="end"
							>
								<template #trigger="{ toggle, isOpen }">
									<button
										type="button"
										:class="[
											'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold cursor-help transition-all hover:scale-105',
											(reports?.kpis.newClientsDelta ?? 0) >= 0
												? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
												: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20',
											isOpen ? 'ring-2 ring-accent/30' : ''
										]"
										@click.stop="toggle"
									>
										<ArrowUpRight v-if="(reports?.kpis.newClientsDelta ?? 0) >= 0" class="size-3.5" />
										<ArrowDownRight v-else class="size-3.5" />
										<span>{{ (reports?.kpis.newClientsDelta ?? 0) > 0 ? '+' : '' }}{{ reports?.kpis.newClientsDelta }}%</span>
									</button>
								</template>
							</InfoTooltip>
						</div>

						<div class="mt-4">
							<div class="flex items-center gap-1.5">
								<p class="text-text-muted text-xs font-bold tracking-wider uppercase">
									Nuevos Clientes Captados
								</p>
								<InfoTooltip
									title="Nuevos Clientes Captados"
									what="Número de clientes que han realizado su primera compra o recibido su primer tratamiento dentro del periodo."
									why="Evalúa el retorno y la tracción de las campañas de captación y marketing frente a la cartera de clientes recurrente."
									how="Conteo de compradores únicos cuya fecha de registro o primer ticket coincide con el intervalo seleccionado."
									position="bottom"
									align="start"
								/>
							</div>
							<p class="text-text-primary text-2xl font-black tracking-tight tabular-nums lg:text-3xl">
								{{ reports?.kpis.newClients ?? 0 }}
							</p>
						</div>

						<div class="border-border-subtle text-text-muted mt-3 flex items-center justify-between border-t pt-3 text-xs">
							<span>Compradores: <b>{{ reports?.kpis.uniqueBuyers ?? 0 }}</b></span>
							<span class="inline-flex items-center gap-1">
								<span>Retención: <b>{{ reports?.kpis.retentionRate ?? 0 }}%</b></span>
								<InfoTooltip
									title="Tasa de Retención de Clientes"
									what="Porcentaje de clientes que vuelven al centro a realizar una segunda o sucesiva compra tras su primera visita."
									why="Retener clientes es 5 veces más económico que captar nuevos. Es la base de la solidez y recomendación del salón."
									how="((Clientes con 2 o más operaciones / Total de compradores en el periodo) * 100). En estética, valores > 60% reflejan alta satisfacción."
									position="top"
									align="end"
									size="xs"
								/>
							</span>
						</div>
					</div>

					<!-- KPI 4: Operativa & Cabinas -->
					<div class="bg-bg-card border-border-default flex flex-col justify-between rounded-3xl border p-6 shadow-xs transition-shadow hover:shadow-md">
						<div class="flex items-start justify-between">
							<div class="bg-amber-500/10 text-amber-600 dark:text-amber-400 flex size-12 items-center justify-center rounded-2xl">
								<CalendarCheck class="size-6" />
							</div>
							<!-- Cancellation Badge with Tooltip -->
							<InfoTooltip
								title="Tasa de Cancelación de Citas"
								what="Porcentaje de citas programadas que fueron canceladas o en las que el cliente no acudió a cabina."
								why="Identifica huecos de ineficiencia en cabina para reforzar recordatorios automáticos por WhatsApp o políticas de depósito previo."
								how="(Citas canceladas / Total de citas agendadas) * 100."
								position="bottom"
								align="end"
							>
								<template #trigger="{ toggle, isOpen }">
									<button
										type="button"
										:class="[
											'flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 cursor-help transition-all hover:scale-105 hover:bg-amber-500/20',
											isOpen ? 'ring-2 ring-amber-500/40' : ''
										]"
										@click.stop="toggle"
									>
										<span>{{ reports?.kpis.cancellationRate ?? 0 }}% cancel.</span>
									</button>
								</template>
							</InfoTooltip>
						</div>

						<div class="mt-4">
							<div class="flex items-center gap-1.5">
								<p class="text-text-muted text-xs font-bold tracking-wider uppercase">
									Citas Agendadas
								</p>
								<InfoTooltip
									title="Citas Agendadas y Ocupación"
									what="Volumen global de citas agendadas en cabina y tasa de cancelación o inasistencia (no-shows)."
									why="Optimiza la ocupación de cabinas, ayuda a programar turnos del equipo y previene pérdidas de tiempo no facturable."
									how="Citas totales registradas en agenda comparadas con el porcentaje de citas canceladas o no presentadas."
									position="bottom"
									align="end"
								/>
							</div>
							<p class="text-text-primary text-2xl font-black tracking-tight tabular-nums lg:text-3xl">
								{{ reports?.kpis.totalBookings ?? 0 }}
							</p>
						</div>

						<div class="border-border-subtle text-text-muted mt-3 flex items-center justify-between border-t pt-3 text-xs">
							<span>Realizadas: <b>{{ reports?.kpis.completedBookings ?? 0 }}</b></span>
							<span>Canceladas: <b>{{ reports?.kpis.cancelledBookings ?? 0 }}</b></span>
						</div>
					</div>
				</section>

				<!-- TIER 2: Revenue Trend & Business Mix Charts -->
				<section class="grid grid-cols-1 gap-6 lg:grid-cols-12">
					<!-- Dual-axis Revenue & Tickets Evolution -->
					<div class="bg-bg-card border-border-default flex flex-col rounded-3xl border p-6 shadow-xs lg:col-span-8">
						<div class="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
							<div>
								<div class="flex items-center gap-2">
									<h2 class="text-text-primary text-base font-bold tracking-tight">
										Evolución de Ingresos y Volumen Transaccional
									</h2>
									<InfoTooltip
										title="Evolución de Ingresos y Tickets"
										what="Gráfico temporal de doble eje que correlaciona los ingresos en euros (€) con la cantidad de tickets emitidos."
										why="Identifica los días de la semana y momentos del mes de máxima facturación y detecta anomalías de afluencia."
										how="Eje izquierdo: importe acumulado (€). Eje derecho: número de tickets. Picos de barras con curvas bajas indican días de compras de menor cuantía."
										position="bottom"
										align="start"
									/>
								</div>
								<p class="text-text-muted text-xs">
									Facturación diaria/mensual combinada con la cantidad de tickets por fecha de servicio
								</p>
							</div>
						</div>

						<div class="h-85 w-full">
							<ClientChart v-if="revenueTrendOptions" :option="revenueTrendOptions" />
						</div>
					</div>

					<!-- Sales Mix (Services vs Retail vs Packages) -->
					<div class="bg-bg-card border-border-default flex flex-col rounded-3xl border p-6 shadow-xs lg:col-span-4">
						<div class="mb-2">
							<div class="flex items-center justify-between">
								<h2 class="text-text-primary text-base font-bold tracking-tight">
									Mix de Negocio
								</h2>
								<InfoTooltip
									title="Mix de Negocio"
									what="Distribución porcentual de los ingresos entre Servicios en Cabina, Cosmética Retail (para casa) y Bonos/Packs."
									why="Ayuda a equilibrar los ingresos por mano de obra (cabina) con ventas de producto retail de alto margen."
									how="Porcentaje que representa la facturación de cada tipología de producto o servicio sobre el total recaudado."
									position="bottom"
									align="end"
								/>
							</div>
							<p class="text-text-muted text-xs">
								Desglose por Servicios en Cabina, Cosmética Retail y Bonos
							</p>
						</div>

						<div class="relative h-60 w-full">
							<ClientChart v-if="salesMixOptions" :option="salesMixOptions" />
						</div>

						<!-- Mini Summary List -->
						<div class="border-border-subtle mt-2 flex flex-col gap-2 border-t pt-3">
							<div
								v-for="(mix, idx) in reports?.salesMix"
								:key="mix.type"
								class="flex items-center justify-between text-xs">
								<span class="text-text-secondary flex items-center gap-2">
									<span
										class="size-2.5 shrink-0 rounded-full"
										:style="{ backgroundColor: salesMixColors[idx] || 'var(--color-accent)' }" />
									<span>{{ mix.label }}</span>
								</span>
								<div class="flex items-center gap-2">
									<span class="text-text-muted font-mono">{{ mix.percentage }}%</span>
									<span class="text-text-primary font-bold tabular-nums">{{ formatCurrency(mix.revenue) }}</span>
								</div>
							</div>
						</div>
					</div>
				</section>

				<!-- TIER 3: Payment Methods & Appointments Status -->
				<section class="grid grid-cols-1 gap-6 lg:grid-cols-12">
					<!-- Payment Methods Breakdown -->
					<div class="bg-bg-card border-border-default flex flex-col rounded-3xl border p-6 shadow-xs lg:col-span-6">
						<div class="mb-4">
							<div class="flex items-center gap-2">
								<h2 class="text-text-primary text-base font-bold tracking-tight">
									Distribución de Métodos de Pago
								</h2>
								<InfoTooltip
									title="Métodos de Pago"
									what="Desglose del dinero cobrado según la vía financiera utilizada: Tarjeta, Efectivo, Bizum o Transferencia."
									why="Esencial para el arqueo de caja diario, la previsión de comisiones bancarias y el control de liquidez inmediata."
									how="Sumatorio de importes agrupados por la pasarela o método de liquidación seleccionado en el TPV."
									position="bottom"
									align="start"
								/>
							</div>
							<p class="text-text-muted text-xs">
								Volumen económico y porcentaje recaudado por cada vía
							</p>
						</div>

						<div class="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
							<div class="h-55 w-full">
								<ClientChart v-if="paymentMethodsOptions" :option="paymentMethodsOptions" />
							</div>

							<!-- Detailed Table -->
							<div class="flex flex-col gap-2.5">
								<div
									v-for="pm in reports?.paymentMethods"
									:key="pm.name"
									class="bg-bg-subtle border-border-subtle flex items-center justify-between rounded-xl border p-2.5 text-xs">
									<div class="flex items-center gap-2">
										<span
											class="size-2.5 shrink-0 rounded-full"
											:style="{ backgroundColor: paymentMethodColors[pm.name] || '#6b7280' }" />
										<div>
											<p class="text-text-primary font-bold">{{ pm.name }}</p>
											<p class="text-text-muted text-[11px]">{{ pm.count }} transacciones</p>
										</div>
									</div>
									<div class="text-right">
										<p class="text-text-primary font-bold tabular-nums">{{ formatCurrency(pm.amount) }}</p>
										<p class="text-text-muted text-[11px]">{{ pm.percentage }}% del total</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Bookings Status Distribution -->
					<div class="bg-bg-card border-border-default flex flex-col rounded-3xl border p-6 shadow-xs lg:col-span-6">
						<div class="mb-4">
							<div class="flex items-center justify-between">
								<h2 class="text-text-primary text-base font-bold tracking-tight">
									Control de Agenda & No-Shows
								</h2>
								<InfoTooltip
									title="Control de Agenda y No-Shows"
									what="Clasificación porcentual del estado final de las reservas de cabina (Completadas, Canceladas, Ausencias)."
									why="Permite afinar políticas de reserva, recordatorios automáticos por WhatsApp y posibles fianzas de cita previa."
									how="Proporción matemática de cada estado de reserva sobre el total de citas gestionadas en el periodo."
									position="bottom"
									align="end"
								/>
							</div>
							<p class="text-text-muted text-xs">
								Eficiencia de citas: cumplimiento vs ausencias y cancelaciones
							</p>
						</div>

						<div class="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
							<div class="h-55 w-full">
								<ClientChart v-if="bookingStatusOptions" :option="bookingStatusOptions" />
							</div>

							<div class="flex flex-col gap-2.5">
								<div
									v-for="bs in reports?.bookingStatusDistribution"
									:key="bs.status"
									class="bg-bg-subtle border-border-subtle flex items-center justify-between rounded-xl border p-2.5 text-xs">
									<div class="flex items-center gap-2">
										<span
											class="size-2.5 shrink-0 rounded-full"
											:style="{ backgroundColor: bookingStatusColors[bs.status] || '#6b7280' }" />
										<p class="text-text-primary font-bold">{{ bs.label }}</p>
									</div>
									<div class="text-right">
										<p class="text-text-primary font-bold tabular-nums">{{ bs.count }} citas</p>
										<p class="text-text-muted text-[11px]">
											{{ (reports?.kpis.totalBookings ?? 0) > 0 ? Math.round((bs.count / (reports?.kpis.totalBookings ?? 1)) * 100) : 0 }}%
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				<!-- TIER 4: Commercial Intelligence & VIP Clients -->
				<section class="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<!-- Top Treatments -->
					<div class="bg-bg-card border-border-default flex flex-col rounded-3xl border p-6 shadow-xs">
						<div class="mb-4 flex items-center justify-between">
							<div>
								<div class="flex items-center gap-1.5">
									<h2 class="text-text-primary text-base font-bold tracking-tight">
										Top Tratamientos en Cabina
									</h2>
									<InfoTooltip
										title="Tratamientos Estrella"
										what="Ranking de los tratamientos estéticos con mayor facturación bruta y número de sesiones ejecutadas."
										why="Permite priorizar la agenda, optimizar el uso de cabinas especializadas y planificar la compra de consumibles técnicos."
										how="Ordenados de mayor a menor según la facturación total acumulada de cada servicio en el periodo."
										position="bottom"
										align="start"
									/>
								</div>
								<p class="text-text-muted text-xs">Mayor volumen de facturación</p>
							</div>
							<Sparkles class="text-accent size-5" />
						</div>

						<div v-if="reports?.topServices.length" class="flex flex-col gap-3">
							<div
								v-for="(s, idx) in reports.topServices"
								:key="s.name"
								class="border-border-subtle border-b pb-2.5 last:border-0 last:pb-0">
								<div class="flex items-start justify-between gap-2 text-xs">
									<div class="flex items-center gap-2">
										<span class="text-text-muted w-4 font-mono font-bold">{{ idx + 1 }}.</span>
										<span class="text-text-primary font-bold line-clamp-1">{{ s.name }}</span>
									</div>
									<span class="text-text-primary shrink-0 font-bold tabular-nums">
										{{ formatCurrency(s.revenue) }}
									</span>
								</div>
								<div class="text-text-muted mt-1 flex items-center justify-between pl-6 text-[11px]">
									<span>{{ s.quantity }} sesiones realizadas</span>
									<span>Promedio: {{ formatCurrency(s.revenue / (s.quantity || 1)) }}</span>
								</div>
							</div>
						</div>
						<div v-else class="text-text-muted py-8 text-center text-xs">
							No hay servicios registrados en este periodo.
						</div>
					</div>

					<!-- Top Retail Products -->
					<div class="bg-bg-card border-border-default flex flex-col rounded-3xl border p-6 shadow-xs">
						<div class="mb-4 flex items-center justify-between">
							<div>
								<div class="flex items-center gap-1.5">
									<h2 class="text-text-primary text-base font-bold tracking-tight">
										Top Cosmética Retail
									</h2>
									<InfoTooltip
										title="Cosmética de Apoyo Domiciliario"
										what="Ranking de productos de cosmética y cuidado facial/corporal vendidos en mostrador."
										why="Indica qué marcas y productos tienen mayor tracción comercial para optimizar pedidos a laboratorios y rotación de stock."
										how="Ordenados por volumen total de facturación (€) y unidades físicas despachadas."
										position="bottom"
										align="center"
									/>
								</div>
								<p class="text-text-muted text-xs">Venta cruzada para el hogar</p>
							</div>
							<ShoppingBag class="size-5 text-amber-500" />
						</div>

						<div v-if="reports?.topProducts.length" class="flex flex-col gap-3">
							<div
								v-for="(p, idx) in reports.topProducts"
								:key="p.name"
								class="border-border-subtle border-b pb-2.5 last:border-0 last:pb-0">
								<div class="flex items-start justify-between gap-2 text-xs">
									<div class="flex items-center gap-2">
										<span class="text-text-muted w-4 font-mono font-bold">{{ idx + 1 }}.</span>
										<span class="text-text-primary font-bold line-clamp-1">{{ p.name }}</span>
									</div>
									<span class="text-text-primary shrink-0 font-bold tabular-nums">
										{{ formatCurrency(p.revenue) }}
									</span>
								</div>
								<div class="text-text-muted mt-1 flex items-center justify-between pl-6 text-[11px]">
									<span>{{ p.quantity }} unidades vendidas</span>
									<span>PVP medio: {{ formatCurrency(p.revenue / (p.quantity || 1)) }}</span>
								</div>
							</div>
						</div>
						<div v-else class="text-text-muted py-8 text-center text-xs">
							No hay productos retail vendidos en este periodo.
						</div>
					</div>

					<!-- VIP Clients Ranking -->
					<div class="bg-bg-card border-border-default flex flex-col rounded-3xl border p-6 shadow-xs">
						<div class="mb-4 flex items-center justify-between">
							<div>
								<div class="flex items-center gap-1.5">
									<h2 class="text-text-primary text-base font-bold tracking-tight">
										Clientes con Mayor Gasto
									</h2>
									<InfoTooltip
										title="Clientes VIP (Alto Valor LTV)"
										what="Listado de los clientes con mayor aportación económica acumulada en el intervalo de tiempo seleccionado."
										why="Clave para aplicar programas de fidelización, invitaciones exclusivas y protocolos de retención personalizada."
										how="Clasificados por la suma total de sus compras y citas en el periodo, con enlace directo a su expediente."
										position="bottom"
										align="end"
									/>
								</div>
								<p class="text-text-muted text-xs">Fidelización y alto valor (LTV)</p>
							</div>
							<Award class="size-5 text-purple-500" />
						</div>

						<div v-if="reports?.topClients.length" class="flex flex-col gap-3">
							<NuxtLink
								v-for="(c, idx) in reports.topClients"
								:key="c.id"
								:to="`/clientes/${c.id}`"
								class="hover:bg-bg-subtle -mx-2 flex items-center justify-between rounded-xl p-2 transition-colors">
								<div class="flex items-center gap-2.5 min-w-0">
									<span class="text-text-muted w-3 font-mono text-xs font-bold">{{ idx + 1 }}</span>
									<div class="bg-accent/10 text-accent flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold">
										{{ c.name.charAt(0).toUpperCase() }}
									</div>
									<div class="min-w-0">
										<p class="text-text-primary truncate text-xs font-bold">{{ c.name }}</p>
										<p class="text-text-muted text-[11px]">{{ c.ordersCount }} compras/visitas</p>
									</div>
								</div>
								<div class="text-right shrink-0">
									<p class="text-text-primary font-bold tabular-nums text-xs">
										{{ formatCurrency(c.totalSpend) }}
									</p>
									<span class="text-accent flex items-center justify-end text-[10px] font-bold">
										Ver ficha <ChevronRight class="size-3" />
									</span>
								</div>
							</NuxtLink>
						</div>
						<div v-else class="text-text-muted py-8 text-center text-xs">
							No hay compras de clientes en este periodo.
						</div>
					</div>
				</section>

				<!-- TIER 5: Commercial Efficiency, Velocity & Financial Health -->
				<section class="grid grid-cols-1 gap-6 lg:grid-cols-12">
					<!-- Commercial Velocity & Cross-Selling Cockpit -->
					<div class="bg-bg-card border-border-default flex flex-col rounded-3xl border p-6 shadow-xs lg:col-span-8">
						<div class="mb-5 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
							<div>
								<div class="flex items-center gap-2">
									<h2 class="text-text-primary text-base font-bold tracking-tight">
										Eficiencia Comercial & Venta Cruzada
									</h2>
									<span class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
										Attach Rate & UPT
									</span>
								</div>
								<p class="text-text-muted text-xs">
									Profundidad de cesta, sinergia entre tratamientos en cabina y cosmética para casa, y velocidad financiera
								</p>
							</div>
							<Sparkles class="text-accent size-5 shrink-0" />
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<!-- Metric 1: Venta Cruzada (Attach Rate) -->
							<div class="bg-bg-subtle border-border-subtle flex flex-col justify-between rounded-2xl border p-4.5">
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-1.5">
										<span class="text-text-muted text-xs font-bold tracking-wider uppercase">Venta Cruzada (Attach Rate)</span>
										<InfoTooltip
											title="Venta Cruzada (Attach Rate)"
											what="Porcentaje de transacciones que combinan al menos un servicio en cabina y al menos un producto cosmético de retail."
											why="Mide la eficacia del equipo técnico asesorando rutinas de cuidado domiciliario tras finalizar el tratamiento."
											how="(Tickets con Servicio + Producto Retail / Total de tickets con servicio) × 100."
											position="bottom"
											align="start"
										/>
									</div>
									<span class="rounded-lg bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
										{{ reports?.commercialMetrics?.crossSellingRate ?? 0 }}%
									</span>
								</div>
								<div class="my-3">
									<div class="flex items-baseline gap-2">
										<p class="text-text-primary text-2xl font-black tabular-nums">
											{{ reports?.commercialMetrics?.cartsWithBoth ?? 0 }}
										</p>
										<span class="text-text-muted text-xs">ventas mixtas</span>
									</div>
									<div class="bg-border-subtle mt-2 h-2 w-full overflow-hidden rounded-full">
										<div
											class="bg-accent h-full rounded-full transition-all duration-500"
											:style="{ width: `${Math.min(100, (reports?.commercialMetrics?.crossSellingRate ?? 0) * 4)}%` }" />
									</div>
								</div>
								<p class="text-text-muted text-[11px]">
									Tickets que combinaron tratamientos en cabina con cosmética de retail para casa.
								</p>
							</div>

							<!-- Metric 2: Unidades por Ticket (UPT) -->
							<div class="bg-bg-subtle border-border-subtle flex flex-col justify-between rounded-2xl border p-4.5">
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-1.5">
										<span class="text-text-muted text-xs font-bold tracking-wider uppercase">Profundidad de Cesta (UPT)</span>
										<InfoTooltip
											title="Unidades por Transacción (UPT)"
											what="Media de artículos o líneas de venta individuales despachadas por cada ticket emitido."
											why="Evalúa la habilidad comercial para aumentar el valor de la visita ofreciendo productos complementarios o bonos."
											how="Total de unidades físicas y sesiones vendidas dividido entre el número total de tickets generados."
											position="bottom"
											align="end"
										/>
									</div>
									<span class="rounded-lg bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
										{{ reports?.commercialMetrics?.unitsPerTransaction ?? 0 }} arts/ticket
									</span>
								</div>
								<div class="my-3">
									<p class="text-text-primary text-2xl font-black tabular-nums">
										{{ reports?.commercialMetrics?.unitsPerTransaction ?? 0 }}
									</p>
									<p class="text-text-muted mt-1 text-xs">Artículos promedio por transacción</p>
								</div>
								<p class="text-text-muted text-[11px]">
									Ratio de unidades totales despachadas por cada venta en el TPV.
								</p>
							</div>

							<!-- Metric 3: Ticket Medio Segmentado (Cabina vs Retail) -->
							<div class="bg-bg-subtle border-border-subtle flex flex-col justify-between rounded-2xl border p-4.5">
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-1.5">
										<span class="text-text-muted text-xs font-bold tracking-wider uppercase">Ticket Medio por Línea</span>
										<InfoTooltip
											title="Ticket Medio Segmentado"
											what="Gasto promedio segregado entre tratamientos aplicados en camilla y productos de cosmética adquiridos en recepción."
											why="Permite comparar la rentabilidad por minuto de cabina frente a la venta pasiva de cosmética de alta gama."
											how="Facturación total de cada categoría dividida por la cantidad de transacciones donde figura dicha categoría."
											position="bottom"
											align="start"
										/>
									</div>
									<ShoppingBag class="size-4 text-amber-500" />
								</div>
								<div class="my-3 flex flex-col gap-2">
									<div class="flex items-center justify-between text-xs">
										<span class="text-text-secondary">Servicios en Cabina:</span>
										<b class="text-text-primary font-mono font-bold tabular-nums">
											{{ formatCurrency(reports?.commercialMetrics?.serviceAov ?? 0) }}
										</b>
									</div>
									<div class="flex items-center justify-between text-xs">
										<span class="text-text-secondary">Cosmética Retail:</span>
										<b class="text-text-primary font-mono font-bold tabular-nums">
											{{ formatCurrency(reports?.commercialMetrics?.productAov ?? 0) }}
										</b>
									</div>
								</div>
								<p class="text-text-muted text-[11px]">
									AOV segregado para evaluar rentabilidad de camilla vs mostrador.
								</p>
							</div>

							<!-- Metric 4: Velocidad Diaria & Proyección Mensual -->
							<div class="bg-bg-subtle border-border-subtle flex flex-col justify-between rounded-2xl border p-4.5">
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-1.5">
										<span class="text-text-muted text-xs font-bold tracking-wider uppercase">Velocidad Financiera</span>
										<InfoTooltip
											title="Velocidad y Proyección (Run Rate)"
											what="Ritmo medio de facturación diaria alcanzado y su extrapolación matemática a mes completo."
											why="Anticipa si el centro alcanzará sus objetivos de facturación y el punto de equilibrio financiero con antelación."
											how="Ritmo diario = facturación periodo / días transcurridos. Proyección = ritmo diario × días totales del mes."
											position="bottom"
											align="end"
										/>
									</div>
									<TrendingUp class="size-4 text-emerald-500" />
								</div>
								<div class="my-3 flex flex-col gap-1.5">
									<div class="flex items-center justify-between text-xs">
										<span class="text-text-secondary">Ritmo Diario:</span>
										<b class="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
											{{ formatCurrency(reports?.commercialMetrics?.dailyRevenueRate ?? 0) }}/día
										</b>
									</div>
									<div class="flex items-center justify-between text-xs">
										<span class="text-text-secondary">Proyección (Run Rate):</span>
										<b class="text-text-primary font-mono font-black tabular-nums">
											{{ formatCurrency(reports?.commercialMetrics?.projectedMonthlyRevenue ?? 0) }}
										</b>
									</div>
								</div>
								<p class="text-text-muted text-[11px]">
									Facturación estimada proyectada a mes completo basada en la velocidad actual.
								</p>
							</div>
						</div>
					</div>

					<!-- Financial Debts & Risk Card -->
					<div class="bg-bg-card border-border-default flex flex-col justify-between rounded-3xl border p-6 shadow-xs lg:col-span-4">
						<div>
							<div class="mb-4 flex items-center justify-between">
								<div>
									<div class="flex items-center gap-1.5">
										<h2 class="text-text-primary text-base font-bold tracking-tight">
											Salud de Cartera & Deuda
										</h2>
										<InfoTooltip
											title="Salud de Cartera y Deuda"
											what="Volumen de cobros pendientes generado por ventas aplazadas, tratamientos en bono o financiación directa."
											why="Previene problemas de flujo de caja y reduce el riesgo de morosidad mediante seguimiento activo de vencimientos."
											how="Sumatorio de los importes pendientes de cobro (saldo deudor) de todas las operaciones registradas en el periodo."
											position="bottom"
											align="end"
										/>
									</div>
									<p class="text-text-muted text-xs">Saldos pendientes de cobro</p>
								</div>
								<ShieldAlert class="size-5 text-rose-500" />
							</div>

							<div class="bg-rose-500/10 border-rose-500/20 rounded-2xl border p-4">
								<p class="text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
									Deuda Generada en Periodo
								</p>
								<p class="text-rose-600 dark:text-rose-400 mt-1 text-2xl font-black tabular-nums">
									{{ formatCurrency(reports?.kpis.pendingDebts ?? 0) }}
								</p>
								<p class="text-text-muted mt-2 text-[11px]">
									Importe pendiente de cobro generado a través de ventas fraccionadas o aplazadas en este rango de fechas.
								</p>
							</div>
						</div>

						<div class="border-border-subtle mt-4 border-t pt-4">
							<NuxtLink
								to="/finanzas/deudas"
								class="btn bg-bg-subtle hover:bg-bg-muted border-border-default text-text-primary flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-colors">
								<span>Gestionar Cartera de Deudas</span>
								<ChevronRight class="size-4" />
							</NuxtLink>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
</template>

<style scoped>
	@media print {
		:global(html),
		:global(body),
		:global(#__nuxt),
		:global(.drawer),
		:global(.drawer-content),
		:global(main) {
			height: auto !important;
			min-height: auto !important;
			max-height: none !important;
			overflow: visible !important;
			background-color: white !important;
			color: #111827 !important;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}

		:global(body *) {
			visibility: visible !important;
		}

		:global(.drawer-side),
		:global(nav),
		:global(header button),
		.print\:hidden {
			display: none !important;
		}

		#report-container {
			visibility: visible !important;
			box-shadow: none !important;
			margin: 0 !important;
			padding: 0 !important;
			width: 100% !important;
		}

		#report-container * {
			visibility: visible !important;
		}

		/* Avoid page breaks inside cards */
		.grid > div {
			break-inside: avoid !important;
			page-break-inside: avoid !important;
			box-shadow: none !important;
			border: 1px solid #e5e7eb !important;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}
	}
</style>
