<script setup lang="ts">
import { Search, Download, Calendar, CreditCard, SlidersHorizontal, FileSpreadsheet, FileDown } from 'lucide-vue-next'
import AppSelect from '~/components/ui/AppSelect.vue'

interface Props {
	hasFilteredSales: boolean
	isGeneratingPdf: boolean
}

defineProps<Props>()

const paymentMethodOptions = [
	{ value: 'all', label: 'Métodos de pago' },
	{ value: 'cash', label: 'Efectivo' },
	{ value: 'card', label: 'Tarjeta' },
	{ value: 'mixed', label: 'Mixto' },
	{ value: 'transfer', label: 'Transferencia' },
	{ value: 'stripe', label: 'Stripe' },
]

const emit = defineEmits<{
	(e: 'download-csv' | 'download-pdf' | 'open-export'): void
}>()

const searchQuery = defineModel<string>('searchQuery', { required: true })
const filterDateMode = defineModel<'single' | 'range'>('filterDateMode', { required: true })
const filterDateSingle = defineModel<string>('filterDateSingle', { required: true })
const filterDateRange = defineModel<{ start: string; end: string }>('filterDateRange', { required: true })
const filterPaymentMethod = defineModel<string>('filterPaymentMethod', { required: true })
</script>

<template>
	<!-- FILTERS (Right Side) -->
	<div class="flex flex-col gap-3 w-full xl:w-[33%] bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.015)] justify-center">
		<!-- Fila 1: Búsqueda, Filtro, Descarga -->
		<div class="flex gap-2 w-full">
			<div class="flex-1 flex items-center bg-bg-card border border-border-default/85 focus-within:border-text-primary/45 rounded-xl px-3 h-10 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
				<Search class="size-3.5 text-text-muted mr-2 shrink-0" />
				<input v-model="searchQuery" type="text" placeholder="Buscar ticket o cliente..." class="bg-transparent text-xs border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-full placeholder-text-muted/60 font-medium" >
			</div>
			<button
				type="button"
				class="size-10 bg-bg-card border border-border-default hover:border-text-primary/30 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-muted/40 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)] cursor-pointer"
				aria-label="Abrir opciones de exportación"
				title="Opciones de exportación"
				@click="emit('open-export')"
			>
				<SlidersHorizontal class="size-3.5" />
			</button>
			<div class="dropdown dropdown-end relative z-30">
				<button
					tabindex="0"
					:disabled="!hasFilteredSales || isGeneratingPdf"
					class="size-10 bg-bg-card border border-border-default hover:border-text-primary/30 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-muted/40 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)] disabled:opacity-40 cursor-pointer"
					aria-label="Exportar ventas"
					title="Exportar ventas"
					@click="emit('open-export')"
				>
					<span v-if="isGeneratingPdf" class="loading loading-spinner loading-xs"/>
					<Download v-else class="size-3.5" />
				</button>
				<ul tabindex="0" class="dropdown-content menu bg-bg-card text-text-secondary border-border-default mt-1.5 w-56 rounded-2xl border p-2 shadow-xl z-50">
					<li>
						<button class="hover:bg-[#922c88]/10 text-[#922c88] font-black text-xs px-3 py-2.5 rounded-xl flex items-center gap-2 text-left" @click="emit('open-export')">
							<SlidersHorizontal class="size-3.5" />
							<span>Opciones de exportación...</span>
						</button>
					</li>
					<div class="divider my-1 border-border-default/60" />
					<li>
						<button class="hover:bg-bg-muted font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-2 text-left text-text-secondary" @click="emit('download-csv')">
							<FileSpreadsheet class="size-3.5 text-emerald-600" />
							<span>Descarga directa CSV</span>
						</button>
					</li>
					<li>
						<button class="hover:bg-bg-muted font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-2 text-left text-text-secondary" @click="emit('download-pdf')">
							<FileDown class="size-3.5 text-[#922c88]" />
							<span>Descarga directa PDF</span>
						</button>
					</li>
				</ul>
			</div>
		</div>
		<!-- Fila 2: Rango y Métodos de pago -->
		<div class="flex gap-2 w-full">
			<div class="flex-1 flex items-center bg-bg-card border border-border-default/85 rounded-xl px-2 h-10 shadow-[0_1px_2px_rgba(0,0,0,0.01)] overflow-hidden">
				<Calendar class="size-3.5 text-text-muted mx-1.5 shrink-0" />
				<div v-if="filterDateMode === 'single'" class="flex items-center w-full">
					<input v-model="filterDateSingle" type="date" class="bg-transparent text-xs font-semibold border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-full cursor-pointer" >
				</div>
				<div v-else class="flex items-center w-full justify-between pr-1">
					<input v-model="filterDateRange.start" type="date" class="bg-transparent text-[10px] font-semibold border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-19.5 cursor-pointer" >
					<span class="text-text-muted mx-1 text-xs font-bold">-</span>
					<input v-model="filterDateRange.end" type="date" class="bg-transparent text-[10px] font-semibold border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-19.5 cursor-pointer" >
				</div>
				<label class="cursor-pointer ml-1 flex items-center border-l border-border-default/85 pl-2 select-none shrink-0 pr-1" title="Alternar entre fecha única o rango de fechas">
					<input type="checkbox" class="checkbox checkbox-xs checkbox-primary rounded-sm" :checked="filterDateMode === 'range'" @change="filterDateMode = filterDateMode === 'range' ? 'single' : 'range'" >
				</label>
			</div>
			<div class="w-[45%]">
				<AppSelect
					v-model="filterPaymentMethod"
					aria-label="Filtrar por método de pago"
					:options="paymentMethodOptions">
					<template #icon>
						<CreditCard class="size-3.5" />
					</template>
				</AppSelect>
			</div>
		</div>
	</div>
</template>
