<script setup lang="ts">
	import {
		Search,
		Plus,
		Package as PackageIcon,
		Scissors,
		Ticket,
		X
	} from 'lucide-vue-next'

	interface Props {
		filteredCatalog: any[]
		formatCurrency: (val: number) => string
	}

	defineProps<Props>()

	const emit = defineEmits<{
		(e: 'add-to-cart', item: any, type: string): void
	}>()

	const activeTab = defineModel<'products' | 'services' | 'bonuses'>('activeTab', { required: true })
	const searchQuery = defineModel<string>('searchQuery', { required: true })

	// GPU Hardware-Accelerated Tab Pill Offset
	const activePillStyle = computed(() => {
		const index = activeTab.value === 'services' ? 0 : activeTab.value === 'products' ? 1 : 2
		return {
			transform: `translate3d(${index * 100}%, 0, 0)`,
		}
	})
</script>

<template>
	<div class="flex flex-1 flex-col overflow-hidden px-3 pt-3 sm:px-6 sm:pt-6">
		<!-- Header -->
		<div class="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
			<div>
				<h1 class="text-base font-black tracking-wider uppercase font-sans sm:text-lg">Catálogo TPV</h1>
				<p class="text-text-muted text-[11px] font-medium opacity-80">Selecciona productos, servicios o bonos para facturar</p>
			</div>
			<div class="badge bg-text-primary text-bg-card border-none shrink-0 px-3 py-2 text-[10px] font-extrabold whitespace-nowrap font-mono rounded-xl self-start sm:self-center">
				{{ filteredCatalog.length }} {{ filteredCatalog.length === 1 ? 'resultado' : 'resultados' }}
			</div>
		</div>

		<!-- TPV Search & Tabs -->
		<div class="mb-4 flex w-full flex-col gap-3 lg:flex-row lg:items-center">
			<!-- DaisyUI Segmented Tabs Container -->
			<div
				class="bg-white/60 border-border-default/80 relative flex w-full flex-1 flex-nowrap items-center rounded-2xl border p-1 shadow-xs backdrop-blur-md overflow-hidden">
				<!-- GPU Hardware-Accelerated Active Pill -->
				<div
					class="bg-text-primary absolute top-1 bottom-1 left-1 rounded-xl shadow-xs pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] w-[calc((100%-8px)/3)]"
					:style="activePillStyle"
					style="z-index: 0"></div>

				<button
					type="button"
					class="tab relative z-10 flex h-10 min-h-10 flex-1 items-center justify-center rounded-xl px-3 text-[10px] font-black tracking-wider uppercase transition-colors duration-200 sm:text-xs select-none"
					:class="activeTab === 'services' ? 'text-bg-card font-extrabold' : 'text-text-muted hover:text-text-primary'"
					@click="activeTab = 'services'">
					<span>Servicios</span>
				</button>
				<button
					type="button"
					class="tab relative z-10 flex h-10 min-h-10 flex-1 items-center justify-center rounded-xl px-3 text-[10px] font-black tracking-wider uppercase transition-colors duration-200 sm:text-xs select-none"
					:class="activeTab === 'products' ? 'text-bg-card font-extrabold' : 'text-text-muted hover:text-text-primary'"
					@click="activeTab = 'products'">
					<span>Productos</span>
				</button>
				<button
					type="button"
					class="tab relative z-10 flex h-10 min-h-10 flex-1 items-center justify-center rounded-xl px-3 text-[10px] font-black tracking-wider uppercase transition-colors duration-200 sm:text-xs select-none"
					:class="activeTab === 'bonuses' ? 'text-bg-card font-extrabold' : 'text-text-muted hover:text-text-primary'"
					@click="activeTab = 'bonuses'">
					<span>Bonos</span>
				</button>
			</div>

			<!-- Search Bar -->
			<div class="relative w-full shrink-0 lg:w-64 xl:w-80">
				<Search class="text-text-muted absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
				<input
					v-model="searchQuery"
					type="text"
					placeholder="Buscar en el catálogo..."
					class="input bg-white/70 border-border-default/80 focus:bg-bg-card focus:border-text-primary h-10 w-full rounded-2xl pr-8 pl-10 text-xs font-semibold shadow-xs transition-all placeholder:text-text-muted/60" />
				<button
					v-if="searchQuery"
					type="button"
					class="btn btn-ghost btn-xs btn-circle absolute top-1/2 right-2 -translate-y-1/2 text-text-muted hover:text-text-primary"
					@click="searchQuery = ''">
					<X class="h-3.5 w-3.5" />
				</button>
			</div>
		</div>

		<!-- Catalog Grid container (scrollable) -->
		<div class="custom-scrollbar -mx-2 flex-1 overflow-y-auto px-2 pt-1 pb-6">
			<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
				<button
					v-for="item in filteredCatalog"
					:key="item.product_id || item.service_id || item.bonus_id"
					type="button"
					@click="emit('add-to-cart', item, activeTab === 'bonuses' ? 'bonus' : activeTab.slice(0, -1))"
					class="group bg-bg-card border-border-default/80 hover:border-text-primary/40 relative flex h-28 sm:h-32 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-3 sm:p-4 text-left shadow-xs transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]">
					<div class="z-10 flex flex-col w-full">
						<span class="group-hover:text-primary line-clamp-2 text-xs font-bold text-text-primary leading-tight transition-colors">
							{{ item.name }}
						</span>
						<span
							v-if="item.sku || item.code"
							class="text-text-muted/70 mt-1 text-[9px] font-bold tracking-wider uppercase font-mono">
							{{ item.sku || item.code }}
						</span>
					</div>

					<div class="z-10 mt-auto flex items-end justify-between w-full">
						<span class="text-xs sm:text-sm font-black tabular-nums font-sans text-text-primary">
							{{ formatCurrency(item.price) }}
						</span>
						<div
							class="bg-bg-muted text-text-muted group-hover:bg-text-primary group-hover:text-bg-card flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg border border-border-default/40 transition-all duration-200">
							<Plus class="h-3.5 w-3.5" />
						</div>
					</div>

					<!-- Background graphic subtle icon -->
					<div class="absolute -right-2 -bottom-2 opacity-[0.03] transition-opacity group-hover:opacity-[0.07] pointer-events-none">
						<PackageIcon v-if="activeTab === 'products'" class="h-14 w-14 sm:h-16 sm:w-16" />
						<Scissors v-else-if="activeTab === 'services'" class="h-14 w-14 sm:h-16 sm:w-16" />
						<Ticket v-else class="h-14 w-14 sm:h-16 sm:w-16" />
					</div>
				</button>

				<!-- Empty State -->
				<div
					v-if="filteredCatalog.length === 0"
					class="col-span-full flex flex-col items-center justify-center py-16 text-center">
					<div class="bg-bg-muted/50 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
						<Search class="text-text-muted h-6 w-6 opacity-40" />
					</div>
					<p class="text-text-primary text-xs font-bold uppercase tracking-wider">No hay elementos en esta categoría</p>
					<p class="text-text-muted mt-1 text-[11px]">Intenta cambiar el término de búsqueda o la pestaña</p>
				</div>
			</div>
		</div>
	</div>
</template>
