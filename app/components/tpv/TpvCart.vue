<script setup lang="ts">
	import {
		User as UserIcon,
		Trash2,
		CreditCard,
		Banknote,
		Wallet,
		Tag,
		ChevronRight,
		ShoppingBag,
		Smartphone,
		ArrowRightLeft,
		X
	} from 'lucide-vue-next'

	interface Props {
		cartItems: any[]
		selectedClient: any | null
		filteredClients: any[]
		cartSubtotal: number
		cartTotal: number
		isCheckingOut: boolean
		avatarError: boolean
		formatCurrency: (val: number) => string
	}

	defineProps<Props>()

	const emit = defineEmits<{
		(e: 'select-client', client: any): void
		(e: 'remove-client'): void
		(e: 'remove-item', index: number): void
		(e: 'decrease-item-qty', index: number): void
		(e: 'increase-item-qty', index: number): void
		(e: 'checkout'): void
		(e: 'avatar-error'): void
	}>()

	const clientSearch = defineModel<string>('clientSearch', { required: true })
	const discountAmount = defineModel<number>('discountAmount', { required: true })
	const paymentMethod = defineModel<'cash' | 'card' | 'mixed' | 'debt' | 'bizum' | 'transfer'>('paymentMethod', { required: true })
</script>

<template>
	<div
		class="bg-bg-card/90 border-border-default/80 z-20 flex h-full w-full flex-col border-t shadow-xl backdrop-blur-2xl md:border-t-0 md:border-l overflow-y-auto md:overflow-hidden">

		<!-- CLIENT SELECTOR HEADER -->
		<div class="bg-bg-muted/15 border-border-default/70 relative z-30 border-b p-3.5 sm:p-5">
			<div class="relative">
				<!-- Search Client State -->
				<div v-if="!selectedClient" class="relative">
					<UserIcon class="text-text-muted absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
					<input
						v-model="clientSearch"
						type="text"
						placeholder="Asignar cliente..."
						class="input bg-bg-card/70 border border-border-default/85 focus:bg-bg-card focus:border-text-primary h-11 w-full rounded-2xl pr-8 pl-10 text-xs font-semibold shadow-xs transition-all placeholder:text-text-muted/60" >
					<button
						v-if="clientSearch"
						type="button"
						class="btn btn-ghost btn-xs btn-circle absolute top-1/2 right-2 -translate-y-1/2 text-text-muted"
						@click="clientSearch = ''">
						<X class="h-3.5 w-3.5" />
					</button>

					<!-- Client Autocomplete Dropdown -->
					<ul
						v-if="clientSearch && filteredClients.length > 0"
						class="border-border-default bg-bg-card absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border shadow-2xl">
						<li v-for="client in filteredClients" :key="client.user_id">
							<button
								type="button"
								class="hover:bg-bg-muted border-border-default/40 flex w-full items-center justify-between border-b p-3 text-left transition-colors last:border-0"
								@click="emit('select-client', client)">
								<div class="flex flex-col">
									<span class="text-xs font-bold text-text-primary">{{ client.name }} {{ client.surname }}</span>
									<span class="text-text-muted text-[10px] font-medium mt-0.5">{{ client.phone || client.email }}</span>
								</div>
								<ChevronRight class="text-text-muted h-3.5 w-3.5" />
							</button>
						</li>
					</ul>
				</div>

				<!-- Selected Client Badge -->
				<div
					v-else
					class="bg-text-primary text-bg-card flex items-center justify-between rounded-2xl p-3 shadow-xs transition-all">
					<div class="flex items-center gap-3">
						<div
							class="bg-white/20 text-white flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden border border-white/10">
							<img
								v-if="selectedClient.avatar && !avatarError"
								:src="selectedClient.avatar"
								class="h-full w-full object-cover"
								@error="emit('avatar-error')" >
							<span v-else class="text-xs font-black">
								{{ selectedClient.name.charAt(0) }}{{ selectedClient.surname?.charAt(0) || '' }}
							</span>
						</div>
						<div class="flex flex-col">
							<span class="text-xs font-bold leading-tight">
								{{ selectedClient.name }} {{ selectedClient.surname }}
							</span>
							<span class="text-white/70 text-[9px] font-bold tracking-wider uppercase mt-0.5">Cliente Asociado</span>
						</div>
					</div>
					<button
						type="button"
						aria-label="Remove Client"
						class="btn btn-ghost btn-circle btn-xs text-white/70 hover:bg-white/15 hover:text-white border-none"
						@click="emit('remove-client')">
						<Trash2 class="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		</div>

		<!-- CART ITEMS LIST CONTAINER -->
		<div class="custom-scrollbar flex-1 shrink-0 overflow-y-auto p-3.5 sm:p-4 flex flex-col gap-2 min-h-55 md:min-h-0">
			<!-- Empty Cart State -->
			<div
				v-if="cartItems.length === 0"
				class="flex h-full flex-col items-center justify-center text-center py-12 opacity-60">
				<div class="bg-bg-muted/40 mb-3 flex h-14 w-14 items-center justify-center rounded-full">
					<ShoppingBag class="text-text-muted h-7 w-7 opacity-50" />
				</div>
				<p class="text-text-primary text-xs font-bold uppercase tracking-wider">Carrito vacío</p>
				<p class="text-text-muted mt-1 max-w-50 text-[11px]">Selecciona ítems del catálogo para comenzar la venta</p>
			</div>

			<!-- Items List -->
			<div v-else class="flex flex-col gap-2">
				<div
					v-for="(item, index) in cartItems"
					:key="index"
					class="bg-bg-card border-border-default/80 group relative flex gap-3 overflow-hidden rounded-2xl border p-3 shadow-xs transition-all hover:border-border-default">
					<div class="flex flex-1 flex-col justify-center">
						<div class="flex items-start justify-between gap-2">
							<span class="pr-6 text-xs font-bold text-text-primary leading-tight line-clamp-2">
								{{ item.name }}
							</span>
							<button
								type="button"
								aria-label="Remove Item"
								class="text-text-muted/60 hover:text-error bg-bg-card absolute top-2.5 right-2.5 p-1 rounded-md transition-all group-hover:opacity-100"
								@click="emit('remove-item', index)">
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>

						<div class="flex items-center justify-between mt-2.5">
							<!-- Quantity Adjust Controls -->
							<div class="join border-border-default/60 bg-bg-muted/40 rounded-xl border">
								<button
									type="button"
									aria-label="Decrease Quantity"
									class="join-item btn btn-xs btn-ghost text-text-primary font-bold px-2"
									@click="item.quantity > 1 ? emit('decrease-item-qty', index) : emit('remove-item', index)">
									-
								</button>
								<span class="join-item flex items-center px-2 text-xs font-bold tabular-nums text-text-primary font-mono">
									{{ item.quantity }}
								</span>
								<button
									type="button"
									aria-label="Increase Quantity"
									class="join-item btn btn-xs btn-ghost text-text-primary font-bold px-2"
									@click="emit('increase-item-qty', index)">
									+
								</button>
							</div>

							<!-- Bonus Badge or Unit Price -->
							<div class="flex items-center gap-2">
								<span class="text-xs font-black tabular-nums text-text-primary">
									{{ formatCurrency(item.unit_price * item.quantity) }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- CHECKOUT FOOTER & PAYMENT METHOD SELECTION -->
		<div class="bg-bg-card border-border-default/80 z-20 border-t p-4 sm:p-5 shadow-2xl">
			<!-- Totals Section -->
			<div class="mb-4 flex flex-col gap-2">
				<div class="text-text-muted flex items-center justify-between text-xs font-semibold uppercase">
					<span>Subtotal</span>
					<span class="tabular-nums font-bold text-text-primary">{{ formatCurrency(cartSubtotal) }}</span>
				</div>

				<div class="text-error flex items-center justify-between text-xs font-semibold uppercase">
					<span class="flex items-center gap-1">
						<Tag class="h-3 w-3" />
						<span>Descuento</span>
					</span>
					<div class="relative w-28">
						<span class="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-extrabold">-</span>
						<input
							v-model="discountAmount"
							type="number"
							min="0"
							:max="cartSubtotal"
							class="input input-xs bg-error/10 text-error h-7 w-full rounded-lg border-none pr-2 text-right font-black tabular-nums focus:ring-0 focus:outline-none" >
					</div>
				</div>

				<div class="divider my-1 opacity-30"/>

				<div class="flex items-end justify-between">
					<span class="text-text-muted text-[10px] font-black tracking-widest uppercase mb-1">Total a Pagar</span>
					<span class="text-text-primary text-2xl sm:text-3xl leading-none font-black tracking-tight tabular-nums">
						{{ formatCurrency(cartTotal) }}
					</span>
				</div>
			</div>

			<!-- Payment Methods Grid (DaisyUI Style Buttons) -->
			<div class="mb-4 grid grid-cols-3 gap-1.5">
				<button
					type="button"
					class="btn btn-sm h-auto py-2.5 flex flex-col items-center justify-center rounded-xl border text-center transition-all"
					:class="paymentMethod === 'card' ? 'btn-neutral text-bg-card shadow-xs' : 'btn-ghost border-border-default/70 text-text-muted hover:text-text-primary'"
					@click="paymentMethod = 'card'">
					<CreditCard class="h-4 w-4 mb-0.5 shrink-0" />
					<span class="text-[9px] font-extrabold uppercase tracking-wider">Tarjeta</span>
				</button>

				<button
					type="button"
					class="btn btn-sm h-auto py-2.5 flex flex-col items-center justify-center rounded-xl border text-center transition-all"
					:class="paymentMethod === 'cash' ? 'btn-neutral text-bg-card shadow-xs' : 'btn-ghost border-border-default/70 text-text-muted hover:text-text-primary'"
					@click="paymentMethod = 'cash'">
					<Banknote class="h-4 w-4 mb-0.5 shrink-0" />
					<span class="text-[9px] font-extrabold uppercase tracking-wider">Efectivo</span>
				</button>

				<button
					type="button"
					class="btn btn-sm h-auto py-2.5 flex flex-col items-center justify-center rounded-xl border text-center transition-all"
					:class="paymentMethod === 'bizum' ? 'btn-neutral text-bg-card shadow-xs' : 'btn-ghost border-border-default/70 text-text-muted hover:text-text-primary'"
					@click="paymentMethod = 'bizum'">
					<Smartphone class="h-4 w-4 mb-0.5 shrink-0" />
					<span class="text-[9px] font-extrabold uppercase tracking-wider">Bizum</span>
				</button>

				<button
					type="button"
					class="btn btn-sm h-auto py-2.5 flex flex-col items-center justify-center rounded-xl border text-center transition-all"
					:class="paymentMethod === 'transfer' ? 'btn-neutral text-bg-card shadow-xs' : 'btn-ghost border-border-default/70 text-text-muted hover:text-text-primary'"
					@click="paymentMethod = 'transfer'">
					<ArrowRightLeft class="h-4 w-4 mb-0.5 shrink-0" />
					<span class="text-[9px] font-extrabold uppercase tracking-wider">Transf.</span>
				</button>

				<button
					type="button"
					class="btn btn-sm h-auto py-2.5 flex flex-col items-center justify-center rounded-xl border text-center transition-all"
					:class="paymentMethod === 'mixed' ? 'btn-neutral text-bg-card shadow-xs' : 'btn-ghost border-border-default/70 text-text-muted hover:text-text-primary'"
					@click="paymentMethod = 'mixed'">
					<Wallet class="h-4 w-4 mb-0.5 shrink-0" />
					<span class="text-[9px] font-extrabold uppercase tracking-wider">Mixto</span>
				</button>

				<button
					type="button"
					class="btn btn-sm h-auto py-2.5 flex flex-col items-center justify-center rounded-xl border text-center transition-all"
					:class="paymentMethod === 'debt' ? 'btn-error text-white shadow-xs' : 'btn-ghost border-error/20 text-error hover:bg-error/10'"
					@click="paymentMethod = 'debt'">
					<span class="h-4 w-4 flex items-center justify-center font-black text-xs font-mono mb-0.5">D</span>
					<span class="text-[9px] font-extrabold uppercase tracking-wider">A Deber</span>
				</button>
			</div>

			<!-- Main Action Button -->
			<button
				type="button"
				:disabled="cartItems.length === 0 || isCheckingOut"
				class="btn h-12 sm:h-14 w-full rounded-2xl border-none text-xs sm:text-sm font-black tracking-widest uppercase shadow-md transition-all active:scale-[0.98]"
				:class="cartItems.length > 0 ? 'bg-text-primary hover:bg-text-primary/95 text-bg-card' : 'bg-bg-muted text-text-muted/60 opacity-50 cursor-not-allowed'"
				@click="emit('checkout')">
				<span v-if="isCheckingOut" class="loading loading-spinner loading-sm"/>
				<span v-else>Confirmar y Cobrar</span>
			</button>
		</div>
	</div>
</template>
