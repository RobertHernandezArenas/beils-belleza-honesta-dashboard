<script setup lang="ts">
	import { ref, computed } from 'vue'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Scissors, Plus, Search, MoreVertical, Edit2, Trash2, Clock, AlertCircle } from 'lucide-vue-next'
	import ServiceFormModal from '~/components/services/ServiceFormModal.vue'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Servicios | Catálogo' })

	const queryClient = useQueryClient()
	const searchQuery = ref('')
	const modalRef = ref<InstanceType<typeof ServiceFormModal> | null>(null)
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	const queryParams = computed(() => {
		const params: Record<string, string> = {}
		if (searchQuery.value) params.search = searchQuery.value
		return params
	})

	const { data: services, isPending } = useQuery({
		queryKey: ['services', queryParams],
		queryFn: () => $fetch('/api/services', { query: queryParams.value }),
	})

	const { mutate: deleteService } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/services/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['services'] })
			displayToast('Servicio eliminado exitosamente', 'success')
		},
		onError: (error: any) => {
			displayToast(error.data?.statusMessage || 'Error al eliminar el servicio', 'error')
		},
	})

	const openCreateModal = () => {
		modalRef.value?.showModal(null)
	}

	const openEditModal = (service: any) => {
		modalRef.value?.showModal(service)
	}

	const confirmDelete = (id: string) => {
		if (confirm('¿Estás seguro de que deseas eliminar este servicio? No podrás recuperarlo.')) {
			deleteService(id)
		}
	}

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => (showToast.value = false), 3000)
	}

	const formatDuration = (minutes: number) => {
		const h = Math.floor(minutes / 60)
		const m = minutes % 60
		if (h > 0 && m > 0) return `${h}h ${m}m`
		if (h > 0) return `${h}h`
		return `${m} min`
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8">
		<div class="mx-auto max-w-7xl">
			<!-- Header -->
			<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
						<Scissors class="h-6 w-6" />
					</div>
					<div>
						<h1 class="text-2xl font-bold tracking-tight">Servicios</h1>
						<p class="text-text-muted text-sm font-medium">Gestiona tu oferta de servicios</p>
					</div>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div class="relative w-full sm:w-64">
						<Search class="text-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Buscar servicio..."
							class="input bg-bg-card border-border-default focus:border-border-strong focus:ring-border-subtle h-12 w-full rounded-2xl pl-10 text-sm shadow-sm transition-[border-color,box-shadow]" />
					</div>
					<button
						class="btn bg-text-primary text-bg-card hover:bg-text-secondary h-12 rounded-2xl border-none px-6 font-bold shadow-sm"
						@click="openCreateModal">
						<Plus class="h-5 w-5" />
						Nuevo
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
				v-else-if="services && services.length > 0"
				class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				<div
					v-for="service in services"
					:key="service.service_id"
					class="group bg-bg-card border-border-default hover:border-border-strong relative flex flex-col justify-between rounded-3xl border p-6 shadow-sm transition-colors duration-300 hover:shadow-md">
					<div class="mb-4">
						<div class="mb-2 flex items-start justify-between">
							<div class="flex items-center gap-2">
								<span
									class="badge badge-sm font-bold tracking-wider uppercase"
									:class="
										service.status === 'activo'
											? 'badge-success text-white'
											: 'badge-ghost text-text-muted'
									">
									{{ service.status }}
								</span>
								<span
									v-if="service.code"
									class="text-text-muted bg-bg-muted rounded-md px-2 py-0.5 text-xs font-bold tracking-wider uppercase">
									{{ service.code }}
								</span>
							</div>

							<!-- Menu dropdown -->
							<div class="dropdown dropdown-end">
								<button tabindex="0" class="btn btn-ghost btn-sm btn-circle text-text-muted -mr-2">
									<MoreVertical class="h-4 w-4" />
								</button>
								<ul
									tabindex="0"
									class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-[1] mt-1 w-40 rounded-xl border p-2 shadow-lg">
									<li>
										<a @click="openEditModal(service)" class="hover:bg-bg-muted font-medium">
											<Edit2 class="h-4 w-4" />
											Editar
										</a>
									</li>
									<li>
										<a
											@click="confirmDelete(service.service_id)"
											class="text-error hover:bg-error/10 font-medium">
											<Trash2 class="h-4 w-4" />
											Eliminar
										</a>
									</li>
								</ul>
							</div>
						</div>

						<h3 class="mb-1 text-lg leading-tight font-bold">{{ service.name }}</h3>
						<p class="text-text-muted line-clamp-2 text-sm font-medium">
							{{ service.description || 'Sin descripción' }}
						</p>
					</div>

					<div class="mt-auto flex items-end justify-between">
						<div
							class="text-text-muted bg-bg-muted flex w-fit items-center gap-1.5 rounded-xl px-3 py-1.5">
							<Clock class="h-4 w-4" />
							<span class="text-sm font-bold tabular-nums">
								{{ formatDuration(service.duration) }}
							</span>
						</div>

						<div class="text-right">
							<span
								class="text-text-muted mb-0.5 block text-xs font-bold tracking-wider uppercase opacity-70">
								Precio
							</span>
							<p class="text-text-primary text-xl leading-none font-bold tabular-nums">
								{{ formatCurrency(service.price) }}
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Empty State -->
			<div
				v-else
				class="bg-bg-card border-border-default flex flex-col items-center justify-center rounded-3xl border border-dashed px-4 py-20 text-center">
				<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<Scissors class="text-text-muted h-10 w-10" />
				</div>
				<h3 class="mb-1 text-xl font-bold">No hay servicios registrados</h3>
				<p class="text-text-muted mb-6 max-w-sm text-sm">
					Comienza agregando los servicios que ofreces a tus clientes para poder agendarlos o
					facturarlos.
				</p>
				<button
					class="btn bg-text-primary text-bg-card hover:bg-text-secondary rounded-xl border-none px-8 font-bold"
					@click="openCreateModal">
					Crear Servicio
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
		<ServiceFormModal
			ref="modalRef"
			@refresh="queryClient.invalidateQueries({ queryKey: ['services'] })"
			@toast="displayToast" />
	</div>
</template>
