<script setup lang="ts">
	import {
		User as UserIcon,
		Trash2,
		CreditCard,
		Banknote,
		Wallet,
		Tag,
		ChevronRight,
		Check,
		ShoppingBag,
		Smartphone,
		ArrowRightLeft,
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
		clientBonuses: any[]
	}

	const props = defineProps<Props>()

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

	const isConfirmingLastSession = ref(false)

	const handleAttemptCheckout = () => {
		let hasLastSession = false
		const appliedCounts: Record<string, number> = {}
		
		for (const item of props.cartItems) {
			if (item.applied_client_bonus_id) {
				appliedCounts[item.applied_client_bonus_id] = (appliedCounts[item.applied_client_bonus_id] || 0) + item.quantity
			}
		}
		
		for (const [bonusId, count] of Object.entries(appliedCounts)) {
			const cb = props.clientBonuses.find(b => b.client_bonus_id === bonusId)
			// Cuando el bono tenía X sesiones originalmente, y en el carrito se consumen X sesiones exactas (dejando 0 disponibles localmente), es la última.
			if (cb && (cb.remaining_sessions - count === 0)) {
				hasLastSession = true
				break
			}
		}
		
		if (hasLastSession) {
			isConfirmingLastSession.value = true
		} else {
			emit('checkout')
		}
	}

	const confirmLastSession = () => {
		isConfirmingLastSession.value = false
		emit('checkout')
	}
</script>

