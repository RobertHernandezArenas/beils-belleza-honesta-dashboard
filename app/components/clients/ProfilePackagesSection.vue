<script setup lang="ts">
import type { ClientProfile, ClientPackage } from '~~/shared/types/domain'
import {
	Package as PackageIcon,
	AlertCircle,
	Scissors,
	ShoppingBag,
	Plus,
	Calendar,
	SlidersHorizontal,
	Trash2,
	AlertTriangle
} from 'lucide-vue-next'
import { useQueryClient, useMutation } from '@tanstack/vue-query'
import AssignPackageModal from '~/components/packages/AssignPackageModal.vue'
import EditClientPackageModal from '~/components/packages/EditClientPackageModal.vue'

const props = defineProps({
	client: { type: Object as PropType<ClientProfile>, required: true }
})

const queryClient = useQueryClient()
const assignModalRef = ref<InstanceType<typeof AssignPackageModal> | null>(null)
const editModalRef = ref<InstanceType<typeof EditClientPackageModal> | null>(null)

const openAssignModal = () => {
	assignModalRef.value?.openModal()
}

const openEditModal = (pkg: ClientPackage) => {
	editModalRef.value?.openModal(pkg)
}

// Unassign State & Modal
const isUnassignModalOpen = ref(false)
const packageToUnassign = ref<{
	id: string
	name: string
	remainingSessions: number
} | null>(null)

const promptUnassign = (pkg: { id: string; name: string; remainingSessions: number }) => {
	packageToUnassign.value = pkg
	isUnassignModalOpen.value = true
}

const closeUnassignModal = () => {
	isUnassignModalOpen.value = false
	packageToUnassign.value = null
}

const { mutate: unassignPackage, isPending: isUnassigning } = useMutation({
	mutationFn: async () => {
		if (!packageToUnassign.value) return
		return await $fetch(`/api/clients/${props.client.user_id}/packages/${packageToUnassign.value.id}`, {
			method: 'DELETE'
		})
	},
	onSuccess: () => {
		queryClient.invalidateQueries({ queryKey: ['client', props.client.user_id] })
		queryClient.invalidateQueries({ queryKey: ['client-packages-agenda'] })
		closeUnassignModal()
	}
})

const executeUnassign = () => {
	unassignPackage()
}

