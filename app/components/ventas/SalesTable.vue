<script setup lang="ts">
import { ArrowUp, ArrowDown, ArrowUpDown, ShoppingBag, ExternalLink } from 'lucide-vue-next'

interface Props {
	paginatedSales: any[]
	isPending: boolean
	sortKey: 'id' | 'date' | 'payment_method' | 'total' | 'client'
	sortOrder: 'asc' | 'desc'
	getTicketDisplay: (sale: any) => string
	formatCustomDate: (dateString: string) => string
	getPaymentMethodBadge: (method: string) => { label: string; class: string }
	getTotalItems: (items: any[]) => number
	formatCurrency: (val: number) => string
}

defineProps<Props>()

const emit = defineEmits<{
	(e: 'open-details', sale: any): void
	(e: 'toggle-sort', key: 'id' | 'date' | 'payment_method' | 'total' | 'client'): void
}>()
</script>

<template>
	<div class="flex-1 overflow-auto w-full">
		<table class="w-full text-left min-w-[950px] border-collapse relative">
			<thead class="bg-bg-muted/30 sticky top-0 z-10 backdrop-blur-md border-b border-border-default">
				<tr class="text-[10px] font-extrabold text-text-muted tracking-widest uppercase select-none">
					<th class="py-4.5 pl-6 w-44 cursor-pointer hover:text-text-primary transition-colors" @click="emit('toggle-sort', 'id')">
						<div class="flex items-center gap-1.5">
							ID TICKET
							<ArrowUp v-if="sortKey === 'id' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-text-primary" />
							<ArrowDown v-else-if="sortKey === 'id' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-text-primary" />
							<ArrowUpDown v-else class="w-3 h-3 opacity-30" />
						</div>
					</th>
					<th class="py-4.5 px-4 cursor-pointer hover:text-text-primary transition-colors" @click="emit('toggle-sort', 'date')">
						<div class="flex items-center gap-1.5">
							FECHA Y HORA
							<ArrowUp v-if="sortKey === 'date' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-text-primary" />
							<ArrowDown v-else-if="sortKey === 'date' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-text-primary" />
							<ArrowUpDown v-else class="w-3 h-3 opacity-30" />
						</div>
					</th>
					<th class="py-4.5 px-4 cursor-pointer hover:text-text-primary transition-colors" @click="emit('toggle-sort', 'client')">
						<div class="flex items-center gap-1.5">
							CLIENTE
							<ArrowUp v-if="sortKey === 'client' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-text-primary" />
							<ArrowDown v-else-if="sortKey === 'client' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-text-primary" />
							<ArrowUpDown v-else class="w-3 h-3 opacity-30" />
						</div>
					</th>
					<th class="py-4.5 px-4">ARTÍCULOS</th>
					<th class="py-4.5 px-4 cursor-pointer hover:text-text-primary transition-colors text-center" @click="emit('toggle-sort', 'payment_method')">
						<div class="flex items-center justify-center gap-1.5">
							MÉTODO PAGO
							<ArrowUp v-if="sortKey === 'payment_method' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-text-primary" />
							<ArrowDown v-else-if="sortKey === 'payment_method' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-text-primary" />
							<ArrowUpDown v-else class="w-3 h-3 opacity-30" />
						</div>
					</th>
					<th class="py-4.5 px-4 cursor-pointer hover:text-text-primary transition-colors text-right" @click="emit('toggle-sort', 'total')">
						<div class="flex items-center justify-end gap-1.5">
							TOTAL
							<ArrowUp v-if="sortKey === 'total' && sortOrder === 'asc'" class="w-3.5 h-3.5 text-text-primary" />
							<ArrowDown v-else-if="sortKey === 'total' && sortOrder === 'desc'" class="w-3.5 h-3.5 text-text-primary" />
							<ArrowUpDown v-else class="w-3 h-3 opacity-30" />
						</div>
					</th>
					<th class="py-4.5 pr-6 text-center w-36">ACCIONES</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border-default/60 bg-bg-card">
				<tr v-for="sale in paginatedSales" :key="sale.cart_id" @click.stop.prevent="emit('open-details', sale)" class="hover:bg-neutral-50/70 transition-colors cursor-pointer group">
					<td class="py-4 pl-6">
						<div class="text-[11px] font-bold text-text-muted tracking-wider uppercase font-mono">
							{{ getTicketDisplay(sale) }}
						</div>
					</td>
					<td class="py-4 px-4 text-sm font-semibold text-text-muted tabular-nums">
						{{ formatCustomDate(sale.created_at) }}
					</td>
					<td class="py-4 px-4">
						<div class="flex items-center gap-3">
							<div class="w-8 h-8 rounded-full bg-[#1C1C1E] text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
								{{ sale.user ? `${sale.user.name?.charAt(0)}${sale.user.surname?.charAt(0)}` : 'CR' }}
							</div>
							<div class="flex flex-col">
								<span v-if="sale.user" class="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
									{{ sale.user.name }} <span class="font-medium text-text-secondary group-hover:text-primary transition-colors">{{ sale.user.surname }}</span>
								</span>
								<span v-else class="text-sm font-bold text-text-muted">
									Cliente No Registrado
								</span>
							</div>
						</div>
					</td>
					<td class="py-4 px-4">
						<span class="bg-bg-muted/80 text-text-secondary border border-border-default/70 text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider uppercase font-sans">
							{{ getTotalItems(sale.items) }} items
						</span>
					</td>
					<td class="py-4 px-4 text-center">
						<span class="text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border shadow-sm" :class="getPaymentMethodBadge(sale.payment_method).class">
							{{ getPaymentMethodBadge(sale.payment_method).label }}
						</span>
					</td>
					<td class="py-4 px-4 text-right">
						<div class="text-[15px] font-bold text-text-primary tabular-nums whitespace-nowrap font-sans">
							{{ formatCurrency(sale.total) }}
						</div>
					</td>
					<td class="py-4 pr-6">
						<button class="flex items-center justify-center gap-2 w-full text-text-primary hover:text-primary transition-colors bg-bg-muted/40 hover:bg-bg-muted px-3 py-1.5 rounded-lg border border-border-default/30 shadow-sm" aria-label="Ver Detalles">
							<ExternalLink class="w-3.5 h-3.5" />
							<span class="text-xs font-bold">Ver Detalles</span>
						</button>
					</td>
				</tr>
				
				<!-- Empty State rows -->
				<tr v-if="!paginatedSales.length && !isPending">
					<td colspan="7" class="py-20 text-center">
						<div class="flex flex-col items-center justify-center max-w-xs mx-auto">
							<div class="w-12 h-12 rounded-full bg-bg-muted/80 flex items-center justify-center mb-3">
								<ShoppingBag class="w-5 h-5 text-text-muted" />
							</div>
							<p class="text-text-primary font-bold text-sm mb-1">No se encontraron resultados</p>
							<p class="text-text-muted text-xs">Prueba ajustando los filtros de búsqueda o el rango de fechas.</p>
						</div>
					</td>
				</tr>
				
				<!-- Loading State rows -->
				<template v-if="isPending">
					<tr v-for="i in 5" :key="'loading-' + i">
						<td colspan="7" class="py-4.5 px-6">
							<div class="h-11 bg-bg-muted/40 animate-pulse rounded-xl w-full"></div>
						</td>
					</tr>
				</template>
			</tbody>
		</table>
	</div>
</template>
