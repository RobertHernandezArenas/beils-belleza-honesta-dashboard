<script setup lang="ts">
import { Search, Filter, Download, Calendar, CreditCard } from 'lucide-vue-next'

interface Props {
	hasFilteredSales: boolean
	isGeneratingPdf: boolean
}

defineProps<Props>()

const emit = defineEmits<{
	(e: 'download-csv'): void
	(e: 'download-pdf'): void
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
				<Search class="w-3.5 h-3.5 text-text-muted mr-2 shrink-0" />
				<input v-model="searchQuery" type="text" placeholder="Buscar ticket o cliente..." class="bg-transparent text-xs border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-full placeholder-text-muted/60 font-medium" />
			</div>
			<button class="w-10 h-10 bg-bg-card border border-border-default hover:border-text-primary/30 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-muted/40 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]" aria-label="Filtrar">
				<Filter class="w-3.5 h-3.5" />
			</button>
			<div class="dropdown dropdown-end relative z-30">
				<button
					tabindex="0"
					:disabled="!hasFilteredSales || isGeneratingPdf"
					class="w-10 h-10 bg-bg-card border border-border-default hover:border-text-primary/30 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-muted/40 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)] disabled:opacity-40"
				>
					<span v-if="isGeneratingPdf" class="loading loading-spinner loading-xs"></span>
					<Download v-else class="w-3.5 h-3.5" />
				</button>
				<ul tabindex="0" class="dropdown-content menu bg-bg-card text-text-secondary border-border-default mt-1.5 w-48 rounded-xl border p-2 shadow-lg">
					<li><button @click="emit('download-csv')" class="hover:bg-bg-muted font-bold text-xs px-3 py-2 rounded-lg text-left">Descargar CSV</button></li>
					<li><button @click="emit('download-pdf')" class="hover:bg-bg-muted font-bold text-xs px-3 py-2 rounded-lg text-left">Descargar PDF</button></li>
				</ul>
			</div>
		</div>
		<!-- Fila 2: Rango y Métodos de pago -->
		<div class="flex gap-2 w-full">
			<div class="flex-1 flex items-center bg-bg-card border border-border-default/85 rounded-xl px-2 h-10 shadow-[0_1px_2px_rgba(0,0,0,0.01)] overflow-hidden">
				<Calendar class="w-3.5 h-3.5 text-text-muted mx-1.5 shrink-0" />
				<div v-if="filterDateMode === 'single'" class="flex items-center w-full">
					<input v-model="filterDateSingle" type="date" class="bg-transparent text-xs font-semibold border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-full cursor-pointer" />
				</div>
				<div v-else class="flex items-center w-full justify-between pr-1">
					<input v-model="filterDateRange.start" type="date" class="bg-transparent text-[10px] font-semibold border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-[78px] cursor-pointer" />
					<span class="text-text-muted mx-1 text-xs font-bold">-</span>
					<input v-model="filterDateRange.end" type="date" class="bg-transparent text-[10px] font-semibold border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-[78px] cursor-pointer" />
				</div>
				<label class="cursor-pointer ml-1 flex items-center border-l border-border-default/85 pl-2 select-none shrink-0 pr-1">
					<input type="checkbox" class="checkbox checkbox-xs checkbox-primary rounded-[4px]" :checked="filterDateMode === 'range'" @change="filterDateMode = filterDateMode === 'range' ? 'single' : 'range'" />
				</label>
			</div>
			<div class="w-[45%] flex items-center bg-bg-card border border-border-default/85 rounded-xl px-3 h-10 shadow-[0_1px_2px_rgba(0,0,0,0.01)] relative">
				<CreditCard class="w-3.5 h-3.5 text-text-muted mr-2 shrink-0" />
				<select v-model="filterPaymentMethod" class="bg-transparent text-xs font-semibold border-none outline-none focus:ring-0 text-text-primary p-0 m-0 w-full cursor-pointer appearance-none">
					<option value="all">Métodos de pago</option>
					<option value="cash">Efectivo</option>
					<option value="card">Tarjeta</option>
					<option value="mixed">Mixto</option>
					<option value="transfer">Transferencia</option>
					<option value="stripe">Stripe</option>
				</select>
				<span class="absolute right-3.5 pointer-events-none text-text-muted/70 text-[10px]">▼</span>
			</div>
		</div>
	</div>
</template>