<template>
	<div
		class="bg-bg-card/75 border-border-default/80 z-20 flex h-[48dvh] w-full shrink-0 flex-col border-t shadow-[0_-10px_35px_rgba(0,0,0,0.02)] backdrop-blur-2xl md:h-full md:w-[350px] md:border-t-0 md:border-l lg:w-[390px] xl:w-[420px]">
		<!-- Client Selector Header -->
		<div class="bg-bg-muted/10 border-border-default/70 relative z-50 border-b p-5 pt-6">
			<div class="relative">
				<div v-if="!selectedClient" class="relative">
					<UserIcon class="text-text-muted absolute top-1/2 left-4 h-4.5 w-4.5 -translate-y-1/2" />
					<input
						v-model="clientSearch"
						type="text"
						placeholder="Asignar cliente..."
						class="input bg-white/60 border border-border-default/85 focus:border-text-primary/45 focus:bg-bg-card h-12 w-full rounded-2xl pl-11 text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-colors focus:ring-0" />

					<!-- Client Autocomplete Dropdown -->
					<ul
						v-if="clientSearch && filteredClients.length > 0"
						class="border-border-default bg-bg-card absolute z-55 mt-1.5 w-full overflow-hidden rounded-2xl border shadow-xl">
						<li v-for="client in filteredClients" :key="client.user_id">
								<button
									@click="emit('select-client', client)"
									class="hover:bg-bg-muted border-border-default/50 flex w-full items-center justify-between border-b p-3.5 text-left transition-colors last:border-0">
									<div class="flex flex-col">
										<span class="text-xs font-extrabold text-text-primary">{{ client.name }} {{ client.surname }}</span>
										<span class="text-text-muted text-[10px] font-semibold mt-0.5">{{ client.phone }}</span>
									</div>
									<ChevronRight class="text-text-muted h-3.5 w-3.5" />
								</button>
							</li>
					</ul>
				</div>

				<div
					v-else
					class="bg-text-primary text-bg-card flex items-center justify-between rounded-2xl p-3.5 pl-4 shadow-sm border border-transparent">
					<div class="flex items-center gap-3">
						<div
							class="bg-white/20 text-white flex h-9 w-9 shrink-0 items-center justify-center rounded-full overflow-hidden border border-white/10">
							<img 
								v-if="selectedClient.avatar && !avatarError" 
								:src="selectedClient.avatar" 
								class="h-full w-full object-cover"
								@error="emit('avatar-error')" />
							<span v-else class="text-xs font-black">
								{{ selectedClient.name.charAt(0) }}{{ selectedClient.surname.charAt(0) }}
							</span>
						</div>
						<div class="flex flex-col">
							<span class="text-xs font-black leading-none">
								{{ selectedClient.name }} {{ selectedClient.surname }}
							</span>
							<span class="text-white/60 text-[9px] font-extrabold tracking-widest uppercase mt-1">CLIENTE ASOCIADO</span>
						</div>
					</div>
					<button
						@click="emit('remove-client')"
						aria-label="Remove Client"
						class="btn btn-ghost btn-circle btn-xs text-white/70 hover:bg-white/15 hover:text-white border-none">
						<Trash2 class="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		</div>

		<!-- Cart Items List -->
		<div class="custom-scrollbar bg-bg-app/10 flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
			<div
				v-if="cartItems.length === 0"
				class="flex h-full flex-col items-center justify-center text-center opacity-45 py-12">
				<ShoppingBag class="text-text-muted/60 mb-3 h-10 w-10" />
				<p class="text-text-muted text-xs font-bold tracking-wider uppercase">Carrito vacío</p>
				<p class="text-text-muted/70 mt-1 max-w-[180px] text-[10px]">Selecciona ítems del catálogo izquierdo para comenzar</p>
			</div>

			<div v-else class="flex flex-col gap-2">
				<div
					v-for="(item, index) in cartItems"
					:key="index"
					class="bg-bg-card border-border-default/80 group relative flex gap-3 overflow-hidden rounded-xl border p-3 shadow-[0_1px_2px_rgba(0,0,0,0.015)] transition-all hover:border-border-default">
					<!-- Item Details -->
					<div class="flex flex-1 flex-col justify-center">
						<div class="mb-2.5 flex items-start justify-between">
							<span class="pr-6 text-xs font-extrabold text-text-primary leading-tight line-clamp-2">{{ item.name }}</span>
							<button
								@click="emit('remove-item', index)"
								aria-label="Remove Item"
								class="text-text-muted/50 hover:text-error bg-bg-card absolute top-3 right-3 p-1 rounded-md opacity-0 transition-all group-hover:opacity-100 hover:bg-error/5">
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
						<div class="flex items-center justify-between mt-2">
							<div class="flex items-center gap-1.5">
								<button
									@click="item.quantity > 1 ? emit('decrease-item-qty', index) : emit('remove-item', index)"
									aria-label="Decrease Quantity"
									class="w-6 h-6 flex items-center justify-center rounded-lg bg-bg-muted hover:bg-border-default/60 text-text-primary text-xs font-extrabold transition-colors">
									-
								</button>
								<span class="w-6 text-center text-xs font-bold tabular-nums text-text-primary">
									{{ item.quantity }}
								</span>
								<button
									@click="emit('increase-item-qty', index)"
									aria-label="Increase Quantity"
									class="w-6 h-6 flex items-center justify-center rounded-lg bg-bg-muted hover:bg-border-default/60 text-text-primary text-xs font-extrabold transition-colors">
									+
								</button>
								<div v-if="item.applied_client_bonus_id" class="bg-success/15 text-success border border-success/30 px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase flex items-center gap-1">
									<Check class="w-3 h-3" /> Bono Aplicado ({{ item.quantity }} / {{ clientBonuses.find(b => b.client_bonus_id === item.applied_client_bonus_id)?.remaining_sessions || '?' }})
								</div>
							</div>
							<span class="text-xs font-black tabular-nums text-text-primary">
								{{ formatCurrency(item.applied_client_bonus_id ? 0 : item.unit_price * item.quantity) }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Checkout Footer -->
		<div class="bg-bg-card border-border-default/80 z-20 border-t p-5 pb-6 shadow-[0_-5px_15px_rgba(0,0,0,0.015)]">
			<!-- Totals -->
			<div class="mb-5 flex flex-col gap-2">
				<div class="text-text-muted flex items-center justify-between text-xs font-semibold uppercase">
					<span>Subtotal</span>
					<span class="tabular-nums font-bold text-text-primary">{{ formatCurrency(cartSubtotal) }}</span>
				</div>

				<div class="text-error flex items-center justify-between text-xs font-semibold uppercase">
					<span class="flex items-center gap-1">
						<Tag class="h-3 w-3" />
						<span>Descuento</span>
					</span>
					<div class="relative w-24">
						<span class="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-extrabold">-</span>
						<input
							v-model="discountAmount"
							type="number"
							min="0"
							:max="cartSubtotal"
							class="input input-xs bg-error/10 text-error h-7 w-full rounded-md border-none pr-2 text-right font-black tabular-nums focus:ring-0 focus:outline-none" />
					</div>
				</div>



				<div class="divider my-0.5 opacity-40"></div>
				<div class="flex items-end justify-between">
					<span class="text-text-muted text-[10px] font-black tracking-widest uppercase mb-1">Total a Pagar</span>
					<span class="text-text-primary text-3xl leading-none font-black tracking-tight tabular-nums">
						{{ formatCurrency(cartTotal) }}
					</span>
				</div>
			</div>

			<!-- Payment Methods -->
			<div class="mb-5 grid grid-cols-2 gap-1.5">
				<button
					class="btn border-border-default/80 flex h-auto items-center justify-start gap-3 rounded-xl border p-3.5 transition-all text-left group hover:border-text-primary/30 active:scale-[0.98]"
					:class="paymentMethod === 'card' ? 'bg-text-primary text-bg-card border-text-primary shadow-xs' : 'bg-bg-muted/40 text-text-muted hover:text-text-primary'"
					@click="paymentMethod = 'card'">
					<CreditCard class="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110" />
					<div class="flex flex-col">
						<span class="text-[10px] font-extrabold tracking-wider uppercase">Tarjeta</span>
						<span class="text-[8px] opacity-75 font-semibold mt-0.5">Pago físico</span>
					</div>
					<Check v-if="paymentMethod === 'card'" class="ml-auto h-3.5 w-3.5 shrink-0" />
				</button>

				<button
					class="btn border-border-default/80 flex h-auto items-center justify-start gap-3 rounded-xl border p-3.5 transition-all text-left group hover:border-text-primary/30 active:scale-[0.98]"
					:class="paymentMethod === 'cash' ? 'bg-text-primary text-bg-card border-text-primary shadow-xs' : 'bg-bg-muted/40 text-text-muted hover:text-text-primary'"
					@click="paymentMethod = 'cash'">
					<Banknote class="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110" />
					<div class="flex flex-col">
						<span class="text-[10px] font-extrabold tracking-wider uppercase">Efectivo</span>
						<span class="text-[8px] opacity-75 font-semibold mt-0.5">En caja</span>
					</div>
					<Check v-if="paymentMethod === 'cash'" class="ml-auto h-3.5 w-3.5 shrink-0" />
				</button>

				<button
					class="btn border-border-default/80 flex h-auto items-center justify-start gap-3 rounded-xl border p-3.5 transition-all text-left group hover:border-text-primary/30 active:scale-[0.98]"
					:class="paymentMethod === 'bizum' ? 'bg-text-primary text-bg-card border-text-primary shadow-xs' : 'bg-bg-muted/40 text-text-muted hover:text-text-primary'"
					@click="paymentMethod = 'bizum'">
					<Smartphone class="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110" />
					<div class="flex flex-col">
						<span class="text-[10px] font-extrabold tracking-wider uppercase">Bizum</span>
						<span class="text-[8px] opacity-75 font-semibold mt-0.5">Pago móvil</span>
					</div>
					<Check v-if="paymentMethod === 'bizum'" class="ml-auto h-3.5 w-3.5 shrink-0" />
				</button>

				<button
					class="btn border-border-default/80 flex h-auto items-center justify-start gap-3 rounded-xl border p-3.5 transition-all text-left group hover:border-text-primary/30 active:scale-[0.98]"
					:class="paymentMethod === 'transfer' ? 'bg-text-primary text-bg-card border-text-primary shadow-xs' : 'bg-bg-muted/40 text-text-muted hover:text-text-primary'"
					@click="paymentMethod = 'transfer'">
					<ArrowRightLeft class="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110" />
					<div class="flex flex-col">
						<span class="text-[10px] font-extrabold tracking-wider uppercase">Transf.</span>
						<span class="text-[8px] opacity-75 font-semibold mt-0.5">Bancaria</span>
					</div>
					<Check v-if="paymentMethod === 'transfer'" class="ml-auto h-3.5 w-3.5 shrink-0" />
				</button>

				<button
					class="btn border-border-default/80 flex h-auto items-center justify-start gap-3 rounded-xl border p-3.5 transition-all text-left group hover:border-text-primary/30 active:scale-[0.98]"
					:class="paymentMethod === 'mixed' ? 'bg-text-primary text-bg-card border-text-primary shadow-xs' : 'bg-bg-muted/40 text-text-muted hover:text-text-primary'"
					@click="paymentMethod = 'mixed'">
					<Wallet class="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110" />
					<div class="flex flex-col">
						<span class="text-[10px] font-extrabold tracking-wider uppercase">Mixto</span>
						<span class="text-[8px] opacity-75 font-semibold mt-0.5">Multitransac.</span>
					</div>
					<Check v-if="paymentMethod === 'mixed'" class="ml-auto h-3.5 w-3.5 shrink-0" />
				</button>

				<button
					class="btn flex h-auto items-center justify-start gap-3 rounded-xl border p-3.5 transition-all text-left group active:scale-[0.98]"
					:class="paymentMethod === 'debt' ? 'bg-error border-error text-white shadow-xs' : 'border-error/15 bg-error/5 text-error hover:bg-error/10'"
					@click="paymentMethod = 'debt'">
					<div class="h-4.5 w-4.5 flex items-center justify-center shrink-0 font-black text-xs font-mono">
						D
					</div>
					<div class="flex flex-col">
						<span class="text-[10px] font-extrabold tracking-wider uppercase">A Deber</span>
						<span class="text-[8px] opacity-75 font-semibold mt-0.5" :class="paymentMethod === 'debt' ? 'text-white/80' : 'text-error/80'">Deuda cliente</span>
					</div>
					<Check v-if="paymentMethod === 'debt'" class="ml-auto h-3.5 w-3.5 shrink-0 text-white" />
				</button>
			</div>

			<!-- Action -->
			<button
				@click="handleAttemptCheckout"
				:disabled="cartItems.length === 0 || isCheckingOut"
				class="btn h-14 w-full rounded-2xl border-none text-sm font-black tracking-widest uppercase shadow-md active:scale-[0.97] transition-all"
				:class="cartItems.length > 0 ? 'bg-text-primary hover:bg-text-primary/95 text-bg-card' : 'bg-bg-muted text-text-muted/60 opacity-50 cursor-not-allowed'">
				<span v-if="isCheckingOut" class="loading loading-spinner loading-sm"></span>
				<span v-else>Confirmar y Cobrar</span>
			</button>
		</div>
	</div>

	<!-- Last Session Confirmation Modal -->
	<div v-if="isConfirmingLastSession" class="fixed inset-0 z-200 flex items-center justify-center p-4 sm:p-0">
		<div class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="isConfirmingLastSession = false"></div>

		<div class="bg-bg-card shadow-3xl relative w-full max-w-sm transform overflow-hidden rounded-3xl p-6 transition-all sm:w-[400px]">
			<div class="mb-5 flex flex-col items-center text-center">
				<div class="bg-warning/20 text-warning mb-4 flex h-16 w-16 items-center justify-center rounded-full">
					<Tag class="h-8 w-8" />
				</div>
				<h3 class="text-text-primary text-xl font-black tracking-tight">Última Sesión</h3>
				<p class="text-text-muted mt-2 text-sm font-medium">
					Estás a punto de consumir la <strong class="text-text-primary">última sesión</strong> de uno de los bonos aplicados en este cobro. ¿Deseas continuar?
				</p>
			</div>

			<div class="flex gap-3">
				<button @click="isConfirmingLastSession = false" class="btn bg-bg-muted text-text-primary hover:bg-bg-muted/80 flex-1 rounded-xl border-none font-bold">
					Cancelar
				</button>
				<button @click="confirmLastSession" class="btn btn-warning text-warning-content hover:bg-warning/90 flex-1 rounded-xl border-none font-bold shadow-lg">
					Sí, Cobrar
				</button>
			</div>
		</div>
	</div>
</template>
