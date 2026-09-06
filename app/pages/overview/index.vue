<script lang="ts" setup>
import type { IProduct } from '~~/shared/types/catalog'
import type { Sale, Booking, ClientDTO, Debt } from '~~/shared/types/domain'
import { useQuery } from '@tanstack/vue-query'
import ClientChart from '~/components/ClientChart.client.vue'
import { useChartTheme } from '~/composables/useChartTheme'
import {
	CircleDollarSign,
	CalendarCheck,
	Users,
	AlertCircle,
	ShoppingBag,
	ArrowRight,
	PackageOpen,
	Sparkles,
	CheckCircle2,
	AlertTriangle,
	Phone,
	CalendarPlus,
	UserPlus,
	Receipt,
	Layers,
} from 'lucide-vue-next'

definePageMeta({ layout: 'default' })
useHead({ title: 'Resumen Ejecutivo | Beils Dashboard' })

const authStore = useAuthStore()

// Live-refresh KPIs when sales/debts are collected anywhere
const { listenSalesChanged } = useRealtimeSales()
listenSalesChanged()

// Active tab for operational feed
const activeTab = ref<'bookings' | 'sales'>('bookings')

// Queries
const { data: carts, isPending: loadingCarts } = useQuery<Sale[]>({
	queryKey: ['carts-overview'],
	queryFn: () => $fetch('/api/sales/carts'),
})

const { data: bookings, isPending: loadingBookings } = useQuery<Booking[]>({
	queryKey: ['bookings-overview'],
	queryFn: () => $fetch('/api/agenda/bookings'),
})

const { data: clients, isPending: loadingClients } = useQuery<ClientDTO[]>({
	queryKey: ['clients-overview'],
	queryFn: () => $fetch('/api/users?role=CLIENT'),
})

const { data: debts, isPending: loadingDebts } = useQuery<Debt[]>({
	queryKey: ['debts-overview'],
	queryFn: () => $fetch('/api/sales/debts'),
})

const { data: products, isPending: loadingProducts } = useQuery<IProduct[]>({
	queryKey: ['products-overview'],
	queryFn: () => $fetch('/api/catalog/products'),
})

const { data: reports, isPending: loadingReports } = useQuery<{
	kpis: { totalRevenue: number; totalSales: number; totalClients: number; totalProducts: number }
	revenueTrend: { month?: string; label?: string; key?: string; revenue: number }[]
	paymentMethods: { name: string; value: number }[]
	topItems: { name: string; quantity: number }[]
}>({
	queryKey: ['reportsOverview', '6m'],
	queryFn: () => $fetch('/api/reports?range=6m'),
})

const isPending = computed(
	() =>
		loadingCarts.value ||
		loadingBookings.value ||
		loadingClients.value ||
		loadingDebts.value ||
		loadingProducts.value ||
		loadingReports.value,
)

// Date helpers
const today = new Date()
const dateOptions: Intl.DateTimeFormatOptions = {
	weekday: 'long',
	year: 'numeric',
	month: 'long',
	day: 'numeric',
}
const formattedDate = new Intl.DateTimeFormat('es-ES', dateOptions).format(today)

const formatTime = (dateString: string) => {
	return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(
		new Date(dateString),
	)
}

