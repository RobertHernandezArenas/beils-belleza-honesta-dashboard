<script setup lang="ts">
	import TpvCatalog from '~/components/tpv/TpvCatalog.vue'
	import TpvCart from '~/components/tpv/TpvCart.vue'
	import { useTpv } from '~/composables/useTpv'
	import { ShoppingBag, ArrowRight, LayoutGrid } from 'lucide-vue-next'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Terminal Punto de Venta (TPV) | Beils' })

	const {
		activeTab,
		searchQuery,
		clientSearch,
		cartItems,
		selectedClient,
		discountAmount,
		paymentMethod,
		toastMessage,
		toastType,
		showToast,
		avatarError,
		filteredCatalog,
		filteredClients,
		clientPackages,
		cartSubtotal,
		cartTotal,
		isCheckingOut,

		addToCart,
		consumeClientPackage,
		removeFromCart,
		clearCart,
		selectClient,
		handleCheckout,
		handleAvatarError,
		formatCurrency,
		displayToast,
		increaseItemQty,
	} = useTpv()

	// Mobile navigation tab: 'catalog' | 'cart'
	const mobileTab = ref<'catalog' | 'cart'>('catalog')

	const totalCartCount = computed(() =>
		cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
	)

	const handleAddToCartAndNotify = (item: any, type: string) => {
		addToCart(item, type)
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary flex h-full w-full flex-col overflow-hidden md:flex-row">
		<!-- MOBILE TOP NAVIGATION SWITCHER (< md) -->
		<div class="bg-bg-card/95 border-border-default/80 flex shrink-0 items-center justify-between border-b px-4 py-2.5 backdrop-blur-md md:hidden z-30 shadow-xs">
			<div class="flex items-center gap-2">
				<div class="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg font-black text-xs">
					TPV
				</div>
				<span class="text-text-primary text-xs font-black uppercase tracking-wider">Terminal de Venta</span>
			</div>

			<!-- Mobile Segmented Capsule Switcher -->
			<div class="border-border-default/70 bg-bg-muted/60 flex items-center gap-1 rounded-full border p-1">
				<button
					type="button"
					class="flex items-center justify-center rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase transition-all duration-200 select-none"
					:class="mobileTab === 'catalog' ? 'bg-text-primary text-bg-card shadow-xs' : 'bg-transparent text-text-muted hover:text-text-primary'"
					@click="mobileTab = 'catalog'">
					<LayoutGrid class="h-3 w-3 mr-1" />
					Catálogo
				</button>
				<button
					type="button"
					class="flex items-center justify-center rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase transition-all duration-200 select-none relative"
					:class="mobileTab === 'cart' ? 'bg-text-primary text-bg-card shadow-xs' : 'bg-transparent text-text-muted hover:text-text-primary'"
					@click="mobileTab = 'cart'">
					<ShoppingBag class="h-3 w-3 mr-1" />
					Carrito
					<span
						v-if="totalCartCount > 0"
						class="badge badge-primary badge-xs ml-1 font-mono font-bold">
						{{ totalCartCount }}
					</span>
				</button>
			</div>
		</div>

		<!-- CATALOG SECTION -->
		<div
			class="flex-1 flex-col overflow-hidden transition-all duration-300"
			:class="[mobileTab === 'catalog' ? 'flex' : 'hidden md:flex']">
			<TpvCatalog
				v-model:active-tab="activeTab"
				v-model:search-query="searchQuery"
				:filtered-catalog="filteredCatalog"
				:format-currency="formatCurrency"
				:client-packages="clientPackages"
				:selected-client="selectedClient"
				@add-to-cart="handleAddToCartAndNotify"
				@consume-package="consumeClientPackage"
			/>
		</div>

		<!-- CART SECTION -->
		<div
			class="flex-1 flex-col overflow-hidden transition-all duration-300 md:w-95 lg:w-105 xl:w-115 md:flex-none"
			:class="[mobileTab === 'cart' ? 'flex' : 'hidden md:flex']">
			<TpvCart
				v-model:client-search="clientSearch"
				v-model:discount-amount="discountAmount"
				v-model:payment-method="paymentMethod"

				:cart-items="cartItems"
				:selected-client="selectedClient"
				:filtered-clients="filteredClients"
				:cart-subtotal="cartSubtotal"
				:cart-total="cartTotal"
				:is-checking-out="isCheckingOut"
				:avatar-error="avatarError"
				:format-currency="formatCurrency"

				@select-client="selectClient"
				@remove-client="selectedClient = null"
				@remove-item="removeFromCart"
				@decrease-item-qty="(idx) => cartItems[idx].quantity > 1 ? cartItems[idx].quantity-- : removeFromCart(idx)"
				@increase-item-qty="increaseItemQty"
				@checkout="handleCheckout"
				@avatar-error="handleAvatarError"
			/>
		</div>

		<!-- MOBILE FLOATING ACTION BAR (Only visible in catalog view when cart has items) -->
		<div
			v-if="mobileTab === 'catalog' && cartItems.length > 0"
			class="bg-text-primary text-bg-card border-border-default/20 fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between rounded-2xl p-3.5 shadow-2xl backdrop-blur-lg md:hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
			@click="mobileTab = 'cart'">
			<div class="flex items-center gap-3">
				<div class="bg-bg-card/10 flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs font-black">
					{{ totalCartCount }}
				</div>
				<div class="flex flex-col">
					<span class="text-[10px] font-black tracking-widest uppercase opacity-70">Total Carrito</span>
					<span class="text-base font-black tabular-nums">{{ formatCurrency(cartTotal) }}</span>
				</div>
			</div>
			<button class="btn btn-sm bg-bg-card text-text-primary hover:bg-bg-card/90 border-none rounded-xl font-extrabold uppercase text-[11px] flex items-center gap-1.5 shadow-sm">
				Ver Ticket
				<ArrowRight class="h-3.5 w-3.5" />
			</button>
		</div>

		<!-- Toast -->
		<div v-if="showToast" class="toast toast-end toast-bottom z-100">
			<div
				:class="[
					'alert rounded-2xl border-none text-white shadow-lg font-bold text-xs',
					toastType === 'success' ? 'bg-emerald-600' : 'bg-rose-600',
				]">
				<span>{{ toastMessage }}</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
	:global(body) {
		overflow: hidden;
	}
</style>
