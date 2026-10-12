<script setup lang="ts">
import type { ClientPackage } from '~~/shared/types/domain'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { Sliders, X, Sparkles, Package, AlertCircle } from 'lucide-vue-next'
import AppSelect from '~/components/ui/AppSelect.vue'

const props = defineProps<{
	clientId: string
	clientName?: string
}>()

const emit = defineEmits(['updated'])

const isOpen = ref(false)
const clientPackage = ref<ClientPackage | null>(null)

const customPrice = ref<number>(0)
const totalSessions = ref<number>(1)
const remainingSessions = ref<number>(1)
const expiryType = ref<'date' | 'none'>('date')
const expiryDate = ref<string>('')
const status = ref<string>('ACTIVE')
const items = ref<Array<{
	client_package_item_id?: string
	name: string
	item_type: string
	quantity_total: number
	quantity_remaining: number
}>>([])

const queryClient = useQueryClient()

const { mutate: updatePackage, isPending: isUpdating } = useMutation({
	mutationFn: async () => {
		if (!props.clientId || !clientPackage.value) return
		const pkgId = clientPackage.value.client_package_id
		return await $fetch(`/api/clients/${props.clientId}/packages/${pkgId}`, {
			method: 'PUT',
			body: {
				custom_price: customPrice.value,
				total_sessions: totalSessions.value,
				remaining_sessions: remainingSessions.value,
				expiry_date: expiryType.value === 'none' ? null : (expiryDate.value ? new Date(expiryDate.value).toISOString() : null),
				status: status.value,
				items: items.value.map(it => ({
					client_package_item_id: it.client_package_item_id,
					quantity_total: it.quantity_total,
					quantity_remaining: it.quantity_remaining
				}))
			}
		})
	},
	onSuccess: () => {
		queryClient.invalidateQueries({ queryKey: ['client', props.clientId] })
		queryClient.invalidateQueries({ queryKey: ['client-packages-agenda'] })
		emit('updated')
		closeModal()
	}
})

const openModal = (pkg: ClientPackage) => {
	clientPackage.value = pkg
	customPrice.value = pkg.custom_price !== null && pkg.custom_price !== undefined ? pkg.custom_price : (pkg.package?.price ?? 0)
	totalSessions.value = pkg.total_sessions || 1
	remainingSessions.value = pkg.remaining_sessions ?? pkg.total_sessions ?? 1
	status.value = pkg.status || 'ACTIVE'

	if (pkg.expiry_date) {
		expiryType.value = 'date'
		expiryDate.value = new Date(pkg.expiry_date).toISOString().split('T')[0] || ''
	} else {
		expiryType.value = 'none'
		expiryDate.value = ''
	}

	if (pkg.items && pkg.items.length > 0) {
		items.value = pkg.items.map(it => ({
			client_package_item_id: it.client_package_item_id,
			name: it.name,
			item_type: it.item_type,
			quantity_total: it.quantity_total,
			quantity_remaining: it.quantity_remaining
		}))
	} else {
		items.value = []
	}

	isOpen.value = true
}

const closeModal = () => {
	isOpen.value = false
}

defineExpose({ openModal, closeModal })
</script>

