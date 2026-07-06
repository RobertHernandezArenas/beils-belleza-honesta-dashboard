<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface Props {
	filteredSalesLength: number
	itemsPerPage: number
	totalPages: number
}

defineProps<Props>()

const currentPage = defineModel<number>('currentPage', { required: true })
</script>

<template>
	<!-- Pagination Footer -->
	<div class="border-t border-border-default px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-bg-card">
		<span class="text-xs font-semibold text-text-muted">
			Mostrando <span class="text-text-primary font-bold">{{ filteredSalesLength > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0 }}</span> - <span class="text-text-primary font-bold">{{ Math.min(currentPage * itemsPerPage, filteredSalesLength) }}</span> de <span class="text-text-primary font-bold">{{ filteredSalesLength.toLocaleString() }}</span> resultados
		</span>
		<div class="flex gap-1">
			<button 
				@click="currentPage > 1 && currentPage--"
				:disabled="currentPage === 1"
				class="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-muted/80 border border-border-default/50 text-text-muted hover:text-text-primary disabled:opacity-40 disabled:hover:text-text-muted disabled:cursor-not-allowed transition-all"
				aria-label="Página anterior"
			>
				<ChevronLeft class="w-4 h-4" />
			</button>
			
			<template v-for="page in totalPages" :key="page">
				<button 
					v-if="page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)"
					@click="currentPage = page"
					:class="currentPage === page ? 'bg-text-primary text-white border-transparent shadow-sm' : 'bg-transparent text-text-secondary border-transparent hover:bg-bg-muted'"
					class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all border"
				>
					{{ page }}
				</button>
				<span v-else-if="page === currentPage - 2 || page === currentPage + 2" class="w-8 h-8 flex items-center justify-center text-text-muted/65 text-xs select-none">...</span>
			</template>

			<button 
				@click="currentPage < totalPages && currentPage++"
				:disabled="currentPage === totalPages || totalPages === 0"
				class="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-muted/80 border border-border-default/50 text-text-muted hover:text-text-primary disabled:opacity-40 disabled:hover:text-text-muted disabled:cursor-not-allowed transition-all"
				aria-label="Siguiente página"
			>
				<ChevronRight class="w-4 h-4" />
			</button>
		</div>
	</div>
</template>
