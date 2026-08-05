<script setup lang="ts">
import type { ClientProfile, ClientPackage } from '~~/shared/types/domain'
import { Package as PackageIcon, AlertCircle, Scissors, ShoppingBag, Plus } from 'lucide-vue-next'
import AssignPackageModal from '~/components/packages/AssignPackageModal.vue'

const props = defineProps({
	client: { type: Object as PropType<ClientProfile>, required: true }
})

const assignModalRef = ref<InstanceType<typeof AssignPackageModal> | null>(null)

const openAssignModal = () => {
	assignModalRef.value?.openModal()
}

// Real active client packages from DB
const activePackages = computed(() => {
	if (!props.client.client_packages?.length) return []
	return (props.client.client_packages || []).map((cp: ClientPackage) => {
		const completed = cp.total_sessions - cp.remaining_sessions
		const expiryFormatted = cp.expiry_date ? new Date(cp.expiry_date).toISOString().split('T')[0] : 'Sin vencimiento'
		return {
			id: cp.client_package_id,
			name: cp.package?.name || 'Paquete / Bono',
			type: cp.package?.type || 'INDIVIDUAL',
			totalSessions: cp.total_sessions,
			completedSessions: Math.max(0, completed),
			remainingSessions: cp.remaining_sessions,
			status: cp.status,
			expiryDate: expiryFormatted,
			description: cp.package?.description,
			items: cp.items || []
		}
	})
})

const getProgressPercentage = (completed: number, total: number) => {
	if (!total) return 0
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
						<PackageIcon class="w-6 h-6" />
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

				<div class="flex items-center gap-3">
					<div class="badge badge-neutral font-black text-xs uppercase px-3 py-2">
						{{ activePackages.length }} Paquetes Activos
					</div>
					<button
						type="button"
						class="btn btn-primary btn-sm rounded-xl font-black uppercase text-xs shadow-sm flex items-center gap-1.5"
						@click="openAssignModal">
						<Plus class="w-4 h-4" />
						Asignar Bono
					</button>
				</div>
			</div>

			<!-- LIST OF PACKAGES -->
			<div v-if="activePackages.length > 0" class="grid grid-cols-1 xl:grid-cols-2 gap-6">
				<div 
					v-for="pkg in activePackages" 
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
								{{ pkg.status }}
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
								/>
							</div>
						</div>

						<!-- INCLUDED MIXED ITEMS BREAKDOWN -->
						<div v-if="pkg.items && pkg.items.length > 0" class="space-y-2 pt-3 border-t border-border-subtle/50">
							<span class="text-[10px] font-black uppercase tracking-wider text-text-muted">Desglose de Tratamientos y Productos:</span>
							<div class="grid grid-cols-1 gap-1.5">
								<div 
									v-for="it in pkg.items" 
									:key="it.client_package_item_id"
									class="flex items-center justify-between p-2 rounded-xl bg-bg-card border border-border-subtle text-xs"
								>
									<div class="flex items-center gap-2">
										<Scissors v-if="it.item_type === 'SERVICE'" class="w-3.5 h-3.5 text-primary shrink-0" />
										<ShoppingBag v-else class="w-3.5 h-3.5 text-amber-600 shrink-0" />
										<span class="font-bold text-text-primary text-[11px]">{{ it.name }}</span>
									</div>
									<span class="text-[10px] font-bold text-text-muted tabular-nums">
										Quedan <strong class="text-text-primary font-black">{{ it.quantity_remaining }}</strong> de {{ it.quantity_total }}
									</span>
								</div>
							</div>
						</div>
					</div>

					<div class="pt-4 border-t border-border-subtle flex items-center justify-between">
						<span class="text-xs font-semibold text-text-muted">
							Quedan <strong class="text-text-primary tabular-nums">{{ pkg.remainingSessions }} sesiones</strong> disponibles
						</span>
					</div>
				</div>
			</div>

			<div v-else class="py-12 flex flex-col items-center justify-center text-center text-text-muted opacity-60">
				<PackageIcon class="w-12 h-12 mb-2 stroke-[1.5]" />
				<p class="text-xs font-bold uppercase tracking-wider mb-3">El cliente no posee paquetes activos contratados</p>
				<button
					type="button"
					class="btn btn-primary btn-sm rounded-xl font-black uppercase text-xs shadow-sm flex items-center gap-1.5"
					@click="openAssignModal">
					<Plus class="w-4 h-4" />
					Asignar Primer Bono
				</button>
			</div>

		</div>

		<!-- Assign Package Modal -->
		<AssignPackageModal
			ref="assignModalRef"
			:client-id="props.client.user_id"
			:client-name="props.client.name + ' ' + (props.client.surname || '')"
		/>
	</div>
</template>
