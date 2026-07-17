<script setup lang="ts">
	import {
		Search,
		Plus,
		Package as PackageIcon,
		Scissors,
		Ticket,
	} from 'lucide-vue-next'
	import gsap from 'gsap'

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

	// GSAP Tab Animation
	const tabRefs = ref<Record<string, HTMLElement | null>>({})
	const activePill = ref<HTMLElement | null>(null)

	const setTabRef = (key: string) => (el: any) => {
		if (el) tabRefs.value[key] = el
	}

	const updateActivePill = (immediate = false) => {
		const el = tabRefs.value[activeTab.value]
		if (!el || !activePill.value) return

		const { offsetLeft, offsetWidth, offsetHeight } = el

		if (immediate) {
			gsap.set(activePill.value, { x: offsetLeft, width: offsetWidth, height: offsetHeight, opacity: 1 })
		} else {
			gsap.to(activePill.value, {
				x: offsetLeft,
				width: offsetWidth,
				height: offsetHeight,
				opacity: 1,
				duration: 0.25,
				ease: 'power2.out',
			})
		}
	}

	watch(activeTab, () => {
		nextTick(() => updateActivePill())
	})

	onMounted(() => {
		setTimeout(() => updateActivePill(true), 250)
	})
</script>

<template>
	<div class="flex flex-1 flex-col overflow-hidden px-4 pt-4 md:px-6 md:pt-6">
		<!-- Generic Header -->
		<div class="mb-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
			<div class="flex w-full items-center gap-3">
				<div class="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
					<Scissors class="h-5 w-5" />
				</div>
				<div class="flex-1">
					<h1 class="text-xl font-black tracking-wider uppercase font-sans">TERMINAL PUNTO DE VENTA (TPV)</h1>
					<p class="text-text-muted text-xs font-semibold uppercase tracking-wider">Añade productos y servicios para facturar</p>
				</div>
			</div>
		</div>

		<!-- TPV Search & Tabs -->
		<div class="mb-5 flex w-full flex-col gap-3 lg:flex-row lg:items-center">
			<div
				class="bg-white/40 border-border-default/85 relative flex w-full flex-1 flex-nowrap items-center gap-1 overflow-x-auto rounded-3xl border p-1 shadow-[0_1px_3px_rgba(0,0,0,0.015)] backdrop-blur-md"
				style="scrollbar-width: none; -ms-overflow-style: none">
				<!-- GSAP Active Pill Background -->
				<div
					ref="activePill"
					class="bg-text-primary absolute rounded-2xl opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.05)] pointer-events-none"
					style="z-index: 0"></div>

				<a
					class="tab relative z-10 flex h-auto min-h-[48px] flex-1 flex-col items-center justify-center rounded-2xl px-1 py-1.5 text-[9px] font-extrabold tracking-wider whitespace-nowrap uppercase transition-colors duration-300 active:scale-[0.97] sm:px-2 sm:text-[10px] md:text-xs"
					:ref="setTabRef('services')"
					:class="activeTab === 'services' ? 'text-bg-card scale-100' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/20 scale-95 hover:scale-100'"
					@click="activeTab = 'services'">
					<Scissors class="mb-0.5 h-4 w-4 shrink-0" />
					<span>Servicios</span>
				</a>
				<a
					class="tab relative z-10 flex h-auto min-h-[48px] flex-1 flex-col items-center justify-center rounded-2xl px-1 py-1.5 text-[9px] font-extrabold tracking-wider whitespace-nowrap uppercase transition-colors duration-300 active:scale-[0.97] sm:px-2 sm:text-[10px] md:text-xs"
					:ref="setTabRef('products')"
					:class="activeTab === 'products' ? 'text-bg-card scale-100' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/20 scale-95 hover:scale-100'"
					@click="activeTab = 'products'">
					<PackageIcon class="mb-0.5 h-4 w-4 shrink-0" />
					<span>Productos</span>
				</a>

				<a
					class="tab relative z-10 flex h-auto min-h-[48px] flex-1 flex-col items-center justify-center rounded-2xl px-1 py-1.5 text-[9px] font-extrabold tracking-wider whitespace-nowrap uppercase transition-colors duration-300 active:scale-[0.97] sm:px-2 sm:text-[10px] md:text-xs"
					:ref="setTabRef('bonuses')"
					:class="activeTab === 'bonuses' ? 'text-bg-card scale-100' : 'text-text-muted hover:text-text-primary hover:bg-bg-muted/20 scale-95 hover:scale-100'"
					@click="activeTab = 'bonuses'">
					<Ticket class="mb-0.5 h-4 w-4 shrink-0" />
					<span>Bonos</span>
				</a>
			</div>
			<div class="relative w-full shrink-0 lg:w-64 xl:w-80">
				<Search class="text-text-muted absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
				<input
					v-model="searchQuery"
					type="text"
					placeholder="Buscar en el catálogo..."
					class="input bg-white/50 border border-border-default/80 focus:border-primary/50 focus:bg-bg-card h-12 w-full rounded-2xl pr-4 pl-11 text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-all placeholder-text-muted/70 focus:ring-0" />
			</div>
		</div>

		<!-- Catalog Grid container (scrollable) -->
		<div class="custom-scrollbar -mx-2 flex-1 overflow-y-auto px-2 pt-1 pb-6">
			<div class="grid grid-cols-2 gap-3.5 border-transparent p-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
				<button
					v-for="item in filteredCatalog"
					:key="item.product_id || item.service_id || item.bonus_id"
					@click="emit('add-to-cart', item, activeTab === 'bonuses' ? 'bonus' : activeTab.slice(0, -1))"
					class="group bg-bg-card border-border-default hover:border-text-primary/30 relative flex h-32 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.015)] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)] active:scale-[0.97]">
					<div class="z-10 flex flex-col w-full">
						<span class="group-hover:text-primary line-clamp-2 text-xs font-extrabold text-text-primary leading-tight transition-colors">
							{{ item.name }}
						</span>
						<span
							v-if="item.sku || item.code"
							class="text-text-muted/70 mt-1 text-[9px] font-black tracking-widest uppercase font-mono">
							{{ item.sku || item.code }}
						</span>
					</div>

					<div class="z-10 mt-auto flex items-end justify-between w-full">
						<span class="text-sm font-black tabular-nums font-sans text-text-primary">{{ formatCurrency(item.price) }}</span>
						<div
							class="bg-bg-muted text-text-muted group-hover:bg-text-primary group-hover:text-bg-card flex h-7 w-7 items-center justify-center rounded-lg border border-border-default/40 transition-colors">
							<Plus class="h-3.5 w-3.5" />
						</div>
					</div>

					<!-- Background graphic hint -->
					<div class="absolute -right-3 -bottom-3 opacity-[0.03] transition-opacity group-hover:opacity-[0.06] pointer-events-none">
						<PackageIcon v-if="activeTab === 'products'" class="h-16 w-16" />
						<Scissors v-else-if="activeTab === 'services'" class="h-16 w-16" />

						<Ticket v-else class="h-16 w-16" />
					</div>
				</button>

				<div
					v-if="filteredCatalog.length === 0"
					class="col-span-full flex flex-col items-center py-20 text-center">
					<Search class="text-border-strong mb-3 h-8 w-8 opacity-40" />
					<p class="text-text-muted text-xs font-bold tracking-wider uppercase">No se encontraron ítems</p>
				</div>
			</div>
		</div>
	</div>
</template>
