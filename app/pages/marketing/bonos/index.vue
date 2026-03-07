<script setup lang="ts">
	import { ref, computed } from 'vue'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Gift, Plus, Search, MoreVertical, Edit2, Trash2, Repeat } from 'lucide-vue-next'
	import BonusFormModal from '~/components/marketing/BonusFormModal.vue'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Bonos de Sesiones | Marketing' })

	const queryClient = useQueryClient()
	const searchQuery = ref('')
	const modalRef = ref<InstanceType<typeof BonusFormModal> | null>(null)
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	const queryParams = computed(() => {
		const params: Record<string, string> = {}
		if (searchQuery.value) params.search = searchQuery.value
		return params
	})

	const { data: bonuses, isPending } = useQuery({
		queryKey: ['bonuses', queryParams],
		queryFn: () => $fetch('/api/marketing/bonuses', { query: queryParams.value }),
	})

	const { mutate: deleteBonus } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/marketing/bonuses/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bonuses'] })
			displayToast('Bono eliminado exitosamente', 'success')
		},
		onError: (error: any) => {
			displayToast(error.data?.statusMessage || 'Error al eliminar el bono', 'error')
		},
	})

	const openCreateModal = () => {
		modalRef.value?.showModal(null)
	}

	const openEditModal = (bonus: any) => {
		modalRef.value?.showModal(bonus)
	}

	const confirmDelete = (id: string) => {
		if (
			confirm(
				'¿Estás seguro de que deseas eliminar este bono de catálogo? Los bonos ya comprados por clientes no se verán afectados directamente, pero dejará de estar disponible para la venta.',
			)
		) {
			deleteBonus(id)
		}
	}

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => (showToast.value = false), 3000)
	}

	
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8">
		<div class="mx-auto max-w-7xl">
			<!-- Header -->
			<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
						<Repeat class="h-6 w-6" />
					</div>
					<div>
						<h1 class="text-2xl font-bold tracking-tight">Catálogo de Bonos</h1>
						<p class="text-text-muted text-sm font-medium">Bonos de varias sesiones para servicios</p>
					</div>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div class="relative w-full sm:w-64">
						<Search class="text-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Buscar bono..."
							class="input bg-bg-card border-border-default focus:border-border-strong focus:ring-border-subtle h-12 w-full rounded-2xl pl-10 text-sm shadow-sm transition-[border-color,box-shadow]" />
					</div>
					<button
						class="btn bg-text-primary text-bg-card hover:bg-text-secondary h-12 rounded-2xl border-none px-6 font-bold shadow-sm"
						@click="openCreateModal">
						<Plus class="h-5 w-5" />
						Nuevo Bono
					</button>
				</div>
			</div>

			<!-- Loading State -->
			<div v-if="isPending" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				<div
					v-for="i in 6"
					:key="i"
					class="bg-bg-card border-border-default h-40 w-full animate-pulse rounded-3xl border opacity-50 mix-blend-multiply"></div>
			</div>

			<!-- Grid List -->
			<div
				v-else-if="bonuses && bonuses.length > 0"
				class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				<div
					v-for="bonus in bonuses"
					:key="bonus.bonus_id"
					class="group bg-bg-card border-border-default hover:border-border-strong relative flex flex-col justify-between rounded-3xl border p-6 shadow-sm transition-colors transition-transform duration-300 hover:shadow-md">
					<div class="mb-4">
						<div class="mb-2 flex items-start justify-between">
							<div class="flex flex-col gap-1">
								<span
									class="badge badge-sm w-fit font-bold tracking-wider uppercase"
									:class="
										bonus.status === 'activo'
											? 'badge-success text-white'
											: 'badge-ghost text-text-muted'
									">
									{{ bonus.status }}
								</span>
								<h3 class="text-lg leading-tight font-bold">{{ bonus.name }}</h3>
								<div
									class="text-text-muted bg-bg-muted mt-1 w-fit rounded-lg px-2 py-0.5 text-xs font-bold tracking-wider uppercase">
									{{ bonus.total_sessions }} Sesiones
								</div>
							</div>

							<!-- Menu dropdown -->
							<div class="dropdown dropdown-end">
								<button tabindex="0" class="btn btn-ghost btn-sm btn-circle text-text-muted -mr-2">
									<MoreVertical class="h-4 w-4" />
								</button>
								<ul
									tabindex="0"
									class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-10 mt-1 w-40 rounded-xl border p-2 shadow-lg">
									<li>
										<a @click="openEditModal(bonus)" class="hover:bg-bg-muted font-medium">
											<Edit2 class="h-4 w-4" />
											Editar
										</a>
									</li>
									<li>
										<a
											@click="confirmDelete(bonus.bonus_id)"
											class="text-error hover:bg-error/10 font-medium">
											<Trash2 class="h-4 w-4" />
											Eliminar
										</a>
									</li>
								</ul>
							</div>
						</div>

						<p class="text-text-muted mt-2 line-clamp-2 text-sm font-medium">
							{{ bonus.description || 'Sin descripción' }}
						</p>
					</div>

					<div class="border-border-default mt-auto flex flex-col gap-3 border-t pt-4">
						<div class="flex flex-col">
							<span class="text-text-muted mb-1 text-xs font-bold tracking-wider uppercase">
								Servicio Vinculado
							</span>
							<span
								class="truncate text-sm font-medium"
								:class="{ 'text-text-muted italic': !bonus.service }">
								{{ bonus.service?.name || 'Válido para múltiples servicios' }}
							</span>
						</div>

						<div class="mt-2 flex items-center justify-between">
							<span class="text-text-muted text-xs font-bold tracking-wider uppercase">
								Precio Total
							</span>
							<span class="text-text-primary text-xl font-black tabular-nums">
								{{ formatCurrency(bonus.price) }}
							</span>
						</div>
						<div class="-mt-1 text-right">
							<span class="text-text-muted text-xs font-medium">
								({{ formatCurrency(bonus.price / bonus.total_sessions) }} / sesión)
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Empty State -->
			<div
				v-else
				class="bg-bg-card border-border-default flex flex-col items-center justify-center rounded-3xl border border-dashed px-4 py-20 text-center">
				<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<Repeat class="text-text-muted h-10 w-10" />
				</div>
				<h3 class="mb-1 text-xl font-bold">No hay bonos en el catálogo</h3>
				<p class="text-text-muted mb-6 max-w-sm text-sm">
					Crea paquetes de varias sesiones (bonos) para vender servicios de manera anticipada a los
					clientes.
				</p>
				<button
					class="btn bg-text-primary text-bg-card hover:bg-text-secondary rounded-xl border-none px-8 font-bold"
					@click="openCreateModal">
					Crear Bono
				</button>
			</div>
		</div>

		<!-- Toast Provider -->
		<div v-if="showToast" class="toast toast-end toast-bottom z-50">
			<div
				:class="[
					'alert rounded-2xl border-none text-white shadow-lg',
					toastType === 'success' ? 'bg-success' : 'bg-error',
				]">
				<span class="font-medium">{{ toastMessage }}</span>
			</div>
		</div>

		<!-- Form Modal -->
		<BonusFormModal
			ref="modalRef"
			@refresh="queryClient.invalidateQueries({ queryKey: ['bonuses'] })"
			@toast="displayToast" />
	</div>
</template>
