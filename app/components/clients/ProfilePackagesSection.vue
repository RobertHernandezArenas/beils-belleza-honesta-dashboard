<script setup lang="ts">
import { Package, AlertCircle, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
	client: { type: Object as PropType<any>, required: true }
})

// Mock or calculated active client packages (Individual vs Mixto)
const mockPackages = computed(() => {
	const items: any[] = []
	const bookingsCount = props.client.client_bookings?.length || 0
	
	items.push({
		id: 'pkg-indiba-01',
		name: 'Bono / Paquete Indiba Corporal (6 Sesiones)',
		type: 'INDIVIDUAL',
		category: 'Servicio Individual',
		totalSessions: 6,
		completedSessions: Math.min(6, Math.max(1, bookingsCount)),
		status: 'ACTIVE',
		expiryDate: '2026-12-31',
		serviceName: 'Tratamiento Indiba Corporal Pro'
	})

	items.push({
		id: 'pkg-mix-02',
		name: 'Pack Mixto Renovación Facial & Corporal',
		type: 'MIXTO',
		category: 'Paquete Mixto (Tratamiento + Producto)',
		totalSessions: 4,
		completedSessions: 2,
		status: 'ACTIVE',
		expiryDate: '2026-10-15',
		servicesIncluded: ['Limpieza Facial Profunda', 'Peeling Químico Renovador', 'Sérum Vitamina C']
	})

	return items
})

const getProgressPercentage = (completed: number, total: number) => {
	return Math.round((completed / total) * 100)
}
</script>

<template>
	<div class="space-y-8 transition-all duration-300">
		<div class="card bg-bg-card border border-border-default/80 shadow-md rounded-3xl p-6 lg:p-8 space-y-6">
			
			<!-- HEADER -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
				<div class="flex items-center gap-3">
					<div class="p-3 bg-primary/15 text-primary rounded-2xl">
						<Package class="w-6 h-6" />
					</div>
					<div>
						<h3 class="text-text-primary text-xl font-black tracking-tight flex items-center gap-2">
							Paquetes & Servicios Contratados
							<div class="tooltip tooltip-right z-50" data-tip="Panel de seguimiento de sesiones consumidas y pendientes en bonos o packs contratados.">
								<AlertCircle class="w-4 h-4 text-text-muted/60 cursor-help" />
							</div>
						</h3>
						<p class="text-text-muted text-xs font-semibold">Gestión y consumo de bonos/paquetes individuales y mixtos activos</p>
					</div>
				</div>

				<div class="badge badge-neutral font-black text-xs uppercase px-3 py-2">
					{{ mockPackages.length }} Paquetes Activos
				</div>
			</div>

			<!-- LIST OF PACKAGES -->
			<div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
				<div 
					v-for="pkg in mockPackages" 
					:key="pkg.id"
					class="bg-bg-muted/20 border border-border-subtle hover:border-primary/40 rounded-3xl p-6 space-y-5 transition-all shadow-xs flex flex-col justify-between"
				>
					<div class="space-y-3">
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-center gap-2">
								<div class="tooltip tooltip-bottom z-50" :data-tip="pkg.type === 'INDIVIDUAL' ? 'Paquete dedicado a un único tipo de servicio.' : 'Paquete combinado que agrupa varios tratamientos y/o productos.'">
									<span 
										class="badge badge-sm font-black text-[9px] uppercase px-2.5 py-1 border-none cursor-help"
										:class="pkg.type === 'INDIVIDUAL' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-700'"
									>
										{{ pkg.type === 'INDIVIDUAL' ? 'PAQUETE INDIVIDUAL' : 'PAQUETE MIXTO' }}
									</span>
								</div>
								<span class="text-[10px] text-text-muted font-bold">Vence: {{ pkg.expiryDate }}</span>
							</div>

							<span class="badge badge-success badge-sm font-black text-[9px] uppercase">
								ACTIVO
							</span>
						</div>

						<h4 class="text-text-primary text-base font-black leading-snug">{{ pkg.name }}</h4>

						<!-- PROGRESS BAR -->
						<div class="space-y-1.5 pt-2">
							<div class="flex items-center justify-between text-xs font-bold">
								<span class="text-text-muted flex items-center gap-1">
									Progreso de Sesiones:
									<div class="tooltip tooltip-top z-50" data-tip="Porcentaje de sesiones ya consumidas en el centro respecto al total contratado en el paquete.">
										<AlertCircle class="w-3 h-3 text-text-muted/60 cursor-help" />
									</div>
								</span>
								<span class="text-text-primary tabular-nums">{{ pkg.completedSessions }} de {{ pkg.totalSessions }} realizadas ({{ getProgressPercentage(pkg.completedSessions, pkg.totalSessions) }}%)</span>
							</div>
							<div class="w-full bg-bg-muted rounded-full h-2.5 overflow-hidden border border-border-subtle">
								<div 
									class="bg-text-primary h-full transition-all duration-500 rounded-full"
									:style="`width: ${getProgressPercentage(pkg.completedSessions, pkg.totalSessions)}%`"
								></div>
							</div>
						</div>

						<!-- INCLUDED SERVICES / ITEMS -->
						<div v-if="pkg.servicesIncluded" class="space-y-1 pt-2">
							<span class="text-[10px] font-black uppercase tracking-wider text-text-muted">Servicios & Productos Incluidos:</span>
							<div class="flex flex-wrap gap-1">
								<span v-for="s in pkg.servicesIncluded" :key="s" class="badge bg-bg-card text-text-primary font-bold text-[10px] border border-border-subtle">
									{{ s }}
								</span>
							</div>
						</div>
					</div>

					<div class="pt-4 border-t border-border-subtle flex items-center justify-between">
						<span class="text-xs font-semibold text-text-muted">
							Quedan <strong class="text-text-primary tabular-nums">{{ pkg.totalSessions - pkg.completedSessions }} sesiones</strong> disponibles
						</span>

						<button class="btn btn-ghost btn-xs font-bold text-primary">
							Ver Historial <ChevronRight class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			</div>

		</div>
	</div>
</template>

<style scoped>
</style>
