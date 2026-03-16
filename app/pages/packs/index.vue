<script setup lang="ts">
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { PackageSearch, Plus, Search, MoreVertical, Edit2, Trash2, ListTree } from 'lucide-vue-next'
	import PackFormModal from '~/components/packs/PackFormModal.vue'
	import type { IPack } from '~/../shared/types/catalog'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Packs de Servicios | Catálogo' })

	const queryClient = useQueryClient()
	const searchQuery = ref('')
	const modalRef = ref<InstanceType<typeof PackFormModal> | null>(null)
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	const queryParams = computed(() => {
		const params: Record<string, string> = {}
		if (searchQuery.value) params.search = searchQuery.value
		return params
	})

	const { data: packs, isPending } = useQuery<IPack[]>({
		queryKey: ['packs', queryParams],
		queryFn: () => $fetch('/api/catalog/packs', { query: queryParams.value }),
	})

	const { mutate: deletePack } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/catalog/packs/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['packs'] })
			displayToast('Pack eliminado exitosamente', 'success')
		},
		onError: (error: any) => {
			displayToast(error.data?.statusMessage || 'Error al eliminar el pack', 'error')
		},
	})

	const openCreateModal = () => {
		modalRef.value?.showModal(null)
	}

	const openEditModal = (pack: any) => {
		modalRef.value?.showModal(pack)
	}

	const confirmDelete = (id: string) => {
		if (
			confirm(
				'¿Estás seguro de que deseas eliminar este pack? Sus elementos internos no se borrarán, solo la agrupación.',
			)
		) {
			deletePack(id)
		}
	}

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => (showToast.value = false), 3000)
	}

	const countItems = (pack: any) => {
		const services = pack.services?.length || 0
		const products = pack.products?.length || 0
		return services + products
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8">
		<div class="mx-auto max-w-7xl">
			<!-- Header -->
			<div class="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
						<PackageSearch class="h-6 w-6" />
					</div>
					<div>
						<h1 class="text-2xl font-bold tracking-tight">Packs & Promociones</h1>
						<p class="text-text-muted text-sm font-medium">
							Agrupa productos y servicios a un precio especial
						</p>
					</div>
				</div>

				<div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
					<div class="relative w-full sm:w-3/4 lg:w-64">
						<Search class="text-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Buscar pack..."
							class="input bg-bg-card border-border-default focus:border-border-strong focus:ring-border-subtle h-12 w-full rounded-2xl pl-10 text-sm shadow-sm transition-[border-color,box-shadow]" />
					</div>
					<button
						class="btn bg-text-primary text-bg-card hover:bg-text-secondary h-12 flex w-full shrink-0 items-center justify-center rounded-2xl border-none px-6 font-bold shadow-sm sm:w-1/4 lg:w-auto"
						@click="openCreateModal">
						<Plus class="h-5 w-5" />
						Nuevo Pack
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
			<div v-else-if="packs && packs.length > 0" class="flex flex-col gap-4">
				<div
					v-for="pack in packs"
					:key="pack.pack_id"
					class="group bg-bg-card border-border-default hover:border-border-strong relative flex flex-col justify-between gap-4 rounded-3xl border p-5 shadow-sm transition-colors duration-300 hover:shadow-md sm:flex-row sm:items-center">
					<div class="flex flex-1 items-start gap-4">
						<div
							class="bg-bg-muted border-border-default h-16 w-16 shrink-0 overflow-hidden rounded-2xl border">
							<img
								v-if="pack.image_url"
								:src="pack.image_url"
								:alt="pack.name"
								class="h-full w-full object-cover mix-blend-multiply" />
							<div v-else class="text-text-muted flex h-full w-full items-center justify-center">
								<PackageSearch class="h-6 w-6 opacity-50" />
							</div>
						</div>

						<div class="flex flex-col">
							<div class="mb-1 flex items-center gap-2">
								<h3 class="text-lg leading-tight font-bold">{{ pack.name }}</h3>
								<span
									v-if="pack.code"
									class="text-text-muted bg-bg-muted rounded-md px-2 py-0.5 text-xs font-bold tracking-wider uppercase">
									{{ pack.code }}
								</span>
								<span
									class="badge badge-xs ml-1 font-bold tracking-wider uppercase"
									:class="
										pack.status === 'activo'
											? 'badge-success text-white'
											: 'badge-ghost text-text-muted'
									">
									{{ pack.status }}
								</span>
							</div>
							<p class="text-text-muted mb-2 line-clamp-1 text-sm font-medium">
								{{ pack.description || 'Sin descripción' }}
							</p>
							<div
								class="text-text-muted bg-bg-muted flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold tracking-wider uppercase">
								<ListTree class="h-3.5 w-3.5" />
								<span>{{ countItems(pack) }} Ítem(s) en el pack</span>
							</div>
						</div>
					</div>

					<div
						class="border-border-default mt-2 flex w-full items-center justify-between gap-6 border-t pt-4 sm:mt-0 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0">
						<div class="text-right">
							<span
								class="text-text-muted mb-0.5 block text-xs font-bold tracking-wider uppercase opacity-70">
								Precio Final
							</span>
							<p class="text-text-primary text-2xl leading-none font-bold tabular-nums">
								{{ formatCurrency(pack.price) }}
							</p>
						</div>

						<!-- Menu dropdown -->
						<div class="dropdown dropdown-end">
							<button tabindex="0" class="btn btn-ghost btn-circle text-text-muted">
								<MoreVertical class="h-5 w-5" />
							</button>
							<ul
								tabindex="0"
								class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-1 mt-1 w-40 rounded-xl border p-2 shadow-lg">
								<li>
									<a @click="openEditModal(pack)" class="hover:bg-bg-muted font-medium">
										<Edit2 class="h-4 w-4" />
										Editar
									</a>
								</li>
								<li>
									<a
										@click="confirmDelete(pack.pack_id)"
										class="text-error hover:bg-error/10 font-medium">
										<Trash2 class="h-4 w-4" />
										Eliminar
									</a>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>

			<!-- Empty State -->
			<div
				v-else
				class="bg-bg-card border-border-default flex flex-col items-center justify-center rounded-3xl border border-dashed px-4 py-20 text-center">
				<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<PackageSearch class="text-text-muted h-10 w-10" />
				</div>
				<h3 class="mb-1 text-xl font-bold">No hay packs registrados</h3>
				<p class="text-text-muted mb-6 max-w-sm text-sm">
					Crea un nuevo paquete combinando servicios y productos con un precio cerrado y atractivo para
					tus clientes.
				</p>
				<button
					class="btn bg-text-primary text-bg-card hover:bg-text-secondary rounded-xl border-none px-8 font-bold"
					@click="openCreateModal">
					Crear Pack
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
		<PackFormModal
			ref="modalRef"
			@refresh="queryClient.invalidateQueries({ queryKey: ['packs'] })"
			@toast="displayToast" />
	</div>
</template>
