<script setup lang="ts">
	import { ref, computed, watch } from 'vue'
	import { useMutation } from '@tanstack/vue-query'
	import { CreditCard, X, Check, AlertCircle, Loader2 } from 'lucide-vue-next'
	import { useModalAnimation } from '~/composables/useModalAnimation'

	const props = defineProps<{
		modelValue: boolean
		totalAmount: number
		cartId?: string
	}>()

	const emit = defineEmits<{
		'update:modelValue': [value: boolean]
		'payment-success': [data: any]
		'payment-error': [error: string]
	}>()

	const localVisible = ref(props.modelValue)
	const stripeDialog = ref<HTMLDialogElement | null>(null)
	const { animateOpen, animateClose } = useModalAnimation()

	const selectedInstallments = ref(1)
	const apiError = ref('')

	const installmentOptions = [
		{ value: 1, label: '1 pago', description: 'Pago único' },
		{ value: 3, label: '3 cuotas', description: '3 pagos mensuales' },
		{ value: 4, label: '4 cuotas', description: '4 pagos mensuales' },
		{ value: 6, label: '6 cuotas', description: '6 pagos mensuales' },
	]

	watch(
		() => props.modelValue,
		newVal => {
			localVisible.value = newVal
			if (newVal) {
				selectedInstallments.value = 1
				apiError.value = ''
				nextTick(() => {
					animateOpen(stripeDialog.value, { staggerChildren: true })
				})
			} else if (stripeDialog.value?.open) {
				animateClose(stripeDialog.value)
			}
		},
	)

	watch(
		() => localVisible.value,
		newVal => {
			emit('update:modelValue', newVal)
		},
	)

	const amountPerInstallment = computed(() => {
		return Number((props.totalAmount / selectedInstallments.value).toFixed(2))
	})

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
	}

	const { mutate: createPayment, isPending } = useMutation({
		mutationFn: async () => {
			return await $fetch('/api/payments/create-intent', {
				method: 'POST',
				body: {
					amount: props.totalAmount,
					installments: selectedInstallments.value,
					cart_id: props.cartId || undefined,
					description: `Pago Beils — ${selectedInstallments.value} cuota(s)`,
				},
			})
		},
		onSuccess: (data: any) => {
			emit('payment-success', {
				...data,
				installments: selectedInstallments.value,
			})
			localVisible.value = false
		},
		onError: (err: any) => {
			apiError.value = err.response?._data?.statusMessage || err.message || 'Error al procesar el pago'
			emit('payment-error', apiError.value)
		},
	})

	const handleConfirm = () => {
		apiError.value = ''
		createPayment()
	}
</script>

<template>
	<dialog ref="stripeDialog" class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': localVisible }">
		<div class="modal-box bg-bg-app border-border-default m-4 max-w-lg border p-0 shadow-xl sm:rounded-3xl">
			<!-- Header -->
			<div
				class="bg-bg-card border-border-subtle flex items-center justify-between border-b p-6 sm:rounded-t-3xl">
				<div class="flex items-center gap-4">
					<div
						class="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
						<CreditCard class="h-6 w-6" />
					</div>
					<div>
						<h3 class="text-text-primary text-lg font-bold">Pago Fraccionado</h3>
						<p class="text-text-muted text-sm font-medium">Selecciona el número de cuotas</p>
					</div>
				</div>
				<button
					class="btn btn-ghost btn-circle btn-sm text-text-muted hover:text-text-primary"
					@click="localVisible = false"
					aria-label="Cerrar">
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Error Alert -->
			<div
				v-if="apiError"
				class="bg-error/10 border-error/20 mx-6 mt-6 flex items-start gap-3 rounded-xl border p-4">
				<AlertCircle class="text-error mt-0.5 h-5 w-5 shrink-0" />
				<p class="text-error text-sm font-medium">{{ apiError }}</p>
			</div>

			<!-- Content -->
			<div class="space-y-6 p-6">
				<!-- Total Amount -->
				<div class="bg-bg-muted rounded-2xl p-5 text-center">
					<p class="text-text-muted mb-1 text-xs font-bold tracking-wider uppercase">Total a Pagar</p>
					<p class="text-text-primary text-3xl font-black tracking-tight tabular-nums">
						{{ formatCurrency(totalAmount) }}
					</p>
				</div>

				<!-- Installment Options -->
				<div class="grid grid-cols-2 gap-3">
					<button
						v-for="option in installmentOptions"
						:key="option.value"
						class="flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all active:scale-95"
						:class="
							selectedInstallments === option.value
								? 'bg-primary/5 border-primary text-primary shadow-md'
								: 'bg-bg-card border-border-default text-text-muted hover:border-border-strong hover:bg-bg-muted'
						"
						@click="selectedInstallments = option.value">
						<span class="text-2xl font-black tabular-nums">{{ option.label.split(' ')[0] }}</span>
						<span class="text-[10px] font-bold tracking-wider uppercase">{{ option.description }}</span>

						<!-- Per installment amount -->
						<span
							v-if="option.value > 1"
							class="mt-1 rounded-full px-3 py-1 text-xs font-bold tabular-nums"
							:class="
								selectedInstallments === option.value
									? 'bg-primary/10 text-primary'
									: 'bg-bg-muted text-text-muted'
							">
							{{ formatCurrency(Number((totalAmount / option.value).toFixed(2))) }} / mes
						</span>

						<!-- Check mark for selected -->
						<div
							v-if="selectedInstallments === option.value"
							class="bg-primary absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white">
							<Check class="h-3 w-3" />
						</div>
					</button>
				</div>

				<!-- Installment Breakdown -->
				<div
					v-if="selectedInstallments > 1"
					class="bg-bg-card border-border-subtle space-y-3 rounded-2xl border p-5">
					<p class="text-text-muted text-xs font-bold tracking-wider uppercase">Desglose de Cuotas</p>
					<div
						v-for="i in selectedInstallments"
						:key="i"
						class="border-border-default flex items-center justify-between border-b py-2 last:border-0">
						<span class="text-text-secondary text-sm font-medium">
							Cuota {{ i }} de {{ selectedInstallments }}
						</span>
						<span class="text-text-primary text-sm font-bold tabular-nums">
							{{ formatCurrency(amountPerInstallment) }}
						</span>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="border-border-subtle flex gap-3 border-t p-6">
				<button
					class="btn btn-ghost hover:bg-bg-muted text-text-muted h-14 flex-1 rounded-xl border-transparent font-bold transition-colors"
					@click="localVisible = false"
					:disabled="isPending">
					Cancelar
				</button>
				<button
					class="btn bg-primary hover:bg-primary/90 flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-transparent text-white shadow-md transition-colors hover:shadow-lg"
					:disabled="isPending || totalAmount <= 0"
					@click="handleConfirm">
					<Loader2 v-if="isPending" class="h-5 w-5 animate-spin" />
					<template v-else>
						<CreditCard class="h-5 w-5" />
						<span class="font-bold tracking-wide">Pagar {{ formatCurrency(totalAmount) }}</span>
					</template>
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-black/40 backdrop-blur-sm">
			<button @click="localVisible = false">Cerrar</button>
		</form>
	</dialog>
</template>
