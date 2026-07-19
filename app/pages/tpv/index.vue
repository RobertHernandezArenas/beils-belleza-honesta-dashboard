<script setup lang="ts">
	import TpvCatalog from '~/components/tpv/TpvCatalog.vue'
	import TpvCart from '~/components/tpv/TpvCart.vue'
	import { useTpv } from '~/composables/useTpv'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Terminal de Venta (TPV) | Beils' })

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
		cartSubtotal,
		cartTotal,
		isCheckingOut,
		clientBonuses,

		addToCart,
		removeFromCart,
		clearCart,
		selectClient,
		handleCheckout,
		handleAvatarError,
		formatCurrency,
		displayToast,
		increaseItemQty,

	} = useTpv()
</script>

<template>
	<div class="bg-bg-app text-text-secondary flex h-dvh w-full flex-col overflow-hidden md:flex-row">
		<!-- LEFT SIDE: Catalog & Browser -->
		<TpvCatalog
			v-model:active-tab="activeTab"
			v-model:search-query="searchQuery"
			:filtered-catalog="filteredCatalog"
			:format-currency="formatCurrency"
			@add-to-cart="addToCart"
		/>

		<!-- RIGHT SIDE: Cart & Checkout -->
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
			:client-bonuses="clientBonuses"

			@select-client="selectClient"
			@remove-client="selectedClient = null"
			@remove-item="removeFromCart"
			@decrease-item-qty="(idx) => cartItems[idx].quantity > 1 ? cartItems[idx].quantity-- : removeFromCart(idx)"
			@increase-item-qty="increaseItemQty"
			@checkout="handleCheckout"
			@avatar-error="handleAvatarError"

		/>

		<!-- Toast -->
		<div v-if="showToast" class="toast toast-end toast-bottom z-100">
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
