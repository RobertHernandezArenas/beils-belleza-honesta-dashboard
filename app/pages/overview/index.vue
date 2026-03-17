<script lang="ts" setup>
	import { useQuery } from '@tanstack/vue-query'
	import {
		CircleDollarSign,
		CalendarCheck,
		Users,
		AlertCircle,
		ShoppingBag,
		Clock,
		ArrowRight,
		PackageOpen,
	} from 'lucide-vue-next'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Resumen | Beils Dashboard' })

	const authStore = useAuthStore()

	// Queries
	const { data: carts, isPending: loadingCarts } = useQuery<any[]>({
		queryKey: ['carts-overview'],
		queryFn: () => $fetch('/api/sales/carts'),
	})

	const { data: bookings, isPending: loadingBookings } = useQuery<any[]>({
		queryKey: ['bookings-overview'],
		queryFn: () => $fetch('/api/agenda/bookings'),
	})

	const { data: clients, isPending: loadingClients } = useQuery<any[]>({
		queryKey: ['clients-overview'],
		queryFn: () => $fetch('/api/users?role=CLIENT'),
	})

	const { data: debts, isPending: loadingDebts } = useQuery<any[]>({
		queryKey: ['debts-overview'],
		queryFn: () => $fetch('/api/sales/debts'),
	})

	const { data: products, isPending: loadingProducts } = useQuery<any[]>({
		queryKey: ['products-overview'],
		queryFn: () => $fetch('/api/catalog/products'),
	})

	const isPending = computed(
		() =>
			loadingCarts.value ||
			loadingBookings.value ||
			loadingClients.value ||
			loadingDebts.value ||
			loadingProducts.value,
	)

	// Fechas y formateos
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

	const isToday = (dateString: string) => {
		const d = new Date(dateString)
		return (
			d.getDate() === today.getDate() &&
			d.getMonth() === today.getMonth() &&
			d.getFullYear() === today.getFullYear()
		)
	}

	// KPIs Calculations
	const todayRevenue = computed(() => {
		if (!carts.value) return 0
		return carts.value
			.filter((c: any) => c.status === 'completed' && isToday(c.created_at))
			.reduce((sum: number, c: any) => sum + c.total, 0)
	})

	const todayBookingsCount = computed(() => {
		if (!bookings.value) return 0
		return bookings.value.filter((b: any) => isToday(b.booking_date)).length
	})

	const newClientsCount = computed(() => {
		if (!clients.value) return 0
		const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
		return clients.value.filter((c: any) => new Date(c.created_at) >= sevenDaysAgo).length
	})

	const totalPendingDebts = computed(() => {
		if (!debts.value) return 0
		return debts.value
			.filter((d: any) => d.status === 'pending' || d.status === 'partial')
			.reduce((sum: number, d: any) => sum + Number(d.remaining || 0), 0)
	})

	// Lists
	const upcomingBookings = computed(() => {
		if (!bookings.value) return []
		return bookings.value
			.filter((b: any) => new Date(b.booking_date) >= today && b.status !== 'cancelled')
			.sort((a: any, b: any) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
			.slice(0, 5) // Top 5
	})

	const recentSales = computed(() => {
		if (!carts.value) return []
		return carts.value
			.filter((c: any) => c.status === 'completed')
			.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.slice(0, 5) // Top 5
	})

	const lowStockAlerts = computed(() => {
		if (!products.value) return []
		return products.value.filter((p: any) => p.stock <= (p.min_stock || 0))
	})

	// Manejo de errores de avatar
	const avatarErrors = reactive(new Set<string>())
	const handleAvatarError = (id: string) => {
		avatarErrors.add(id)
	}
</script>

<template>
	<div
		class="bg-bg-app text-text-secondary selection:bg-primary/20 min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-[1400px]">
			<!-- Header (Greeting) -->
			<header class="mb-10">
				<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">
					Hola
					<span class="font-bold">{{ authStore.user?.name || 'Administrador' }}</span>
					,
				</h1>
				<p class="text-text-muted text-sm font-medium capitalize">
					este es el resumen de tu centro para hoy {{ formattedDate }}.
				</p>
			</header>

			<!-- Loader Global -->
			<div v-if="isPending" class="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div v-for="i in 4" :key="i" class="bg-bg-card h-32 animate-pulse rounded-3xl shadow-sm"></div>
			</div>

			<template v-else>
				<!-- Top Row: KPI Cards -->
				<section class="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					<!-- KPI: Ingresos -->
					<div
						class="bg-bg-card hover:bg-bg-muted/30 group rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors">
						<div class="mb-4 flex items-center justify-between">
							<h3 class="text-text-muted text-sm font-medium">Ingresos del Día</h3>
							<div
								class="bg-success/10 text-success flex h-10 w-10 items-center justify-center rounded-2xl duration-300 group-hover:scale-105">
								<CircleDollarSign class="h-5 w-5" />
							</div>
						</div>
						<p class="text-text-primary text-3xl font-bold tracking-tight tabular-nums">
							{{ formatCurrency(todayRevenue) }}
						</p>
					</div>

					<!-- KPI: Citas -->
					<div
						class="bg-bg-card hover:bg-bg-muted/30 group rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors">
						<div class="mb-4 flex items-center justify-between">
							<h3 class="text-text-muted text-sm font-medium">Citas de Hoy</h3>
							<div
								class="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-2xl duration-300 group-hover:scale-105">
								<CalendarCheck class="h-5 w-5" />
							</div>
						</div>
						<p class="text-text-primary text-3xl font-bold tracking-tight tabular-nums">
							{{ todayBookingsCount }}
						</p>
					</div>

					<!-- KPI: Clientes Nuevos -->
					<div
						class="bg-bg-card hover:bg-bg-muted/30 group rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors">
						<div class="mb-4 flex items-center justify-between">
							<h3 class="text-text-muted text-sm font-medium">Nuevos Clientes (7d)</h3>
							<div
								class="bg-info/10 text-info flex h-10 w-10 items-center justify-center rounded-2xl duration-300 group-hover:scale-105">
								<Users class="h-5 w-5" />
							</div>
						</div>
						<p class="text-text-primary text-3xl font-bold tracking-tight tabular-nums">
							{{ newClientsCount }}
						</p>
					</div>

					<!-- KPI: Deudas Pendientes -->
					<div
						class="bg-bg-card hover:bg-bg-muted/30 group rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors">
						<div class="mb-4 flex items-center justify-between">
							<h3 class="text-text-muted text-sm font-medium">Deudas Pendientes</h3>
							<div
								class="bg-error/10 text-error flex h-10 w-10 items-center justify-center rounded-2xl duration-300 group-hover:scale-105">
								<AlertCircle class="h-5 w-5" />
							</div>
						</div>
						<p class="text-text-primary text-3xl font-bold tracking-tight tabular-nums">
							{{ formatCurrency(totalPendingDebts) }}
						</p>
					</div>
				</section>

				<!-- Banner de Alertas (Inventory) -->
				<section v-if="lowStockAlerts.length > 0" class="animate-fade-in mb-10 w-full">
					<div
						class="bg-warning/5 border-warning/10 flex flex-col items-start justify-between gap-4 rounded-3xl border p-6 sm:flex-row sm:items-center">
						<div class="flex items-center gap-4">
							<div
								class="bg-warning/20 text-warning-content flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
								<PackageOpen class="h-6 w-6" />
							</div>
							<div>
								<h4 class="text-warning-content font-bold">Alerta de Inventario</h4>
								<p class="text-warning-content/80 mt-0.5 text-sm">
									Tienes {{ lowStockAlerts.length }} productos con stock bajo el mínimo.
								</p>
							</div>
						</div>
						<NuxtLink
							to="/catalogo/productos"
							class="btn btn-sm bg-warning text-warning-content rounded-full border-none font-bold transition-colors hover:scale-105 hover:brightness-95">
							Revisar Stock
						</NuxtLink>
					</div>
				</section>

				<!-- Main Layout: 2 Columns Asymmetrical -->
				<div class="grid grid-cols-1 gap-8 lg:grid-cols-5">
					<!-- Left Column (60%) : Próximas Citas -->
					<section
						class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] md:p-8 lg:col-span-3">
						<div class="mb-6 flex items-center justify-between">
							<h2 class="text-text-primary text-lg font-bold">Próximas Citas</h2>
							<NuxtLink
								to="/agenda"
								class="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-bold transition-colors">
								Ver Agenda
								<ArrowRight class="h-4 w-4" />
							</NuxtLink>
						</div>

						<div v-if="upcomingBookings.length > 0" class="flex flex-col gap-2">
							<div
								v-for="booking in upcomingBookings"
								:key="booking.booking_id"
								class="group hover:bg-bg-muted/50 flex cursor-pointer items-center gap-4 rounded-2xl p-4 transition-colors">
								<!-- Time & Avatar -->
								<div class="flex items-center gap-3">
									<div
										class="bg-bg-muted text-text-primary flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-xl tabular-nums">
										<span class="text-sm font-bold">{{ formatTime(booking.booking_date) }}</span>
									</div>
									<div class="bg-primary/10 text-primary border-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border overflow-hidden">
										<img 
											v-if="booking.client?.avatar && !avatarErrors.has(booking.client.user_id)" 
											:src="booking.client.avatar" 
											class="h-full w-full object-cover"
											@error="handleAvatarError(booking.client.user_id)" />
										<span v-else class="text-xs font-bold">{{ booking.client?.name?.charAt(0) }}{{ booking.client?.surname?.charAt(0) }}</span>
									</div>
								</div>
								
								<!-- Info -->
								<div class="flex flex-1 flex-col justify-center overflow-hidden ml-1">
									<h4 class="text-text-primary truncate font-bold">
										{{ booking.client?.name }} {{ booking.client?.surname }}
									</h4>
									<div
										class="text-text-muted mt-0.5 flex items-center gap-2 truncate text-xs font-medium">
										<Clock class="h-3.5 w-3.5 stroke-[2.5]" />
										<span>{{ booking.duration }} min</span>
										<span v-if="booking.service_item">• {{ booking.service_item.name }}</span>
										<span v-else-if="booking.pack_item">• {{ booking.pack_item.name }}</span>
									</div>
								</div>

								<!-- Status Badge -->
								<div class="shrink-0">
									<span
										class="rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase"
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
								</div>
							</div>
						</div>

						<!-- Empty State -->
						<div v-else class="flex flex-col items-center justify-center py-12 text-center">
							<div class="bg-bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
								<CalendarCheck class="text-text-muted/50 h-8 w-8" />
							</div>
							<p class="text-text-primary text-lg font-bold">No hay citas próximas</p>
							<p class="text-text-muted mt-1 text-sm">Tu agenda está libre por ahora.</p>
						</div>
					</section>

					<!-- Right Column (40%) : Ventas Recientes -->
					<section
						class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] md:p-8 lg:col-span-2">
						<div class="mb-6 flex items-center justify-between">
							<h2 class="text-text-primary text-lg font-bold">Ventas Recientes</h2>
							<NuxtLink
								to="/finanzas/deudas"
								class="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-bold transition-colors">
								Historial
								<ArrowRight class="h-4 w-4" />
							</NuxtLink>
						</div>

						<div
							v-if="recentSales.length > 0"
							class="custom-scrollbar divide-bg-muted/50 flex max-h-[400px] flex-col divide-y overflow-y-auto pr-2">
							<div
								v-for="sale in recentSales"
								:key="sale.cart_id"
								class="group flex items-center justify-between py-4">
								<div class="flex items-center gap-4">
									<div
										class="bg-primary/5 text-primary group-hover:bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors border-primary/10 border overflow-hidden">
										<img 
											v-if="sale.user?.avatar && !avatarErrors.has(sale.user.user_id)" 
											:src="sale.user.avatar" 
											class="h-full w-full object-cover"
											@error="handleAvatarError(sale.user.user_id)" />
										<ShoppingBag v-else class="h-4 w-4" />
									</div>
									<div class="flex flex-col">
										<p class="text-text-primary text-sm font-bold">
											{{
												sale.user?.name
													? `${sale.user.name} ${sale.user.surname || ''}`
													: 'Cliente Mostrador'
											}}
										</p>
										<span class="text-text-muted mt-0.5 text-xs font-medium">
											{{ timeAgo(sale.created_at) }}
										</span>
									</div>
								</div>

								<div class="flex flex-col text-right">
									<span class="text-text-primary font-bold tabular-nums">
										{{ formatCurrency(sale.total) }}
									</span>
									<span
										class="text-text-muted mt-1 text-[0.65rem] font-bold tracking-wider uppercase">
										{{ sale.payment_method }}
									</span>
								</div>
							</div>
						</div>

						<!-- Empty State -->
						<div v-else class="flex flex-col items-center justify-center py-12 text-center">
							<div class="bg-bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
								<ShoppingBag class="text-text-muted/50 h-8 w-8" />
							</div>
							<p class="text-text-primary text-lg font-bold">Aún no hay ventas</p>
							<p class="text-text-muted mt-1 text-sm">Procesa tu primera venta en el TPV.</p>
						</div>
					</section>
				</div>
			</template>
		</div>
	</div>
</template>

<style scoped>
	.animate-fade-in {
		animation: fadeIn 0.4s ease-out forwards;
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background-color: var(--color-bg-muted, #f2f0eb);
		border-radius: 20px;
	}
</style>
