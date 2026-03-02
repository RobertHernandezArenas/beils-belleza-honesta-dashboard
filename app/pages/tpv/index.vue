<script setup lang="ts">
	import { ref, computed } from 'vue'
	import { useQuery, useMutation } from '@tanstack/vue-query'
	import {
		ShoppingBag,
		Search,
		User as UserIcon,
		Trash2,
		CreditCard,
		Banknote,
		Wallet,
		Tag,
		Package as PackageIcon,
		Scissors,
		PackageSearch,
	} from 'lucide-vue-next'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Terminal de Venta (TPV)' })

	// Tab control
	const activeTab = ref<'products' | 'services' | 'packs'>('services')
	const searchQuery = ref('')
	const clientSearch = ref('')

	// Cart State
	const cartItems = ref<any[]>([])
	const selectedClient = ref<any | null>(null)
	const discountAmount = ref<number>(0)
	const paymentMethod = ref<'cash' | 'card' | 'mixed' | 'debt'>('card')

	// Toast State
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	// Fetch Data
	const { data: clients } = useQuery({
		queryKey: ['clients-tpv'],
		queryFn: () => $fetch('/api/clients'),
	})

	const { data: products } = useQuery({
		queryKey: ['products-tpv'],
		queryFn: () => $fetch('/api/catalog/products'),
	})

	const { data: services } = useQuery({
		queryKey: ['services-tpv'],
		queryFn: () => $fetch('/api/services'),
	})

	const { data: packs } = useQuery({
		queryKey: ['packs-tpv'],
		queryFn: () => $fetch('/api/catalog/packs'),
	})

	// Process checkout mutation
	const { mutate: processSale, isPending: isCheckingOut } = useMutation({
		mutationFn: async (payload: any) => {
			const res = await $fetch('/api/sales/carts', {
				method: 'POST',
				body: payload,
			})

			// If payment is debt, create debt record
			if (paymentMethod.value === 'debt' && selectedClient.value) {
				await $fetch('/api/sales/debts', {
					method: 'POST',
					body: {
						user_id: selectedClient.value.user_id,
						cart_id: res.cart_id,
						amount: res.total,
						status: 'pending',
					},
				})
			}
			return res
		},
		onSuccess: () => {
			displayToast('Venta registrada con éxito', 'success')
			clearCart()
		},
		onError: (error: any) => {
			displayToast(error.data?.statusMessage || 'Error al procesar la venta', 'error')
		},
	})

	// Filtered Lists
	const filteredCatalog = computed(() => {
		const q = searchQuery.value.toLowerCase()

		if (activeTab.value === 'products' && products.value) {
			return products.value.filter(
				(p: any) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q),
			)
		}
		if (activeTab.value === 'services' && services.value) {
			return services.value.filter(
				(s: any) => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q),
			)
		}
		if (activeTab.value === 'packs' && packs.value) {
			return packs.value.filter(
				(p: any) => p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q),
			)
		}
		return []
	})

	const filteredClients = computed(() => {
		if (!clients.value || !clientSearch.value) return []
		const q = clientSearch.value.toLowerCase()
		return clients.value
			.filter(
				(c: any) =>
					c.name.toLowerCase().includes(q) ||
					c.surname.toLowerCase().includes(q) ||
					c.phone?.includes(q) ||
					c.document_number?.toLowerCase().includes(q),
			)
			.slice(0, 5) // Limit answers
	})

	// Cart Operations
	const addToCart = (item: any, type: string) => {
		const existing = cartItems.value.find(
			i => i.item_id === (item.product_id || item.service_id || item.pack_id),
		)

		if (existing) {
			existing.quantity++
		} else {
			cartItems.value.push({
				item_id: item.product_id || item.service_id || item.pack_id,
				item_type: type,
				name: item.name,
				unit_price: item.price,
				tax_rate: item.tax_rate || 21.0,
				quantity: 1,
			})
		}
		// Reset search
		searchQuery.value = ''
	}

	const removeFromCart = (index: number) => {
		cartItems.value.splice(index, 1)
	}

	const clearCart = () => {
		cartItems.value = []
		selectedClient.value = null
		discountAmount.value = 0
		paymentMethod.value = 'card'
	}

	const selectClient = (client: any) => {
		selectedClient.value = client
		clientSearch.value = ''
	}

	// Computed Totals
	const cartSubtotal = computed(() => {
		return cartItems.value.reduce((acc, item) => acc + item.unit_price * item.quantity, 0)
	})

	const cartTotal = computed(() => {
		const total = cartSubtotal.value - discountAmount.value
		return total > 0 ? total : 0
	})

	// Perform Checkout
	const handleCheckout = () => {
		if (cartItems.value.length === 0) return

		if (paymentMethod.value === 'debt' && !selectedClient.value) {
			displayToast('Para dejar a deber, debes seleccionar un cliente.', 'error')
			return
		}

		processSale({
			user_id: selectedClient.value?.user_id,
			status: paymentMethod.value === 'debt' ? 'pending' : 'completed',
			payment_method: paymentMethod.value,
			discount: discountAmount.value,
			items: cartItems.value,
		})
	}

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => (showToast.value = false), 3000)
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary flex h-screen w-full flex-col overflow-hidden lg:flex-row">
		<!-- LEFT SIDE: Catalog & Browser -->
		<div class="bg-bg-app m-4 flex flex-1 flex-col overflow-hidden pr-0 lg:m-6 lg:pr-4">
			<!-- Generic Header -->
			<div class="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
				<div class="flex w-full items-center gap-3">
					<div
						class="bg-primary/10 text-primary flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl">
						<ShoppingBag class="h-6 w-6" />
					</div>
					<div class="flex-1">
						<h1 class="text-2xl font-bold tracking-tight">Terminal Venta</h1>
						<p class="text-text-muted text-sm font-medium">TPV / Punto de Venta</p>
					</div>
				</div>
			</div>

			<!-- TPV Search & Tabs -->
			<div
				class="bg-bg-card border-border-default mb-4 flex flex-col rounded-3xl border p-2 shadow-sm sm:flex-row">
				<div class="tabs tabs-boxed flex flex-1 flex-wrap gap-1 bg-transparent p-0">
					<a
						class="tab transition-200 h-10 flex-1 rounded-xl px-4 text-xs font-bold tracking-wider uppercase transition-colors"
						:class="
							activeTab === 'services'
								? 'bg-text-primary text-bg-card'
								: 'text-text-muted hover:bg-bg-muted'
						"
						@click="activeTab = 'services'">
						<Scissors class="mr-2 hidden h-4 w-4 sm:block" />
						Servicios
					</a>
					<a
						class="tab transition-200 h-10 flex-1 rounded-xl px-4 text-xs font-bold tracking-wider uppercase transition-colors"
						:class="
							activeTab === 'products'
								? 'bg-text-primary text-bg-card'
								: 'text-text-muted hover:bg-bg-muted'
						"
						@click="activeTab = 'products'">
						<PackageIcon class="mr-2 hidden h-4 w-4 sm:block" />
						Productos
					</a>
					<a
						class="tab transition-200 h-10 flex-1 rounded-xl px-4 text-xs font-bold tracking-wider uppercase transition-colors"
						:class="
							activeTab === 'packs'
								? 'bg-text-primary text-bg-card'
								: 'text-text-muted hover:bg-bg-muted'
						"
						@click="activeTab = 'packs'">
						<PackageSearch class="mr-2 hidden h-4 w-4 sm:block" />
						Packs
					</a>
				</div>
				<div class="divider divider-horizontal opactiy-50 mx-1 my-1 hidden sm:flex"></div>
				<div class="relative mt-2 w-full flex-shrink-0 sm:mt-0 sm:w-64">
					<Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<input
						v-model="searchQuery"
						type="text"
						placeholder="Buscar ítem..."
						class="input bg-bg-muted focus:bg-bg-card focus:ring-primary/20 h-10 w-full rounded-xl border-none pl-9 text-sm font-medium shadow-inner focus:ring-1" />
				</div>
			</div>

			<!-- Catalog Grid container (scrollable) -->
			<div class="custom-scrollbar -mr-4 flex-1 overflow-y-auto pr-4">
				<div
					class="grid grid-cols-2 gap-4 pb-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
					<button
						v-for="item in filteredCatalog"
						:key="item.product_id || item.service_id || item.pack_id"
						@click="addToCart(item, activeTab.slice(0, -1))"
						class="group bg-bg-card border-border-default hover:border-primary/50 relative flex h-36 cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md active:scale-95">
						<div class="z-10 flex flex-col">
							<span
								class="group-hover:text-primary line-clamp-2 text-sm leading-tight font-bold transition-colors">
								{{ item.name }}
							</span>
							<span
								v-if="item.sku || item.code"
								class="text-text-muted mt-1 text-[10px] font-black tracking-widest uppercase">
								{{ item.sku || item.code }}
							</span>
						</div>

						<div class="z-10 mt-auto flex items-end justify-between">
							<span class="text-lg font-black tabular-nums">{{ formatCurrency(item.price) }}</span>
							<div
								class="bg-bg-muted text-text-muted group-hover:bg-primary group-hover:text-bg-card flex h-8 w-8 items-center justify-center rounded-xl transition-colors">
								<Plus class="h-4 w-4" />
							</div>
						</div>

						<!-- Background graphic hint -->
						<div
							class="absolute -right-4 -bottom-4 opacity-5 transition-opacity group-hover:opacity-10">
							<PackageIcon v-if="activeTab === 'products'" class="h-24 w-24" />
							<Scissors v-else-if="activeTab === 'services'" class="h-24 w-24" />
							<PackageSearch v-else class="h-24 w-24" />
						</div>
					</button>

					<div
						v-if="filteredCatalog.length === 0"
						class="col-span-full flex flex-col items-center py-20 text-center">
						<Search class="text-border-strong mb-3 h-8 w-8 opacity-50" />
						<p class="text-text-muted text-sm font-bold tracking-wider uppercase">
							No se encontraron resultados en esta categoría
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- RIGHT SIDE: Cart & Checkout (Fixed width usually on TPVs) -->
		<div
			class="bg-bg-card border-border-default z-20 flex h-full w-full flex-col border-l shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] lg:w-[420px] xl:w-[480px]">
			<!-- Client Selector Header -->
			<div class="bg-bg-muted/30 border-border-default border-b p-5 pt-6 backdrop-blur-md">
				<div class="relative">
					<div v-if="!selectedClient" class="relative">
						<UserIcon class="text-text-muted absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
						<input
							v-model="clientSearch"
							type="text"
							placeholder="Buscar cliente por teléfono o nombre..."
							class="input bg-bg-card border-border-default focus:border-primary focus:ring-primary/20 h-12 w-full rounded-2xl pl-12 text-sm shadow-sm transition-all focus:shadow-md" />

						<!-- Client Autocomplete Dropdown -->
						<ul
							v-if="clientSearch && filteredClients.length > 0"
							class="border-border-default bg-bg-card absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border shadow-xl">
							<li v-for="client in filteredClients" :key="client.user_id">
								<button
									@click="selectClient(client)"
									class="hover:bg-bg-muted border-border-default/50 flex w-full items-center justify-between border-b p-4 text-left transition-colors last:border-0">
									<div class="flex flex-col">
										<span class="text-sm font-bold">{{ client.name }} {{ client.surname }}</span>
										<span class="text-text-muted text-xs">{{ client.phone }}</span>
									</div>
									<Plus class="text-text-muted h-4 w-4" />
								</button>
							</li>
						</ul>
					</div>

					<div
						v-else
						class="bg-bg-card border-border-default flex items-center justify-between rounded-2xl border p-3 pl-4 shadow-sm">
						<div class="flex items-center gap-3">
							<div
								class="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
								<span class="text-sm font-bold">
									{{ selectedClient.name.charAt(0) }}{{ selectedClient.surname.charAt(0) }}
								</span>
							</div>
							<div class="flex flex-col">
								<span class="mb-1 text-sm leading-none font-bold">
									{{ selectedClient.name }} {{ selectedClient.surname }}
								</span>
								<span class="text-text-muted text-[10px] font-bold tracking-wider uppercase">
									Cliente Seleccionado
								</span>
							</div>
						</div>
						<button
							@click="selectedClient = null"
							class="btn btn-ghost btn-circle btn-sm text-text-muted hover:bg-error/10 hover:text-error">
							<Trash2 class="h-4 w-4" />
						</button>
					</div>
				</div>
			</div>

			<!-- Cart Items List -->
			<div class="custom-scrollbar bg-bg-app/30 flex-1 overflow-y-auto p-5">
				<div
					v-if="cartItems.length === 0"
					class="flex h-full flex-col items-center justify-center text-center opacity-50">
					<ShoppingBag class="text-border-strong mb-4 h-16 w-16" />
					<p class="text-text-muted text-sm font-bold tracking-wider uppercase">El carrito está vacío</p>
					<p class="text-text-muted mt-2 max-w-[200px] text-xs">
						Añade productos o servicios desde el catálogo de la izquierda.
					</p>
				</div>

				<div v-else class="flex flex-col gap-3">
					<div
						v-for="(item, index) in cartItems"
						:key="index"
						class="bg-bg-card border-border-default group relative flex gap-4 overflow-hidden rounded-2xl border p-4 shadow-sm">
						<!-- Item Details -->
						<div class="flex flex-1 flex-col justify-center">
							<div class="mb-2 flex items-start justify-between">
								<span class="pr-4 text-sm leading-tight font-bold">{{ item.name }}</span>
								<button
									@click="removeFromCart(index)"
									class="text-text-muted hover:text-error bg-bg-card absolute top-4 right-4 mt-0.5 pl-2 opacity-0 transition-colors group-hover:opacity-100">
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<button
										@click="item.quantity > 1 ? item.quantity-- : removeFromCart(index)"
										class="btn btn-circle btn-xs bg-bg-muted hover:bg-border-default text-text-primary border-none">
										-
									</button>
									<span class="w-6 text-center text-sm font-bold tabular-nums">
										{{ item.quantity }}
									</span>
									<button
										@click="item.quantity++"
										class="btn btn-circle btn-xs bg-bg-muted hover:bg-border-default text-text-primary border-none">
										+
									</button>
								</div>
								<span class="text-sm font-black tabular-nums">
									{{ formatCurrency(item.unit_price * item.quantity) }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Checkout Footer -->
			<div
				class="bg-bg-card border-border-default z-20 border-t p-6 pb-8 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
				<!-- Totals -->
				<div class="mb-6 flex flex-col gap-2">
					<div class="text-text-muted flex items-center justify-between text-sm font-medium">
						<span>Subtotal</span>
						<span class="tabular-nums">{{ formatCurrency(cartSubtotal) }}</span>
					</div>
					<div class="text-error flex items-center justify-between text-sm font-medium">
						<span class="flex items-center gap-1.5">
							<Tag class="h-3.5 w-3.5" />
							Descuento / Cupón
						</span>
						<div class="relative w-24">
							<span class="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-bold">-</span>
							<input
								v-model="discountAmount"
								type="number"
								min="0"
								:max="cartSubtotal"
								class="input input-xs bg-error/10 text-error h-7 w-full rounded-md border-none pr-2 text-right font-bold" />
						</div>
					</div>
					<div class="divider my-1 opacity-50"></div>
					<div class="flex items-end justify-between">
						<span class="text-text-muted text-xs font-black tracking-wider uppercase">
							Total a Pagar
						</span>
						<span class="text-primary text-4xl leading-none font-black tracking-tight tabular-nums">
							{{ formatCurrency(cartTotal) }}
						</span>
					</div>
				</div>

				<!-- Payment Methods -->
				<div class="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
					<button
						class="btn border-border-default flex h-auto flex-col flex-nowrap gap-1 rounded-2xl border py-3"
						:class="
							paymentMethod === 'card'
								? 'bg-text-primary text-bg-card border-text-primary shadow-md'
								: 'bg-bg-muted text-text-muted hover:bg-bg-hover'
						"
						@click="paymentMethod = 'card'">
						<CreditCard class="mb-0.5 h-5 w-5" />
						<span class="text-[10px] font-bold tracking-wider uppercase">Tarjeta</span>
					</button>
					<button
						class="btn border-border-default flex h-auto flex-col flex-nowrap gap-1 rounded-2xl border py-3"
						:class="
							paymentMethod === 'cash'
								? 'bg-text-primary text-bg-card border-text-primary shadow-md'
								: 'bg-bg-muted text-text-muted hover:bg-bg-hover'
						"
						@click="paymentMethod = 'cash'">
						<Banknote class="mb-0.5 h-5 w-5" />
						<span class="text-[10px] font-bold tracking-wider uppercase">Efectivo</span>
					</button>
					<button
						class="btn border-border-default flex h-auto flex-col flex-nowrap gap-1 rounded-2xl border py-3"
						:class="
							paymentMethod === 'mixed'
								? 'bg-text-primary text-bg-card border-text-primary shadow-md'
								: 'bg-bg-muted text-text-muted hover:bg-bg-hover'
						"
						@click="paymentMethod = 'mixed'">
						<Wallet class="mb-0.5 h-5 w-5" />
						<span class="text-[10px] font-bold tracking-wider uppercase">Mixto</span>
					</button>
					<button
						class="btn border-error/20 flex h-auto flex-col flex-nowrap gap-1 rounded-2xl border py-3"
						:class="
							paymentMethod === 'debt'
								? 'bg-error border-error text-white shadow-md'
								: 'bg-error/5 text-error hover:bg-error/10'
						"
						@click="paymentMethod = 'debt'">
						<span class="mt-1 mb-0.5 text-lg leading-none font-black tabular-nums">0€</span>
						<span class="text-[10px] font-bold tracking-wider uppercase">Deuda</span>
					</button>
				</div>

				<!-- Action -->
				<button
					@click="handleCheckout"
					:disabled="cartItems.length === 0 || isCheckingOut"
					class="btn h-16 w-full rounded-2xl border-none text-lg font-black tracking-wider uppercase shadow-xl transition-transform active:scale-95"
					:class="
						cartItems.length > 0
							? 'bg-primary hover:bg-primary/90 hover:shadow-primary/30 text-white'
							: 'bg-bg-muted text-text-muted opacity-50'
					">
					<span v-if="isCheckingOut" class="loading loading-spinner"></span>
					<span v-else>Procesar Cobro</span>
				</button>
			</div>
		</div>

		<!-- Toast -->
		<div v-if="showToast" class="toast toast-end toast-bottom z-[100]">
			<div
				:class="[
					'alert rounded-2xl border-none text-white shadow-lg',
					toastType === 'success' ? 'bg-success' : 'bg-error',
				]">
				<span class="font-medium">{{ toastMessage }}</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
	/* Allow layout full height without scroll on body for TPV experience */
	:global(body) {
		overflow: hidden;
	}
</style>
