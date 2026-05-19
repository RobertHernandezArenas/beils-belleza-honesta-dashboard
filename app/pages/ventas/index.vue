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

	const sortKey = ref<'date' | 'payment_method' | 'total' | 'client'>('date')
	const sortOrder = ref<'desc' | 'asc'>('desc')

	const currentPage = ref(1)
	const itemsPerPage = ref(20)

	const purchaseDetailsModalRef = ref<any>(null)

	const openDetails = (sale: any) => {
		purchaseDetailsModalRef.value?.open(sale)
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

	const summaryStats = computed(() => {
		if (!sales.value) return { total: 0, count: 0, average: 0 }
		
		const startDate = getStartOfDate(summaryTimeframe.value)
		const relevantSales = sales.value.filter((s: any) => new Date(s.created_at) >= startDate)

		const total = relevantSales.reduce((sum, s) => sum + s.total, 0)
		const count = relevantSales.length
		const average = count > 0 ? total / count : 0

		return { total, count, average }
	})

	const toggleSort = (key: 'date' | 'payment_method' | 'total' | 'client') => {
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
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8 lg:h-[calc(100dvh-73px)] lg:flex lg:flex-col lg:overflow-hidden">
		<div class="mx-auto flex h-full w-full max-w-[1400px] flex-col lg:overflow-hidden gap-6">
			
			<!-- HEADER -->
			<div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mt-2">
				<div>
					<h1 class="text-text-primary text-3xl font-bold tracking-tight mb-1">Historial de tickets y facturación</h1>
					<p class="text-text-muted text-sm">Gestiona y visualiza todas tus transacciones en tiempo real.</p>
				</div>
				<div class="bg-bg-card border border-border-default rounded-[14px] p-1 flex items-center shadow-sm">
					<button @click="summaryTimeframe = 'day'" :class="summaryTimeframe === 'day' ? 'bg-bg-muted/60 text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'" class="px-5 py-1.5 rounded-xl text-sm font-semibold transition-all">Día</button>
					<button @click="summaryTimeframe = 'week'" :class="summaryTimeframe === 'week' ? 'bg-bg-muted/60 text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'" class="px-5 py-1.5 rounded-xl text-sm font-semibold transition-all">Semana</button>
					<button @click="summaryTimeframe = 'month'" :class="summaryTimeframe === 'month' ? 'bg-bg-muted/60 text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'" class="px-5 py-1.5 rounded-xl text-sm font-semibold transition-all">Mes</button>
				</div>
			</div>

			<!-- SUMMARY PANELS -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<!-- Card 1 -->
				<div class="bg-bg-card border border-border-default rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
					<div class="flex justify-between items-center mb-4">
						<span class="text-[10px] font-bold text-text-muted tracking-widest uppercase">TOTAL VENTAS HOY</span>
						<span class="text-[11px] font-bold text-text-primary">-12.5%</span>
					</div>
					<h3 class="text-3xl font-bold text-text-primary tabular-nums mb-4">{{ formatCurrency(summaryStats.total) }}</h3>
					<div class="h-6 w-full -mb-1">
						<svg viewBox="0 0 100 20" class="w-full h-full text-text-primary opacity-80" preserveAspectRatio="none">
							<path d="M0,15 L10,14 L20,16 L30,12 L40,15 L50,13 L60,10 L70,14 L80,11 L90,12 L100,8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
				</div>

				<!-- Card 2 -->
				<div class="bg-bg-card border border-border-default rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
					<div class="flex justify-between items-center mb-4">
						<span class="text-[10px] font-bold text-text-muted tracking-widest uppercase">TICKETS EMITIDOS</span>
						<span class="text-[11px] font-bold text-text-primary">+4.2%</span>
					</div>
					<h3 class="text-3xl font-bold text-text-primary tabular-nums mb-4">{{ summaryStats.count }}</h3>
					<div class="h-6 w-full -mb-1">
						<svg viewBox="0 0 100 20" class="w-full h-full text-text-primary opacity-80" preserveAspectRatio="none">
							<path d="M0,18 L10,16 L20,17 L30,14 L40,15 L50,12 L60,13 L70,9 L80,10 L90,7 L100,5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
				</div>

				<!-- Card 3 -->
				<div class="bg-bg-card border border-border-default rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
					<div class="flex justify-between items-center mb-4">
						<span class="text-[10px] font-bold text-text-muted tracking-widest uppercase">PROM. POR VENTA</span>
						<span class="text-[11px] font-bold text-red-500">-1.8%</span>
					</div>
					<h3 class="text-3xl font-bold text-text-primary tabular-nums mb-4">{{ formatCurrency(summaryStats.average) }}</h3>
					<div class="h-6 w-full -mb-1">
						<svg viewBox="0 0 100 20" class="w-full h-full text-red-500" preserveAspectRatio="none">
							<path d="M0,5 L10,6 L20,4 L30,8 L40,7 L50,10 L60,9 L70,12 L80,11 L90,14 L100,13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
				</div>

				<!-- Card 4 (Dark) -->
				<div class="bg-[#1C1C1E] text-white rounded-2xl p-6 flex flex-col justify-center shadow-lg relative overflow-hidden border border-[#2C2C2E]">
					<!-- Watermark arrow -->
					<div class="absolute -right-6 -bottom-6 text-[#2C2C2E] opacity-50">
						<svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
					</div>
					<div class="relative z-10">
						<span class="text-[10px] font-bold text-neutral-400 tracking-widest uppercase block mb-3">PROYECCIÓN MENSUAL</span>
						<h3 class="text-4xl font-bold tabular-nums mb-2">{{ formatCurrency(summaryStats.total * 1.08) }}</h3>
						<p class="text-[11px] text-neutral-300">Superando el objetivo por 8%</p>
					</div>
				</div>
			</div>

			<!-- FILTER BAR -->
			<div class="bg-bg-muted/10 border border-border-default rounded-[18px] p-2 sm:p-3 flex flex-col xl:flex-row gap-4 items-center justify-between">
				<div class="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full xl:w-auto items-center flex-wrap xl:flex-nowrap">
					
					<!-- Search Input -->
					<div class="flex items-center bg-bg-card border border-border-default rounded-xl px-4 h-11 w-full sm:w-auto min-w-[200px] shadow-sm">
						<Search class="w-4 h-4 text-text-muted mr-2 shrink-0" />
						<input v-model="searchQuery" type="text" placeholder="Buscar ticket o cliente..." class="bg-transparent text-sm border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-full" />
					</div>

					<!-- Date Selector (Mimics UI) -->
					<div class="flex items-center bg-bg-card border border-border-default rounded-xl px-2 h-11 w-full sm:w-auto shadow-sm overflow-hidden">
						<!-- Toggle Switch Single/Range -->
						<label class="cursor-pointer mr-2 ml-1 flex items-center border-r border-border-default pr-3">
							<input type="checkbox" class="checkbox checkbox-xs checkbox-primary rounded-sm" :checked="filterDateMode === 'range'" @change="filterDateMode = filterDateMode === 'range' ? 'single' : 'range'" />
							<span class="text-[10px] font-bold text-text-muted ml-1.5 uppercase">RANGO</span>
						</label>

						<div v-if="filterDateMode === 'single'" class="flex items-center">
							<Calendar class="w-4 h-4 text-text-muted mx-2 shrink-0" />
							<input v-model="filterDateSingle" type="date" class="bg-transparent text-sm font-medium border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-[120px] cursor-pointer" />
						</div>
						<div v-else class="flex items-center">
							<Calendar class="w-4 h-4 text-text-muted mx-2 shrink-0" />
							<input v-model="filterDateRange.start" type="date" class="bg-transparent text-sm font-medium border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-[120px] cursor-pointer" />
							<span class="text-text-muted mx-1 text-xs">-</span>
							<Calendar class="w-4 h-4 text-text-muted mx-2 shrink-0" />
							<input v-model="filterDateRange.end" type="date" class="bg-transparent text-sm font-medium border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-[120px] cursor-pointer" />
						</div>
					</div>

					<!-- Payment method select -->
					<div class="flex items-center bg-bg-card border border-border-default rounded-xl px-4 h-11 w-full sm:w-auto shadow-sm">
						<CreditCard class="w-4 h-4 text-text-muted mr-3 shrink-0" />
						<select v-model="filterPaymentMethod" class="bg-transparent text-sm font-medium border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-full sm:w-[160px] cursor-pointer appearance-none">
							<option value="all">Todos los métodos</option>
							<option value="cash">Efectivo</option>
							<option value="card">Tarjeta</option>
							<option value="mixed">Mixto</option>
							<option value="transfer">Transferencia</option>
							<option value="stripe">Stripe</option>
						</select>
					</div>
				</div>

				<div class="flex gap-2 w-full xl:w-auto justify-end">
					<button class="w-11 h-11 bg-bg-card border border-border-default rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-muted transition-colors shadow-sm">
						<Filter class="w-4 h-4" />
					</button>
					<button class="w-11 h-11 bg-bg-card border border-border-default rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-muted transition-colors shadow-sm">
						<Download class="w-4 h-4" />
					</button>
				</div>
			</div>

			<!-- TABLE AREA -->
			<div class="bg-bg-card border border-border-default rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden shadow-sm">
				<div class="flex-1 overflow-auto w-full">
					<table class="w-full text-left min-w-[900px] border-collapse relative">
						<thead class="bg-bg-muted/20 sticky top-0 z-10 backdrop-blur-xl">
							<tr class="text-[10px] font-bold text-text-muted tracking-widest uppercase border-b border-border-default">
								<th class="py-5 pl-6 font-semibold w-40">
									ID TICKET
								</th>
								<th class="py-5 px-4 font-semibold cursor-pointer select-none hover:text-text-primary transition-colors" @click="toggleSort('date')">
									<div class="flex items-center gap-1.5">
										FECHA Y HORA
										<ArrowUp v-if="sortKey === 'date' && sortOrder === 'asc'" class="w-3 h-3 text-text-primary" />
										<ArrowDown v-else-if="sortKey === 'date' && sortOrder === 'desc'" class="w-3 h-3 text-text-primary" />
									</div>
								</th>
								<th class="py-5 px-4 font-semibold cursor-pointer select-none hover:text-text-primary transition-colors" @click="toggleSort('client')">
									<div class="flex items-center gap-1.5">
										CLIENTE
										<ArrowUp v-if="sortKey === 'client' && sortOrder === 'asc'" class="w-3 h-3 text-text-primary" />
										<ArrowDown v-else-if="sortKey === 'client' && sortOrder === 'desc'" class="w-3 h-3 text-text-primary" />
									</div>
								</th>
								<th class="py-5 px-4 font-semibold">ARTÍCULOS</th>
								<th class="py-5 px-4 font-semibold cursor-pointer select-none hover:text-text-primary transition-colors text-center" @click="toggleSort('payment_method')">
									<div class="flex items-center justify-center gap-1.5">
										MÉTODO PAGO
										<ArrowUp v-if="sortKey === 'payment_method' && sortOrder === 'asc'" class="w-3 h-3 text-text-primary" />
										<ArrowDown v-else-if="sortKey === 'payment_method' && sortOrder === 'desc'" class="w-3 h-3 text-text-primary" />
									</div>
								</th>
								<th class="py-5 px-4 font-semibold cursor-pointer select-none hover:text-text-primary transition-colors text-right" @click="toggleSort('total')">
									<div class="flex items-center justify-end gap-1.5">
										TOTAL
										<ArrowUp v-if="sortKey === 'total' && sortOrder === 'asc'" class="w-3 h-3 text-text-primary" />
										<ArrowDown v-else-if="sortKey === 'total' && sortOrder === 'desc'" class="w-3 h-3 text-text-primary" />
									</div>
								</th>
								<th class="py-5 pr-6 font-semibold text-center w-36">ACCIONES</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border-default bg-bg-card">
							<tr v-for="sale in paginatedSales" :key="sale.cart_id" @click.stop.prevent="openDetails(sale)" class="hover:bg-bg-muted/30 transition-colors cursor-pointer group">
								<td class="py-4 pl-6">
									<div class="text-[11px] font-semibold text-text-muted tracking-wider uppercase">
										{{ sale.invoice_number ? sale.invoice_number : `BBH-${new Date(sale.created_at).getFullYear()}-${sale.cart_id.split('-')[0].substring(0,4)}` }}
									</div>
								</td>
								<td class="py-4 px-4 text-sm font-medium text-text-muted">
									{{ formatCustomDate(sale.created_at) }}
								</td>
								<td class="py-4 px-4">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded bg-[#1C1C1E] text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
											{{ sale.user ? `${sale.user.name?.charAt(0)}${sale.user.surname?.charAt(0)}` : 'CR' }}
										</div>
										<div class="flex flex-col">
											<span v-if="sale.user" class="text-sm font-bold text-text-primary group-hover:underline">
												{{ sale.user.name }} <span class="font-semibold">{{ sale.user.surname }}</span>
											</span>
											<span v-else class="text-sm font-bold text-text-primary">
												Cliente No Registrado
											</span>
										</div>
									</div>
								</td>
								<td class="py-4 px-4">
									<span class="bg-bg-muted/50 text-text-secondary border border-border-default text-[11px] font-semibold px-2 py-1 rounded-md">
										{{ getTotalItems(sale.items) }} items
									</span>
								</td>
								<td class="py-4 px-4 text-center">
									<span class="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border" :class="getPaymentMethodBadge(sale.payment_method).class">
										{{ getPaymentMethodBadge(sale.payment_method).label }}
									</span>
								</td>
								<td class="py-4 px-4 text-right">
									<div class="text-[15px] font-bold text-text-primary tabular-nums whitespace-nowrap">
										{{ formatCurrency(sale.total) }}
									</div>
								</td>
								<td class="py-4 pr-6">
									<button class="flex items-center justify-center gap-2 w-full text-text-primary hover:text-primary transition-colors">
										<ExternalLink class="w-4 h-4" />
										<span class="text-xs font-semibold">Ver Detalles</span>
									</button>
								</td>
							</tr>
							
							<!-- Empty State rows if needed -->
							<tr v-if="!paginatedSales.length && !isPending">
								<td colspan="7" class="py-16 text-center">
									<div class="flex flex-col items-center justify-center">
										<ShoppingBag class="w-12 h-12 text-text-muted/30 mb-3" />
										<p class="text-text-muted font-medium text-sm">No se encontraron resultados</p>
									</div>
								</td>
							</tr>
							
							<!-- Loading State rows -->
							<template v-if="isPending">
								<tr v-for="i in 5" :key="'loading-' + i">
									<td colspan="7" class="py-4 px-6">
										<div class="h-10 bg-bg-muted/50 animate-pulse rounded-xl w-full"></div>
									</td>
								</tr>
							</template>
						</tbody>
					</table>
				</div>

				<!-- Pagination Footer -->
				<div class="border-t border-border-default px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-bg-card">
					<span class="text-sm text-text-muted">
						Mostrando {{ filteredSales.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0 }}-{{ Math.min(currentPage * itemsPerPage, filteredSales.length) }} de {{ filteredSales.length.toLocaleString() }} resultados
					</span>
					<div class="flex gap-1.5">
						<button 
							@click="currentPage > 1 && currentPage--"
							:disabled="currentPage === 1"
							class="w-8 h-8 flex items-center justify-center rounded bg-bg-muted text-text-muted hover:bg-border-default disabled:opacity-50 transition-colors"
						>
							<ChevronLeft class="w-4 h-4" />
						</button>
						
						<template v-for="page in totalPages" :key="page">
							<button 
								v-if="page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)"
								@click="currentPage = page"
								:class="currentPage === page ? 'bg-[#1C1C1E] text-white border-transparent' : 'bg-transparent text-text-secondary hover:bg-bg-muted'"
								class="w-8 h-8 flex items-center justify-center rounded text-[13px] font-bold transition-colors"
							>
								{{ page }}
							</button>
							<span v-else-if="page === currentPage - 2 || page === currentPage + 2" class="w-8 h-8 flex items-center justify-center text-text-muted text-xs">...</span>
						</template>

						<button 
							@click="currentPage < totalPages && currentPage++"
							:disabled="currentPage === totalPages || totalPages === 0"
							class="w-8 h-8 flex items-center justify-center rounded bg-bg-muted text-text-muted hover:bg-border-default disabled:opacity-50 transition-colors"
						>
							<ChevronRight class="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Details Modal -->
		<PurchaseDetailsModal ref="purchaseDetailsModalRef" @success="() => queryClient.invalidateQueries({ queryKey: ['sales'] })" />
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
</style>
