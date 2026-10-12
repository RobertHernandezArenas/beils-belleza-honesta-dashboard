<script setup lang="ts">
import type { CatalogItem } from '~~/shared/types/domain'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { Package, X, Check, Sparkles, SlidersHorizontal } from 'lucide-vue-next'
import AppSelect from '~/components/ui/AppSelect.vue'

const props = defineProps<{
	clientId: string
	clientName?: string
}>()

const emit = defineEmits(['assigned'])

const isOpen = ref(false)
const selectedPackageId = ref<string>('')
const customPrice = ref<number>(0)
const customTotalSessions = ref<number>(1)
const expiryOption = ref<string>('6')
const customExpiryDate = ref<string>('')

const { data: catalogPackages, isPending: isLoadingPackages } = useQuery<CatalogItem[]>({
	queryKey: ['packages'],
	queryFn: () => $fetch('/api/packages')
})

const selectedPkg = computed(() => {
	if (!catalogPackages.value || !selectedPackageId.value) return null
	return catalogPackages.value.find(p => p.package_id === selectedPackageId.value) || null
})

watch(selectedPkg, (pkg) => {
	if (pkg) {
		customPrice.value = pkg.price ?? 0
		customTotalSessions.value = pkg.total_sessions ?? 1
	}
})

const queryClient = useQueryClient()

const { mutate: assignPackage, isPending: isAssigning } = useMutation({
	mutationFn: async () => {
		if (!props.clientId || !selectedPackageId.value) return

		const expiry_months = expiryOption.value === 'custom' ? undefined : (expiryOption.value === 'none' ? null : Number(expiryOption.value))
		const expiry_date = expiryOption.value === 'custom' ? customExpiryDate.value : undefined

		return await $fetch(`/api/clients/${props.clientId}/packages`, {
			method: 'POST',
			body: {
				package_id: selectedPackageId.value,
				expiry_months,
				expiry_date,
				custom_price: customPrice.value,
				total_sessions: customTotalSessions.value
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
	expiryOption.value = '6'
	customExpiryDate.value = ''
	customPrice.value = 0
	customTotalSessions.value = 1
	isOpen.value = true
}

const closeModal = () => {
	isOpen.value = false
}

defineExpose({ openModal, closeModal })
</script>

<template>
	<div v-if="isOpen" class="modal modal-open z-1000 backdrop-blur-sm bg-black/40">
		<div class="modal-box max-w-lg bg-bg-card border border-border-default rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border-default pb-4">
				<div class="flex items-center gap-3">
					<div class="size-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
						<Package class="size-5" />
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
				<button type="button" class="btn btn-sm btn-ghost btn-circle text-text-muted hover:text-text-primary" @click="closeModal">
					<X class="size-4" />
				</button>
			</div>

			<!-- Body -->
			<form class="mt-4 space-y-4" @submit.prevent="() => assignPackage()">
				<!-- Package Selector -->
				<div>
					<label class="block text-xs font-bold uppercase text-text-muted mb-2">Selecciona un Paquete del Catálogo</label>
					
					<div v-if="isLoadingPackages" class="flex justify-center py-6">
						<span class="loading loading-spinner text-primary"/>
					</div>

					<div v-else-if="!catalogPackages || catalogPackages.length === 0" class="text-center py-6 text-xs text-text-muted border border-dashed border-border-default rounded-2xl">
						No hay bonos creados en el catálogo. Crea uno primero en la sección de Servicios/Catálogo.
					</div>

					<div v-else class="space-y-2 max-h-48 overflow-y-auto pr-1">
						<div
							v-for="pkg in catalogPackages"
							:key="pkg.package_id"
							class="p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between"
							:class="selectedPackageId === pkg.package_id ? 'border-primary bg-primary/10 shadow-xs' : 'border-border-default bg-bg-muted/40 hover:bg-bg-muted'"
							@click="selectedPackageId = pkg.package_id || ''">
							<div class="flex items-center gap-3">
								<div class="size-8 rounded-xl flex items-center justify-center font-bold text-xs" :class="pkg.type === 'MIXTO' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'">
									<Sparkles v-if="pkg.type === 'MIXTO'" class="size-4" />
									<Package v-else class="size-4" />
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
								<div class="size-5 rounded-full border border-border-default flex items-center justify-center" :class="selectedPackageId === pkg.package_id ? 'bg-primary border-primary text-white' : ''">
									<Check v-if="selectedPackageId === pkg.package_id" class="size-3 stroke-3" />
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Customization Panel (Shows when package is selected) -->
				<div v-if="selectedPkg" class="p-4 rounded-2xl bg-bg-muted/30 border border-border-subtle space-y-3">
					<div class="flex items-center justify-between border-b border-border-subtle/60 pb-2">
						<div class="flex items-center gap-1.5 text-text-primary font-black text-xs uppercase">
							<SlidersHorizontal class="size-3.5 text-primary" />
							Personalizar Condiciones para este Cliente
						</div>
						<span class="text-[10px] text-text-muted font-bold">Opcional</span>
					</div>

					<!-- Price & Sessions row -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<!-- Custom Price -->
						<div>
							<label class="block text-xs font-bold uppercase text-text-muted mb-1">Precio Cobrado (€)</label>
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
							<p v-if="selectedPkg.price !== undefined && customPrice !== selectedPkg.price" class="text-[10px] text-primary font-bold mt-1">
								Personalizado (Catálogo: {{ selectedPkg.price }} €)
							</p>
						</div>

						<!-- Custom Sessions -->
						<div>
							<label class="block text-xs font-bold uppercase text-text-muted mb-1">Total Sesiones</label>
							<input
								v-model.number="customTotalSessions"
								type="number"
								min="1"
								step="1"
								required
								class="input input-bordered w-full rounded-2xl font-black text-text-primary text-sm"
							>
							<p v-if="selectedPkg.total_sessions !== undefined && customTotalSessions !== selectedPkg.total_sessions" class="text-[10px] text-primary font-bold mt-1">
								Personalizado (Catálogo: {{ selectedPkg.total_sessions }})
							</p>
						</div>
					</div>

					<!-- Expiry Option -->
					<div>
						<label class="block text-xs font-bold uppercase text-text-muted mb-1">Caducidad / Validez</label>
						<AppSelect
							v-model="expiryOption"
							aria-label="Validez del bono"
							:options="[
								{ value: '3', label: '3 meses' },
								{ value: '6', label: '6 meses (Recomendado)' },
								{ value: '12', label: '12 meses (1 Año)' },
								{ value: '24', label: '24 meses (2 Años)' },
								{ value: 'custom', label: 'Fecha exacta personalizada...' },
								{ value: 'none', label: 'Sin caducidad' }
							]"
						/>
					</div>

					<!-- Custom Date Input if 'custom' is selected -->
					<div v-if="expiryOption === 'custom'" class="pt-1">
						<label class="block text-xs font-bold uppercase text-text-muted mb-1">Fecha Límite Exacta</label>
						<input
							v-model="customExpiryDate"
							type="date"
							required
							class="input input-bordered w-full rounded-2xl font-semibold text-text-primary text-sm"
						>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
					<button type="button" class="btn btn-ghost rounded-xl text-xs uppercase font-bold" @click="closeModal">
						Cancelar
					</button>
					<button type="submit" class="btn btn-primary rounded-xl font-black uppercase text-xs shadow-md" :disabled="isAssigning || !selectedPackageId">
						<span v-if="isAssigning" class="loading loading-spinner"/>
						<span v-else>Confirmar Asignación</span>
					</button>
				</div>
			</form>
		</div>
	</div>
</template>