const timeAgo = (dateString: string) => {
	const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
	const date = new Date(dateString)
	const daysDifference = Math.round((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

	if (daysDifference === 0) {
		const hoursDifference = Math.round((date.getTime() - new Date().getTime()) / (1000 * 60 * 60))
		if (hoursDifference === 0) {
			const minutesDifference = Math.round((date.getTime() - new Date().getTime()) / (1000 * 60))
			return rtf.format(minutesDifference, 'minute')
		}
		return rtf.format(hoursDifference, 'hour')
	}
	return rtf.format(daysDifference, 'day')
}

const isToday = (dateString: string | null | undefined) => {
	if (!dateString) return false
	const d = new Date(dateString)
	return (
		d.getDate() === today.getDate() &&
		d.getMonth() === today.getMonth() &&
		d.getFullYear() === today.getFullYear()
	)
}

const isThisMonth = (dateString: string | null | undefined) => {
	if (!dateString) return false
	const d = new Date(dateString)
	return (
		d.getMonth() === today.getMonth() &&
		d.getFullYear() === today.getFullYear()
	)
}

// 1. Commercial & Sales KPIs
const completedSalesToday = computed(() => {
	if (!carts.value) return []
	return carts.value.filter((c: Sale) => c.status === 'completed' && isToday(c.created_at))
})

const todayRevenue = computed(() => {
	return completedSalesToday.value.reduce((sum: number, c: Sale) => sum + Number(c.total || 0), 0)
})

const todaySalesCount = computed(() => completedSalesToday.value.length)

const todayAov = computed(() => {
	if (todaySalesCount.value === 0) return 0
	return todayRevenue.value / todaySalesCount.value
})

const monthRevenue = computed(() => {
	if (!carts.value) return 0
	return carts.value
		.filter((c: Sale) => c.status === 'completed' && isThisMonth(c.created_at))
		.reduce((sum: number, c: Sale) => sum + Number(c.total || 0), 0)
})

const totalPendingDebts = computed(() => {
	if (!debts.value) return 0
	return debts.value
		.filter((d: Debt) => d.status === 'pending' || d.status === 'partial')
		.reduce((sum: number, d: Debt) => sum + Number(d.remaining || 0), 0)
})

const pendingDebtsCount = computed(() => {
	if (!debts.value) return 0
	return debts.value.filter((d: Debt) => d.status === 'pending' || d.status === 'partial').length
})

// 2. Capacity & Agenda KPIs
const todayBookings = computed(() => {
	if (!bookings.value) return []
	return bookings.value.filter((b: Booking) => isToday(b.booking_date))
})

const todayBookingsCount = computed(() => todayBookings.value.length)

const todayConfirmedBookingsCount = computed(() => {
	return todayBookings.value.filter((b: Booking) => b.status === 'confirmed').length
})

const todayPendingBookingsCount = computed(() => {
	return todayBookings.value.filter((b: Booking) => b.status === 'pending').length
})

const confirmationRate = computed(() => {
	if (todayBookingsCount.value === 0) return 100
	return Math.round((todayConfirmedBookingsCount.value / todayBookingsCount.value) * 100)
})

const todayCabinHours = computed(() => {
	const totalMinutes = todayBookings.value
		.filter((b: Booking) => b.status !== 'cancelled')
		.reduce((sum: number, b: Booking) => sum + (b.duration || 45), 0)
	return (totalMinutes / 60).toFixed(1)
})

const getBookingDateTime = (b: Booking): Date => {
	const d = new Date(b.booking_date)
	if (b.start_time && b.start_time.includes(':')) {
		const [hours, minutes] = b.start_time.split(':').map(Number)
		d.setHours(hours ?? 0, minutes ?? 0, 0, 0)
	}
	return d
}

const upcomingBookings = computed(() => {
	if (!bookings.value) return []
	const startOfToday = new Date(today)
	startOfToday.setHours(0, 0, 0, 0)
	return bookings.value
		.filter((b: Booking) => {
			const bDate = new Date(b.booking_date)
			return bDate >= startOfToday && b.status !== 'cancelled'
		})
		.sort((a: Booking, b: Booking) => getBookingDateTime(a).getTime() - getBookingDateTime(b).getTime())
		.slice(0, 6)
})

const agendaStore = useAgendaStore()

const goToBooking = (booking: Booking) => {
	const d = new Date(booking.booking_date)
	agendaStore.setDate(d)
	agendaStore.setViewMode('day')
	const dateStr = d.toISOString().split('T')[0]
	navigateTo({
		path: '/agenda',
		query: {
			date: dateStr,
		},
	})
}

const recentSales = computed(() => {
	if (!carts.value) return []
	return carts.value
		.filter((c: Sale) => c.status === 'completed')
		.sort((a: Sale, b: Sale) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
		.slice(0, 6)
})

// 3. Marketing & Customer Retention KPIs
const totalClientsCount = computed(() => clients.value?.length || 0)

const newClientsCount = computed(() => {
	if (!clients.value) return 0
	const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
	return clients.value.filter((c: ClientDTO) => new Date(c.created_at ?? '') >= sevenDaysAgo).length
})

const retentionRate = computed(() => {
	if (!clients.value || clients.value.length === 0 || !carts.value) return 0
	const purchasesPerUser = new Map<string, number>()
	carts.value.forEach((c: Sale) => {
		if (c.user_id) {
			purchasesPerUser.set(c.user_id, (purchasesPerUser.get(c.user_id) || 0) + 1)
		}
	})
	const repeatCustomers = Array.from(purchasesPerUser.values()).filter((count) => count > 1).length
	const buyersCount = purchasesPerUser.size
	if (buyersCount === 0) return 0
	return Math.round((repeatCustomers / buyersCount) * 100)
})

const topPerformers = computed(() => {
	if (reports.value?.topItems && reports.value.topItems.length > 0) {
		const max = reports.value.topItems[0]?.quantity || 1
		return reports.value.topItems.slice(0, 4).map((item) => ({
			name: item.name,
			quantity: item.quantity,
			percentage: Math.min(100, Math.round((item.quantity / max) * 100)),
		}))
	}
	return []
})

const salesMix = computed(() => {
	if (!carts.value || carts.value.length === 0) return { services: 70, retail: 30 }
	let serviceCount = 0
	let retailCount = 0
	carts.value.forEach((c: Sale) => {
		c.items?.forEach((item) => {
			if (item.item_type === 'product') {
				retailCount += item.quantity || 1
			} else {
				serviceCount += item.quantity || 1
			}
		})
	})
	const total = serviceCount + retailCount
	if (total === 0) return { services: 70, retail: 30 }
	return {
		services: Math.round((serviceCount / total) * 100),
		retail: Math.round((retailCount / total) * 100),
	}
})

// 4. Inventory Health
const lowStockAlerts = computed(() => {
	if (!products.value) return []
	return products.value.filter((p: IProduct) => p.stock <= (p.min_stock || 0))
})

// Avatar error handling
const avatarErrors = reactive(new Set<string>())
const handleAvatarError = (id: string) => {
	avatarErrors.add(id)
}

// Chart options
const chart = useChartTheme()

const revenueTrendOptions = computed(() => {
	if (!reports.value?.revenueTrend || reports.value.revenueTrend.length === 0) return null
	const ct = chart.value
	const data = reports.value.revenueTrend
	return {
		tooltip: {
			trigger: 'axis',
			backgroundColor: ct.tooltipBg,
			borderColor: ct.tooltipBorder,
			textStyle: { color: ct.tooltipText },
			borderRadius: 8,
			formatter: (params: unknown) => {
				const list = Array.isArray(params) ? params : [params]
				const item = list[0] as { name?: string; value: number }
				return `<b>${item?.name || ''}</b>: ${formatCurrency(item?.value || 0)}`
			},
		},
		grid: { top: 20, right: 15, bottom: 20, left: 55 },
		xAxis: {
			type: 'category',
			data: data.map((d) => d.month || d.label || d.key || ''),
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: { color: ct.axis, fontSize: 11 },
		},
		yAxis: {
			type: 'value',
			splitLine: { lineStyle: { color: ct.grid, type: 'dashed' } },
			axisLabel: {
				color: ct.axis,
				fontSize: 10,
				formatter: (val: number) => `€${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`,
			},
		},
		series: [
			{
				name: 'Ingresos',
				data: data.map((d) => d.revenue),
				type: 'line',
				smooth: true,
				symbolSize: 6,
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
		],
	}
})
</script>

<template>
	<div class="bg-bg-app text-text-secondary selection:bg-primary/20 min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-350 space-y-8">
			<!-- Header & Executive Command Bar -->
			<header class="flex flex-col justify-between gap-6 md:flex-row md:items-center">
				<div>
					<div class="flex items-center gap-3">
						<h1 class="text-text-primary text-2xl font-bold tracking-tight md:text-3xl">
							Panel Ejecutivo ·
							<span class="text-primary">{{ authStore.user?.name || 'Administrador' }}</span>
						</h1>
						<span
							class="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
							<span class="size-1.5 rounded-full bg-success animate-pulse" />
							Operativa en vivo
						</span>
					</div>
					<p class="text-text-muted mt-1 text-sm font-medium capitalize">
						Control comercial y rendimiento para hoy, {{ formattedDate }}.
					</p>
				</div>

				<!-- Quick Commercial Actions -->
				<div class="flex flex-wrap items-center gap-2.5">
					<NuxtLink
						to="/tpv"
						class="btn btn-sm h-10 rounded-xl bg-primary px-4 text-white border-none font-bold shadow-sm transition-all hover:brightness-110 active:scale-95 flex items-center gap-2">
						<ShoppingBag class="size-4" />
						<span>Nueva Venta (TPV)</span>
					</NuxtLink>
					<NuxtLink
						to="/agenda"
						class="btn btn-sm h-10 rounded-xl bg-bg-card border border-border-subtle px-3 text-text-primary hover:bg-bg-muted font-semibold shadow-xs transition-all active:scale-95 flex items-center gap-1.5">
						<CalendarPlus class="size-4 text-primary" />
						<span>Agendar Cita</span>
					</NuxtLink>
					<NuxtLink
						to="/clientes"
						class="btn btn-sm h-10 rounded-xl bg-bg-card border border-border-subtle px-3 text-text-primary hover:bg-bg-muted font-semibold shadow-xs transition-all active:scale-95 flex items-center gap-1.5">
						<UserPlus class="size-4 text-info" />
						<span>Nuevo Cliente</span>
					</NuxtLink>
					<NuxtLink
						to="/finanzas/deudas"
						class="btn btn-sm h-10 rounded-xl bg-bg-card border border-border-subtle px-3 text-text-primary hover:bg-bg-muted font-semibold shadow-xs transition-all active:scale-95 flex items-center gap-1.5">
						<Receipt class="size-4 text-warning-content" />
						<span>Deudas</span>
					</NuxtLink>
				</div>
			</header>

			<!-- Loader Skeleton -->
			<div v-if="isPending" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div v-for="i in 4" :key="i" class="bg-bg-card h-36 animate-pulse rounded-3xl shadow-sm border border-border-subtle" />
			</div>

			<template v-else>
				<!-- Row 1: Executive KPI Bento Grid -->
				<section class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					<!-- KPI 1: Ventas y Caja Hoy -->
					<div
						class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border-subtle transition-all duration-200 hover:shadow-md flex flex-col justify-between">
						<div>
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold uppercase tracking-wider text-text-muted">Caja & Ventas Hoy</span>
								<div class="flex size-9 items-center justify-center rounded-xl bg-success/10 text-success">
									<CircleDollarSign class="size-5" />
								</div>
							</div>
							<div class="mt-3">
								<p class="text-text-primary text-3xl font-black tracking-tight tabular-nums">
									{{ formatCurrency(todayRevenue) }}
								</p>
								<div class="mt-1 flex items-center gap-2 text-xs font-semibold text-text-muted">
									<span class="text-text-primary">{{ todaySalesCount }} transacciones</span>
									<span>•</span>
									<span class="text-success font-bold">Mes: {{ formatCurrency(monthRevenue) }}</span>
								</div>
							</div>
						</div>
						<div class="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
							<span class="text-text-muted">Ticket Medio (AOV):</span>
							<span class="font-bold text-text-primary tabular-nums">{{ formatCurrency(todayAov) }}</span>
						</div>
					</div>

					<!-- KPI 2: Agenda & Capacidad -->
					<div
						class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border-subtle transition-all duration-200 hover:shadow-md flex flex-col justify-between">
						<div>
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold uppercase tracking-wider text-text-muted">Agenda & Cabinas</span>
								<div class="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<CalendarCheck class="size-5" />
								</div>
							</div>
							<div class="mt-3">
								<div class="flex items-baseline gap-2">
									<p class="text-text-primary text-3xl font-black tracking-tight tabular-nums">
										{{ todayBookingsCount }}
									</p>
									<span class="text-xs font-semibold text-text-muted">citas para hoy</span>
								</div>
								<div class="mt-1 flex items-center gap-2 text-xs font-medium">
									<span
										class="inline-flex items-center rounded-md px-1.5 py-0.5 font-bold"
										:class="confirmationRate >= 80 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning-content'">
										{{ confirmationRate }}% confirmadas
									</span>
									<span v-if="todayPendingBookingsCount > 0" class="text-warning-content font-semibold">
										({{ todayPendingBookingsCount }} pendientes)
									</span>
								</div>
							</div>
						</div>
						<div class="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
							<span class="text-text-muted">Tiempo productivo:</span>
							<span class="font-bold text-text-primary tabular-nums">{{ todayCabinHours }} hrs de tratamiento</span>
						</div>
					</div>

					<!-- KPI 3: Marketing & Fidelización -->
					<div
						class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border-subtle transition-all duration-200 hover:shadow-md flex flex-col justify-between">
						<div>
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold uppercase tracking-wider text-text-muted">Marketing & Clientes</span>
								<div class="flex size-9 items-center justify-center rounded-xl bg-info/10 text-info">
									<Users class="size-5" />
								</div>
							</div>
							<div class="mt-3">
								<div class="flex items-baseline gap-2">
									<p class="text-text-primary text-3xl font-black tracking-tight tabular-nums">
										+{{ newClientsCount }}
									</p>
									<span class="text-xs font-semibold text-text-muted">nuevos en 7 días</span>
								</div>
								<p class="mt-1 text-xs text-text-muted">
									Cartera activa de <strong class="text-text-primary">{{ totalClientsCount }}</strong> clientes
								</p>
							</div>
						</div>
						<div class="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
							<span class="text-text-muted">Tasa de Recurrencia:</span>
							<span class="font-bold text-info tabular-nums">{{ retentionRate }}% repiten</span>
						</div>
					</div>

					<!-- KPI 4: Cashflow & Deudas Vivas -->
					<div
						class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border-subtle transition-all duration-200 hover:shadow-md flex flex-col justify-between">
						<div>
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold uppercase tracking-wider text-text-muted">Deudas Pendientes</span>
								<div class="flex size-9 items-center justify-center rounded-xl bg-error/10 text-error">
									<AlertCircle class="size-5" />
								</div>
							</div>
							<div class="mt-3">
								<p class="text-text-primary text-3xl font-black tracking-tight tabular-nums">
									{{ formatCurrency(totalPendingDebts) }}
								</p>
								<p class="mt-1 text-xs font-medium text-text-muted">
									<span :class="pendingDebtsCount > 0 ? 'text-error font-semibold' : 'text-success'">
										{{ pendingDebtsCount }} expedientes por liquidar
									</span>
								</p>
							</div>
						</div>
						<div class="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
							<NuxtLink
								to="/finanzas/deudas"
								class="text-primary hover:text-primary/80 font-bold flex items-center gap-1 transition-colors">
								Gestionar Cobros
								<ArrowRight class="size-3.5" />
							</NuxtLink>
							<span class="text-[0.7rem] text-text-muted uppercase font-bold">Riesgo Financiero</span>
						</div>
					</div>
				</section>

				<!-- Main Bento Layout: 2 Columns Asymmetrical -->
				<div class="grid grid-cols-1 gap-8 lg:grid-cols-5">
					<!-- Left Column (60%): Operativa Comercial & Tendencia de Ventas -->
					<div class="space-y-8 lg:col-span-3">
						<!-- Operativa de Cabina / Ventas TPV Switcher -->
						<section class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border-subtle md:p-8">
							<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<!-- Tab switcher -->
								<div class="flex items-center gap-1 rounded-2xl bg-bg-app p-1 border border-border-subtle">
									<button
										type="button"
										class="rounded-xl px-4 py-2 text-xs font-bold transition-all"
										:class="activeTab === 'bookings' ? 'bg-bg-card text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'"
										@click="activeTab = 'bookings'">
										Próximas Citas ({{ upcomingBookings.length }})
									</button>
									<button
										type="button"
										class="rounded-xl px-4 py-2 text-xs font-bold transition-all"
										:class="activeTab === 'sales' ? 'bg-bg-card text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'"
										@click="activeTab = 'sales'">
										Últimas Ventas ({{ recentSales.length }})
									</button>
								</div>

								<NuxtLink
									:to="activeTab === 'bookings' ? '/agenda' : '/ventas'"
									class="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-bold transition-colors">
									<span>{{ activeTab === 'bookings' ? 'Ver Agenda Completa' : 'Histórico de Ventas' }}</span>
									<ArrowRight class="size-3.5" />
								</NuxtLink>
							</div>

							<!-- TAB 1: Próximas Citas -->
							<div v-if="activeTab === 'bookings'">
								<div v-if="upcomingBookings.length > 0" class="flex flex-col gap-2.5">
									<div
										v-for="booking in upcomingBookings"
										:key="booking.booking_id"
										class="group hover:bg-bg-app hover:border-primary/40 flex items-center justify-between gap-4 rounded-2xl border border-border-subtle/60 p-3.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
										title="Ver día de la cita en Agenda"
										@click="goToBooking(booking)">
										<!-- Time & Client Info -->
										<div class="flex items-center gap-3.5 min-w-0">
											<div class="bg-bg-app text-text-primary flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-border-subtle tabular-nums font-mono group-hover:border-primary/30 transition-colors">
												<span class="text-sm font-black">{{ booking.start_time || formatTime(booking.booking_date) }}</span>
												<span class="text-[0.65rem] text-text-muted">{{ booking.duration }}m</span>
											</div>

											<NuxtLink
												:to="`/clientes/${booking.client_id}`"
												class="bg-primary/10 text-primary border-primary/20 flex size-10 shrink-0 items-center justify-center rounded-xl border overflow-hidden hover:scale-105 transition-transform"
												title="Ver ficha del cliente"
												@click.stop>
												<img
													v-if="booking.client?.avatar && !avatarErrors.has(booking.client.user_id || '')"
													:src="booking.client.avatar"
													class="size-full object-cover"
													@error="handleAvatarError(booking.client.user_id || '')">
												<span v-else class="text-xs font-bold">
													{{ booking.client?.name?.charAt(0) }}{{ booking.client?.surname?.charAt(0) }}
												</span>
											</NuxtLink>

											<div class="flex flex-col min-w-0">
												<NuxtLink
													:to="`/clientes/${booking.client_id}`"
													class="text-text-primary hover:text-primary truncate font-bold text-sm transition-colors hover:underline"
													title="Ver ficha del cliente"
													@click.stop>
													{{ booking.client?.name }} {{ booking.client?.surname }}
												</NuxtLink>
												<div class="text-text-muted mt-0.5 flex items-center gap-2 truncate text-xs font-medium">
													<span v-if="booking.service_item" class="truncate font-medium text-text-secondary">
														{{ booking.service_item.name }}
													</span>
													<span v-else-if="booking.pack_item" class="truncate font-medium text-text-secondary">
														{{ booking.pack_item.name }}
													</span>
													<span v-if="booking.professional?.name" class="text-text-muted hidden sm:inline">
														• Cabina: {{ booking.professional.name }}
													</span>
												</div>
											</div>
										</div>

										<!-- Status & Direct Actions -->
										<div class="flex items-center gap-3 shrink-0">
											<span
												class="rounded-full px-2.5 py-1 text-[0.7rem] font-bold tracking-wide uppercase"
												:class="{
													'bg-success/10 text-success': booking.status === 'confirmed',
													'bg-warning/10 text-warning-content': booking.status === 'pending',
													'bg-info/10 text-info': booking.status === 'completed',
												}">
												{{
													booking.status === 'confirmed'
														? 'Confirmada'
														: booking.status === 'pending'
															? 'Pendiente'
															: booking.status
												}}
											</span>
											<a
												v-if="booking.client?.phone"
												:href="`tel:${booking.client.phone}`"
												class="text-text-muted hover:text-primary transition-colors p-1"
												title="Llamar al cliente"
												@click.stop>
												<Phone class="size-4" />
											</a>
										</div>
									</div>
								</div>

								<div v-else class="flex flex-col items-center justify-center py-10 text-center">
									<div class="bg-bg-app mb-3 flex size-14 items-center justify-center rounded-2xl border border-border-subtle">
										<CalendarCheck class="text-text-muted/60 size-7" />
									</div>
									<p class="text-text-primary text-base font-bold">No hay citas pendientes</p>
									<p class="text-text-muted text-xs">Agenda despejada para las próximas horas.</p>
								</div>
							</div>

							<!-- TAB 2: Últimas Ventas TPV -->
							<div v-else>
								<div v-if="recentSales.length > 0" class="divide-y divide-border-subtle/60 flex flex-col">
									<div
										v-for="sale in recentSales"
										:key="sale.cart_id"
										class="group flex items-center justify-between py-3">
										<div class="flex items-center gap-3.5 min-w-0">
											<div class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20">
												<Receipt class="size-5" />
											</div>
											<div class="flex flex-col min-w-0">
												<p class="text-text-primary text-sm font-bold truncate">
													{{
														sale.user?.name
															? `${sale.user.name} ${sale.user.surname || ''}`
															: 'Cliente Mostrador / Venta Directa'
													}}
												</p>
												<span class="text-text-muted text-xs">
													{{ timeAgo(sale.created_at) }} • {{ sale.payment_method || 'Efectivo/Tarjeta' }}
												</span>
											</div>
										</div>

										<div class="text-right shrink-0">
											<span class="text-text-primary text-base font-black tabular-nums">
												{{ formatCurrency(sale.total) }}
											</span>
											<span class="block text-[0.65rem] font-bold text-success uppercase">Completada</span>
										</div>
									</div>
								</div>

								<div v-else class="flex flex-col items-center justify-center py-10 text-center">
									<div class="bg-bg-app mb-3 flex size-14 items-center justify-center rounded-2xl border border-border-subtle">
										<ShoppingBag class="text-text-muted/60 size-7" />
									</div>
									<p class="text-text-primary text-base font-bold">No hay ventas registradas</p>
									<p class="text-text-muted text-xs">Abre el TPV para registrar la primera venta de caja.</p>
								</div>
							</div>
						</section>

						<!-- Revenue Trend Chart (ECharts Semestral) -->
						<section class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border-subtle md:p-8">
							<div class="mb-4 flex items-center justify-between">
								<div>
									<h3 class="text-text-primary text-base font-bold">Evolución Comercial (Últimos 6 Meses)</h3>
									<p class="text-text-muted text-xs font-medium">Trayectoria de facturación mensual para análisis de marketing y ventas</p>
								</div>
								<NuxtLink
									to="/reportes"
									class="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-bold transition-colors">
									<span>Ver Reportes</span>
									<ArrowRight class="size-3.5" />
								</NuxtLink>
							</div>

							<div class="h-65 w-full">
								<ClientChart v-if="revenueTrendOptions" :option="revenueTrendOptions" />
								<div v-else class="flex h-full items-center justify-center text-text-muted text-xs">
									Cargando datos de facturación...
								</div>
							</div>
						</section>
					</div>

					<!-- Right Column (40%): Inteligencia Comercial & Stock -->
					<div class="space-y-8 lg:col-span-2">
						<!-- Ranking de Tratamientos y Servicios Estrella -->
						<section class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border-subtle md:p-8">
							<div class="mb-4 flex items-center justify-between">
								<div class="flex items-center gap-2">
									<Sparkles class="size-4 text-primary" />
									<h3 class="text-text-primary text-base font-bold">Tratamientos Estrella</h3>
								</div>
								<span class="text-xs font-semibold text-text-muted">Top Demanda</span>
							</div>
							<p class="text-text-muted text-xs mb-5">Servicios y productos con mayor rotación e impacto en facturación.</p>

							<div v-if="topPerformers.length > 0" class="space-y-4">
								<div v-for="(item, idx) in topPerformers" :key="item.name" class="space-y-1.5">
									<div class="flex items-center justify-between text-xs font-semibold">
										<span class="text-text-primary truncate max-w-50">
											<span class="text-text-muted mr-1">#{{ idx + 1 }}</span>
											{{ item.name }}
										</span>
										<span class="text-text-muted tabular-nums">{{ item.quantity }} ventas</span>
									</div>
									<div class="h-2 w-full rounded-full bg-bg-app overflow-hidden">
										<div
											class="h-full rounded-full bg-primary transition-all duration-500"
											:style="{ width: `${item.percentage}%` }" />
									</div>
								</div>
							</div>

							<div v-else class="py-6 text-center text-xs text-text-muted">
								Aún no hay suficientes ventas registradas para calcular el ranking.
							</div>
						</section>

						<!-- Mix Comercial: Servicios vs Retail -->
						<section class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border-subtle md:p-8">
							<div class="mb-3 flex items-center justify-between">
								<div class="flex items-center gap-2">
									<Layers class="size-4 text-info" />
									<h3 class="text-text-primary text-base font-bold">Mix de Venta (Servicio vs Retail)</h3>
								</div>
								<span class="text-xs font-bold text-primary">{{ salesMix.retail }}% Producto</span>
							</div>
							<p class="text-text-muted text-xs mb-4">
								Equilibrio entre tratamientos de cabina y cosmética domiciliaria (clave para margen y fidelización).
							</p>

							<!-- Proportion Bar -->
							<div class="h-3 w-full rounded-full bg-bg-app flex overflow-hidden border border-border-subtle">
								<div
									class="bg-primary h-full transition-all duration-500"
									:style="{ width: `${salesMix.services}%` }"
									title="Tratamientos en Cabina" />
								<div
									class="bg-info h-full transition-all duration-500"
									:style="{ width: `${salesMix.retail}%` }"
									title="Retail / Cosmética Domiciliaria" />
							</div>

							<div class="mt-3 flex items-center justify-between text-xs font-semibold">
								<div class="flex items-center gap-1.5">
									<span class="size-2.5 rounded-full bg-primary" />
									<span class="text-text-primary">Servicios: {{ salesMix.services }}%</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="size-2.5 rounded-full bg-info" />
									<span class="text-text-primary">Retail: {{ salesMix.retail }}%</span>
								</div>
							</div>
						</section>

						<!-- Alerta de Stock Crítico -->
						<section class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-border-subtle md:p-8">
							<div class="flex items-center justify-between mb-4">
								<div class="flex items-center gap-2">
									<PackageOpen class="size-4 text-warning-content" />
									<h3 class="text-text-primary text-base font-bold">Inventario & Reposición</h3>
								</div>
								<NuxtLink
									to="/catalogo/productos"
									class="text-primary hover:text-primary/80 text-xs font-bold flex items-center gap-1">
									<span>Catálogo</span>
									<ArrowRight class="size-3.5" />
								</NuxtLink>
							</div>

							<div v-if="lowStockAlerts.length > 0" class="space-y-3">
								<div class="rounded-2xl bg-warning/10 border border-warning/20 p-3.5 text-warning-content text-xs font-medium flex items-start gap-2.5">
									<AlertTriangle class="size-4 shrink-0 mt-0.5" />
									<div>
										<p class="font-bold">Hay {{ lowStockAlerts.length }} productos bajo mínimos</p>
										<p class="text-[0.75rem] opacity-90 mt-0.5">Riesgo de pérdida de ventas en mostrador.</p>
									</div>
								</div>

								<div class="divide-y divide-border-subtle/60 max-h-40 overflow-y-auto custom-scrollbar pr-1">
									<div
										v-for="prod in lowStockAlerts.slice(0, 4)"
										:key="prod.product_id"
										class="flex items-center justify-between py-2 text-xs">
										<span class="text-text-primary font-medium truncate max-w-45">{{ prod.name }}</span>
										<span class="rounded-md bg-error/10 text-error px-2 py-0.5 font-bold tabular-nums text-[0.7rem]">
											{{ prod.stock }} disp. (mín {{ prod.min_stock }})
										</span>
									</div>
								</div>

								<NuxtLink
									to="/catalogo/productos"
									class="btn btn-sm w-full rounded-xl bg-bg-app hover:bg-bg-muted border border-border-subtle text-text-primary font-bold text-xs mt-2">
									Revisar y Reponer Stock
								</NuxtLink>
							</div>

							<div v-else class="rounded-2xl bg-success/10 border border-success/20 p-4 text-success flex items-center gap-3">
								<CheckCircle2 class="size-5 shrink-0" />
								<div class="text-xs">
									<p class="font-bold">Stock en niveles saludables</p>
									<p class="opacity-90 mt-0.5">No hay productos por debajo del stock de seguridad.</p>
								</div>
							</div>
						</section>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
	width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background-color: var(--border-subtle, #ececec);
	border-radius: 20px;
}
</style>
