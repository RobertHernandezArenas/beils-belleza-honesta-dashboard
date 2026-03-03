<script lang="ts" setup>
	import { ref } from 'vue'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Plus, Tag } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Marcas | Catálogo' })

	const {
		data: brands,
		isPending,
		error,
	} = useQuery<{ brand_id: string; name: string; description: string | null }[]>({
		queryKey: ['brands-list'],
		queryFn: () => $fetch('/api/catalog/brands'),
	})

	const queryClient = useQueryClient()
	const { t } = useI18n()

	// Modales
	const showBrandModal = ref(false)
	const showDeleteModal = ref(false)
	const selectedBrand = ref<any>(null)

	// Acciones
	const openCreateModal = () => {
		selectedBrand.value = null
		showBrandModal.value = true
	}

	const openEditModal = (brand: any) => {
		selectedBrand.value = { ...brand }
		showBrandModal.value = true
	}

	const openDeleteModal = (brand: any) => {
		selectedBrand.value = brand
		showDeleteModal.value = true
	}

	const { mutate: deleteBrand, isPending: deleting } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/catalog/brands/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['brands-list'] })
			showDeleteModal.value = false
		},
		onError: (err: any) => {
			const msg = err.response?._data?.statusMessage || err.message
			alert(`Error: ${msg}`)
			showDeleteModal.value = false
		},
	})

	const confirmDelete = () => {
		if (selectedBrand.value?.brand_id) {
			deleteBrand(selectedBrand.value.brand_id)
		}
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-[1400px]">
			<!-- Header -->
			<header class="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">
						{{ t('catalog.brands.title') }}
					</h1>
					<p class="text-text-muted text-sm font-medium">{{ t('catalog.brands.subtitle') }}</p>
				</div>
				<button
					class="btn bg-text-primary text-bg-app hover:bg-text-secondary flex h-12 items-center gap-2 rounded-full border-transparent px-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all"
					@click="openCreateModal">
					<Plus class="h-5 w-5" />
					<span class="font-bold">{{ t('catalog.brands.newBrand') }}</span>
				</button>
			</header>

			<!-- Content -->
			<div v-if="isPending" class="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div v-for="i in 6" :key="i" class="bg-bg-card h-24 animate-pulse rounded-3xl"></div>
			</div>

			<div v-else-if="error" class="bg-error/10 text-error rounded-3xl p-8 text-center">
				{{ t('catalog.brands.errorLoad') }}
			</div>

			<div
				v-else-if="brands?.length === 0"
				class="bg-bg-card flex flex-col items-center justify-center rounded-3xl py-20 text-center">
				<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<Tag class="text-text-muted/50 h-10 w-10" />
				</div>
				<p class="text-text-primary text-xl font-bold">{{ t('catalog.brands.emptyState') }}</p>
				<p class="text-text-muted mt-2 max-w-sm">{{ t('catalog.brands.emptyStateSub') }}</p>
			</div>

			<div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div
					v-for="brand in brands"
					:key="brand.brand_id"
					class="bg-bg-card group flex items-start justify-between rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-md">
					<div class="flex items-center gap-4">
						<div
							class="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
							<Tag class="h-6 w-6" />
						</div>
						<div class="flex flex-col">
							<h3 class="text-text-primary text-lg font-bold">{{ brand.name }}</h3>
							<p
								v-if="brand.description"
								class="text-text-muted max-w-[120px] truncate text-xs font-medium"
								:title="brand.description">
								{{ brand.description }}
							</p>
						</div>
					</div>

					<!-- Menú de Acciones -->
					<div class="dropdown dropdown-end">
						<div
							tabindex="0"
							role="button"
							class="btn btn-ghost btn-circle btn-sm text-text-muted hover:bg-bg-muted hover:text-text-primary transition-colors">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								class="h-5 w-5 stroke-current stroke-[2.5]">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
							</svg>
						</div>
						<ul
							tabindex="0"
							class="dropdown-content menu bg-bg-card border-border-subtle z-50 mt-1 w-44 rounded-2xl border p-2 shadow-xl">
							<li>
								<button
									class="text-text-secondary hover:bg-bg-muted rounded-xl font-bold"
									@click="openEditModal(brand)">
									Editar Marca
								</button>
							</li>
							<li>
								<button
									class="text-error hover:bg-error/10 hover:text-error rounded-xl font-bold"
									@click="openDeleteModal(brand)">
									Eliminar
								</button>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>

		<!-- Modales -->
		<BrandModal v-model="showBrandModal" :brand-to-edit="selectedBrand" />
		<UserDeleteModal
			:is-open="showDeleteModal"
			:user-name="selectedBrand?.name || ''"
			:is-deleting="deleting"
			custom-title="Eliminar Marca"
			custom-message="¿Estás seguro de que deseas eliminar esta marca de producto? Esta acción no se puede deshacer."
			@close="showDeleteModal = false"
			@confirm="confirmDelete" />
	</div>
</template>
