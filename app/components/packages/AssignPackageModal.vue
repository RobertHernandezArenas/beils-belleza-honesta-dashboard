<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { Package, X, Check, Calendar, Sparkles } from 'lucide-vue-next'

const props = defineProps<{
	clientId: string
	clientName?: string
}>()

const emit = defineEmits(['assigned'])

const isOpen = ref(false)
const selectedPackageId = ref<string>('')
const expiryMonths = ref<number>(6)

const { data: catalogPackages, isPending: isLoadingPackages } = useQuery<any[]>({
	queryKey: ['packages'],
	queryFn: () => $fetch('/api/packages')
})

const queryClient = useQueryClient()

const { mutate: assignPackage, isPending: isAssigning } = useMutation({
	mutationFn: async () => {
		if (!props.clientId || !selectedPackageId.value) return
		return await $fetch(`/api/clients/${props.clientId}/packages`, {
			method: 'POST',
			body: {
				package_id: selectedPackageId.value,
				expiry_months: expiryMonths.value
			}
		})
	},
	onSuccess: () => {
		queryClient.invalidateQueries({ queryKey: ['client', props.clientId] })
		queryClient.invalidateQueries({ queryKey: ['client-packages-agenda'] })
		emit('assigned')
		closeModal()
	}
})

const openModal = () => {
	selectedPackageId.value = ''
	expiryMonths.value = 6
	isOpen.value = true
}

const closeModal = () => {
	isOpen.value = false
}

defineExpose({ openModal, closeModal })
</script>

<template>
	<div v-if="isOpen" class="modal modal-open z-50 backdrop-blur-sm bg-black/40">
		<div class="modal-box max-w-lg bg-bg-card border border-border-default rounded-3xl p-6 shadow-2xl relative">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border-default pb-4">
				<div class="flex items-center gap-3">
					<div class="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
						<Package class="h-5 w-5" />
					</div>
					<div>
						<h3 class="text-lg font-black text-text-primary uppercase tracking-wide">
							Asignar / Vender Bono
						</h3>
						<p class="text-xs text-text-muted">
							Asignar paquete de sesiones a <span class="font-bold text-text-primary">{{ clientName || 'Cliente' }}</span>
						</p>
					</div>
				</div>
				<button class="btn btn-sm btn-ghost btn-circle text-text-muted hover:text-text-primary" @click="closeModal">
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Body -->
			<form @submit.prevent="assignPackage" class="mt-4 space-y-4">
				<!-- Package Selector -->
				<div>
					<label class="block text-xs font-bold uppercase text-text-muted mb-2">Selecciona un Paquete del Catálogo</label>
					
					<div v-if="isLoadingPackages" class="flex justify-center py-6">
						<span class="loading loading-spinner text-primary"></span>
					</div>

					<div v-else-if="!catalogPackages || catalogPackages.length === 0" class="text-center py-6 text-xs text-text-muted border border-dashed border-border-default rounded-2xl">
						No hay bonos creados en el catálogo. Crea uno primero en la sección de Servicios/Catálogo.
					</div>

					<div v-else class="space-y-2.5 max-h-60 overflow-y-auto pr-1">
						<div
							v-for="pkg in catalogPackages"
							:key="pkg.package_id"
							class="p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between"
							:class="selectedPackageId === pkg.package_id ? 'border-primary bg-primary/10 shadow-xs' : 'border-border-default bg-bg-muted/40 hover:bg-bg-muted'"
							@click="selectedPackageId = pkg.package_id">
							<div class="flex items-center gap-3">
								<div class="h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs" :class="pkg.type === 'MIXTO' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'">
									<Sparkles v-if="pkg.type === 'MIXTO'" class="h-4 w-4" />
									<Package v-else class="h-4 w-4" />
								</div>
								<div>
									<h4 class="text-xs font-black text-text-primary">{{ pkg.name }}</h4>
									<p class="text-[10px] text-text-muted font-medium">
										{{ pkg.type === 'MIXTO' ? 'Bono Mixto' : 'Bono Individual' }} • {{ pkg.total_sessions }} sesiones
									</p>
								</div>
							</div>
							<div class="flex items-center gap-3">
								<span class="text-xs font-mono font-black text-text-primary">{{ pkg.price }} €</span>
								<div class="h-5 w-5 rounded-full border border-border-default flex items-center justify-center" :class="selectedPackageId === pkg.package_id ? 'bg-primary border-primary text-white' : ''">
									<Check v-if="selectedPackageId === pkg.package_id" class="h-3 w-3 stroke-[3]" />
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Expiry Months -->
				<div>
					<label class="block text-xs font-bold uppercase text-text-muted mb-1">Validez (Meses)</label>
					<select v-model.number="expiryMonths" class="select select-bordered w-full rounded-xl bg-bg-muted text-text-primary text-xs font-bold">
						<option :value="3">3 meses</option>
						<option :value="6">6 meses (Recomendado)</option>
						<option :value="12">12 meses (1 Año)</option>
						<option :value="24">24 meses (2 Años)</option>
					</select>
				</div>

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
					<button type="button" class="btn btn-ghost rounded-xl text-xs uppercase font-bold" @click="closeModal">
						Cancelar
					</button>
					<button type="submit" class="btn btn-primary rounded-xl font-black uppercase text-xs shadow-md" :disabled="isAssigning || !selectedPackageId">
						<span v-if="isAssigning" class="loading loading-spinner"></span>
						<span v-else>Confirmar Asignación</span>
					</button>
				</div>
			</form>
		</div>
	</div>
</template>