// Real active client packages from DB
const activePackages = computed(() => {
	if (!props.client.client_packages?.length) return []
	return (props.client.client_packages || []).map((cp: ClientPackage) => {
		const completed = cp.total_sessions - cp.remaining_sessions
		const expiryFormatted = cp.expiry_date ? new Date(cp.expiry_date).toISOString().split('T')[0] : 'Sin vencimiento'
		const price = cp.custom_price !== null && cp.custom_price !== undefined ? cp.custom_price : (cp.package?.price ?? 0)
		const isCustomPrice = cp.custom_price !== null && cp.custom_price !== undefined && cp.package?.price !== undefined && cp.custom_price !== cp.package.price

		return {
			id: cp.client_package_id,
			name: cp.package?.name || 'Paquete / Bono',
			type: cp.package?.type || 'INDIVIDUAL',
			totalSessions: cp.total_sessions,
			completedSessions: Math.max(0, completed),
			remainingSessions: cp.remaining_sessions,
			status: cp.status,
			expiryDate: expiryFormatted,
			price,
			isCustomPrice,
			catalogPrice: cp.package?.price,
			description: cp.package?.description,
			items: cp.items || [],
			rawPackage: cp
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
						<PackageIcon class="size-6" />
					</div>
					<div>
						<h3 class="text-text-primary text-xl font-black tracking-tight flex items-center gap-2">
							Paquetes & Servicios Contratados
							<div class="tooltip tooltip-right z-50" data-tip="Panel de seguimiento de sesiones consumidas y pendientes en bonos o packs contratados.">
								<AlertCircle class="size-4 text-text-muted/60 cursor-help" />
							</div>
						</h3>
						<p class="text-text-muted text-xs font-semibold">Gestión, consumo y personalización de bonos individuales y mixtos</p>
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
						<Plus class="size-4" />
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
							<div class="flex flex-wrap items-center gap-2">
								<div class="tooltip tooltip-bottom z-50" :data-tip="pkg.type === 'INDIVIDUAL' ? 'Paquete dedicado a un único tipo de servicio.' : 'Paquete combinado que agrupa varios tratamientos y/o productos.'">
									<span 
										class="badge badge-sm font-black text-[9px] uppercase px-2.5 py-1 border-none cursor-help"
										:class="pkg.type === 'INDIVIDUAL' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-700'"
									>
										{{ pkg.type === 'INDIVIDUAL' ? 'PAQUETE INDIVIDUAL' : 'PAQUETE MIXTO' }}
									</span>
								</div>
								<span class="text-[10px] text-text-muted font-bold flex items-center gap-1">
									<Calendar class="size-3 text-text-muted/70" />
									Vence: {{ pkg.expiryDate }}
								</span>
							</div>

							<div class="flex items-center gap-2">
								<div class="tooltip tooltip-left z-50" :data-tip="pkg.isCustomPrice ? `Precio personalizado (Catálogo: ${pkg.catalogPrice} €)` : 'Precio del bono'">
									<span class="badge badge-sm font-mono font-black text-[10px] px-2 py-0.5" :class="pkg.isCustomPrice ? 'badge-primary' : 'badge-ghost border-border-subtle'">
										{{ pkg.price }} €
									</span>
								</div>
								<span class="badge badge-success badge-sm font-black text-[9px] uppercase">
									{{ pkg.status }}
								</span>
							</div>
						</div>

						<h4 class="text-text-primary text-base font-black leading-snug">{{ pkg.name }}</h4>

						<!-- PROGRESS BAR -->
						<div class="space-y-1.5 pt-2">
							<div class="flex items-center justify-between text-xs font-bold">
								<span class="text-text-muted flex items-center gap-1">
									Progreso de Sesiones:
									<div class="tooltip tooltip-top z-50" data-tip="Porcentaje de sesiones ya consumidas en el centro respecto al total contratado en el paquete.">
										<AlertCircle class="size-3 text-text-muted/60 cursor-help" />
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
										<Scissors v-if="it.item_type === 'SERVICE'" class="size-3.5 text-primary shrink-0" />
										<ShoppingBag v-else class="size-3.5 text-amber-600 shrink-0" />
										<span class="font-bold text-text-primary text-[11px]">{{ it.name }}</span>
									</div>
									<span class="text-[10px] font-bold text-text-muted tabular-nums">
										Quedan <strong class="text-text-primary font-black">{{ it.quantity_remaining }}</strong> de {{ it.quantity_total }}
									</span>
								</div>
							</div>
						</div>
					</div>

					<!-- FOOTER WITH ACTIONS -->
					<div class="pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<span class="text-xs font-semibold text-text-muted">
							Quedan <strong class="text-text-primary tabular-nums">{{ pkg.remainingSessions }} sesiones</strong> disponibles
						</span>

						<div class="flex items-center gap-2 self-end sm:self-auto">
							<button
								type="button"
								class="btn btn-ghost btn-xs rounded-xl font-bold text-text-muted hover:text-primary flex items-center gap-1.5 border border-border-subtle hover:border-primary/40"
								title="Personalizar precio, sesiones o caducidad"
								@click="openEditModal(pkg.rawPackage)"
							>
								<SlidersHorizontal class="size-3.5" />
								Personalizar
							</button>
							<button
								type="button"
								class="btn btn-ghost btn-xs rounded-xl font-bold text-error/80 hover:text-error hover:bg-error/10 flex items-center gap-1.5 border border-border-subtle hover:border-error/40"
								title="Desasignar este bono del cliente"
								@click="promptUnassign(pkg)"
							>
								<Trash2 class="size-3.5" />
								Desasignar
							</button>
						</div>
					</div>
				</div>
			</div>

			<div v-else class="py-12 flex flex-col items-center justify-center text-center text-text-muted opacity-60">
				<PackageIcon class="size-12 mb-2 stroke-[1.5]" />
				<p class="text-xs font-bold uppercase tracking-wider mb-3">El cliente no posee paquetes activos contratados</p>
				<button
					type="button"
					class="btn btn-primary btn-sm rounded-xl font-black uppercase text-xs shadow-sm flex items-center gap-1.5"
					@click="openAssignModal">
					<Plus class="size-4" />
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

		<!-- Edit / Customize Package Modal -->
		<EditClientPackageModal
			ref="editModalRef"
			:client-id="props.client.user_id"
			:client-name="props.client.name + ' ' + (props.client.surname || '')"
		/>

		<!-- Unassign Confirmation Modal -->
		<div v-if="isUnassignModalOpen && packageToUnassign" class="modal modal-open z-1000 backdrop-blur-sm bg-black/40">
			<div class="modal-box max-w-md bg-bg-card border border-border-default rounded-3xl p-6 shadow-2xl space-y-4">
				<div class="flex items-center gap-3">
					<div class="size-10 rounded-2xl bg-error/15 text-error flex items-center justify-center font-black">
						<AlertTriangle class="size-5" />
					</div>
					<div>
						<h3 class="text-base font-black text-text-primary uppercase tracking-wide">
							Desasignar Bono
						</h3>
						<p class="text-xs text-text-muted">
							Confirmar desasignación del bono
						</p>
					</div>
				</div>

				<div class="p-3.5 rounded-2xl bg-error/5 border border-error/20 text-xs text-text-muted space-y-2">
					<p>
						¿Estás seguro de que deseas desasignar el bono <strong class="text-text-primary">{{ packageToUnassign.name }}</strong> de <strong class="text-text-primary">{{ client.name }} {{ client.surname || '' }}</strong>?
					</p>
					<p class="text-[11px] text-error font-semibold">
						Esta acción eliminará el paquete del perfil del cliente junto con sus {{ packageToUnassign.remainingSessions }} sesiones pendientes.
					</p>
				</div>

				<div class="flex items-center justify-end gap-3 pt-2">
					<button type="button" class="btn btn-ghost rounded-xl text-xs uppercase font-bold" @click="closeUnassignModal">
						Cancelar
					</button>
					<button
						type="button"
						class="btn btn-error text-white rounded-xl font-black uppercase text-xs shadow-md"
						:disabled="isUnassigning"
						@click="executeUnassign"
					>
						<span v-if="isUnassigning" class="loading loading-spinner" />
						<span v-else>Sí, Desasignar Bono</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
