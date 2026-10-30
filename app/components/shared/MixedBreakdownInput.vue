<script setup lang="ts">
import {
	BREAKDOWN_METHODS,
	breakdownDifference,
	breakdownFromAmounts,
	formatEuro,
	paymentMethodLabel,
} from '~~/shared/utils/payments'

const props = defineProps<{
	/** Amount the split has to add up to. */
	total: number
}>()

// One amount per method; the parent turns it into the breakdown it sends
const amounts = defineModel<Record<string, number | null>>({ required: true })

const difference = computed(() => breakdownDifference(breakdownFromAmounts(amounts.value), props.total))
</script>

<template>
	<div class="border-border-default/70 bg-bg-muted/20 mb-4 flex flex-col gap-2 rounded-xl border p-3">
		<div v-for="method in BREAKDOWN_METHODS" :key="method" class="flex items-center justify-between gap-3">
			<label :for="`mixed-${method}`" class="text-text-primary text-[11px] font-bold uppercase tracking-wider">
				{{ paymentMethodLabel(method) }}
			</label>
			<input
				:id="`mixed-${method}`"
				v-model.number="amounts[method]"
				type="number"
				min="0"
				step="0.01"
				placeholder="0,00"
				class="input input-sm border-border-default/70 bg-bg-card h-8 w-28 rounded-lg text-right font-black tabular-nums focus:outline-none" >
		</div>
		<p
			class="text-right text-[11px] font-black uppercase tracking-wider"
			:class="difference === 0 ? 'text-success' : 'text-error'">
			<template v-if="difference === 0">Cuadra con el total</template>
			<template v-else-if="difference > 0">Faltan {{ formatEuro(difference) }}</template>
			<template v-else>Sobran {{ formatEuro(-difference) }}</template>
		</p>
	</div>
</template>