<template>
	<div v-if="isOpen" class="modal modal-open z-1000 backdrop-blur-sm bg-black/40">
		<div class="modal-box max-w-lg bg-bg-card border border-border-default rounded-3xl p-6 shadow-2xl relative">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border-default pb-4">
				<div class="flex items-center gap-3">
					<div class="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
						<Sliders class="size-5" />
					</div>
					<div>
						<h3 class="text-lg font-black text-text-primary uppercase tracking-wide">
							Personalizar Bono Asignado
						</h3>
						<p class="text-xs text-text-muted">
							Modificar condiciones del bono de <span class="font-bold text-text-primary">{{ clientName || 'Cliente' }}</span>
						</p>
					</div>
				</div>
				<button type="button" class="btn btn-sm btn-ghost btn-circle text-text-muted hover:text-text-primary" @click="closeModal">
					<X class="size-4" />
				</button>
			</div>

			<!-- Body -->
			<form class="mt-4 space-y-4" @submit.prevent="() => updatePackage()">
				<!-- Package Summary Banner -->
				<div class="p-3.5 rounded-2xl border border-border-subtle bg-bg-muted/30 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="size-8 rounded-xl flex items-center justify-center font-bold text-xs" :class="clientPackage?.package?.type === 'MIXTO' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'">
							<Sparkles v-if="clientPackage?.package?.type === 'MIXTO'" class="size-4" />
							<Package v-else class="size-4" />
						</div>
						<div>
							<h4 class="text-xs font-black text-text-primary">{{ clientPackage?.package?.name || 'Bono' }}</h4>
							<p class="text-[10px] text-text-muted font-semibold">
								{{ clientPackage?.package?.type === 'MIXTO' ? 'Bono Mixto' : 'Bono Individual' }}
								<span v-if="clientPackage?.package?.price !== undefined"> • Catálogo: {{ clientPackage.package.price }} €</span>
							</p>
						</div>
					</div>
					<span class="badge badge-sm font-black text-[9px] uppercase" :class="status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'">
						{{ status }}
					</span>
				</div>

				<!-- Price & Status Row -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold uppercase text-text-muted mb-1">Precio Cobrado / Asignado (€)</label>
						<div class="relative">
							<input
								v-model.number="customPrice"
								type="number"
								step="0.01"
								min="0"
								required
								class="input input-bordered w-full rounded-2xl font-black text-text-primary pl-4 pr-8 text-sm"
							>
							<span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">€</span>
						</div>
						<p v-if="clientPackage?.package?.price !== undefined && customPrice !== clientPackage.package.price" class="text-[10px] text-primary font-bold mt-1">
							Precio personalizado (Catálogo: {{ clientPackage.package.price }} €)
						</p>
					</div>

					<div>
						<label class="block text-xs font-bold uppercase text-text-muted mb-1">Estado del Bono</label>
						<AppSelect
							v-model="status"
							aria-label="Estado del bono"
							:options="[
								{ value: 'ACTIVE', label: 'ACTIVO' },
								{ value: 'COMPLETED', label: 'COMPLETADO' },
								{ value: 'CANCELLED', label: 'CANCELADO' },
								{ value: 'EXPIRED', label: 'EXPIRADO' }
							]"
						/>
					</div>
				</div>

				<!-- Sessions Breakdown Row -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-bold uppercase text-text-muted mb-1">Total Sesiones Bono</label>
						<input
							v-model.number="totalSessions"
							type="number"
							step="1"
							min="0"
							required
							class="input input-bordered w-full rounded-2xl font-black text-text-primary text-sm"
						>
						<p class="text-[10px] text-text-muted font-medium mt-1">
							Número total contratado
						</p>
					</div>

					<div>
						<label class="block text-xs font-bold uppercase text-text-muted mb-1">Sesiones Restantes</label>
						<input
							v-model.number="remainingSessions"
							type="number"
							step="1"
							min="0"
							:max="totalSessions"
							required
							class="input input-bordered w-full rounded-2xl font-black text-text-primary text-sm"
						>
						<p class="text-[10px] text-text-muted font-medium mt-1">
							Disponibles para consumir
						</p>
					</div>
				</div>

				<!-- Expiry Date Settings -->
				<div class="space-y-2 pt-1 border-t border-border-subtle">
					<label class="block text-xs font-bold uppercase text-text-muted">Fecha de Caducidad / Vencimiento</label>
					<div class="flex items-center gap-3">
						<label class="label cursor-pointer gap-2 p-0">
							<input
								v-model="expiryType"
								type="radio"
								value="date"
								class="radio radio-primary radio-sm"
							>
							<span class="text-xs font-bold text-text-primary">Con fecha límite</span>
						</label>
						<label class="label cursor-pointer gap-2 p-0">
							<input
								v-model="expiryType"
								type="radio"
								value="none"
								class="radio radio-primary radio-sm"
							>
							<span class="text-xs font-bold text-text-primary">Sin caducidad</span>
						</label>
					</div>

					<div v-if="expiryType === 'date'">
						<input
							v-model="expiryDate"
							type="date"
							required
							class="input input-bordered w-full rounded-2xl font-semibold text-text-primary text-sm"
						>
					</div>
				</div>

				<!-- Detailed Items Breakdown for Mixed Packages -->
				<div v-if="items.length > 0" class="space-y-2 pt-2 border-t border-border-subtle">
					<span class="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
						Desglose de Sesiones por Servicio/Producto
						<div class="tooltip tooltip-right z-50" data-tip="Ajusta las cantidades restantes para cada servicio individual incluido en este bono mixto.">
							<AlertCircle class="size-3 text-text-muted/60 cursor-help" />
						</div>
					</span>
					<div class="space-y-2 max-h-36 overflow-y-auto pr-1">
						<div
							v-for="it in items"
							:key="it.client_package_item_id || it.name"
							class="p-2.5 rounded-2xl bg-bg-muted/40 border border-border-subtle flex items-center justify-between gap-3 text-xs"
						>
							<div class="truncate">
								<span class="font-bold text-text-primary block truncate">{{ it.name }}</span>
								<span class="text-[10px] text-text-muted font-medium uppercase">{{ it.item_type }}</span>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								<div class="flex items-center gap-1">
									<span class="text-[10px] text-text-muted font-bold">Quedan:</span>
									<input
										v-model.number="it.quantity_remaining"
										type="number"
										min="0"
										:max="it.quantity_total"
										class="input input-bordered input-xs w-14 rounded-lg text-center font-bold"
									>
								</div>
								<span class="text-[10px] text-text-muted font-bold">de</span>
								<input
									v-model.number="it.quantity_total"
									type="number"
									min="0"
									class="input input-bordered input-xs w-14 rounded-lg text-center font-bold"
								>
							</div>
						</div>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
					<button type="button" class="btn btn-ghost rounded-xl text-xs uppercase font-bold" @click="closeModal">
						Cancelar
					</button>
					<button type="submit" class="btn btn-primary rounded-xl font-black uppercase text-xs shadow-md" :disabled="isUpdating">
						<span v-if="isUpdating" class="loading loading-spinner"/>
						<span v-else>Guardar Cambios</span>
					</button>
				</div>
			</form>
		</div>
	</div>
</template>
