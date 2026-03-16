<script lang="ts" setup>
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Plus, Layers } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'
	import CategoryModal from '~/components/catalog/categories/CategoryModal.vue'
	import GenericDeleteModal from '~/components/shared/GenericDeleteModal.vue'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Categorías | Catálogo' })

	const {
		data: categories,
		isPending,
		error,
	} = useQuery<
		{
			category_id: string
			name: string
			description: string | null
			subcategories: { subcategory_id: string; name: string }[]
			_count: { subcategories: number }
		}[]
	>({
		queryKey: ['categories-list'],
		queryFn: () => $fetch('/api/catalog/categories'),
	})

	const queryClient = useQueryClient()
	const { t } = useI18n()

	// Modales
	const showCategoryModal = ref(false)
	const showDeleteModal = ref(false)
	const selectedCategory = ref<any>(null)

	// Acciones
	const openCreateModal = () => {
		selectedCategory.value = null
		showCategoryModal.value = true
	}

	const openEditModal = (category: any) => {
		selectedCategory.value = { ...category }
		showCategoryModal.value = true
	}

	const openDeleteModal = (category: any) => {
		selectedCategory.value = category
		showDeleteModal.value = true
	}

	const { mutate: deleteCategory, isPending: deleting } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/catalog/categories/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['categories-list'] })
			showDeleteModal.value = false
		},
		onError: (err: any) => {
			const msg = err.response?._data?.statusMessage || err.message
			alert(`Error: ${msg}`)
			showDeleteModal.value = false
		},
	})

	const confirmDelete = () => {
		if (selectedCategory.value?.category_id) {
			deleteCategory(selectedCategory.value.category_id)
		}
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-[1400px]">
			<!-- Header -->
			<header class="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">Categorías</h1>
					<p class="text-text-muted text-sm font-medium">Gestiona las categorías de tus productos</p>
				</div>
				<button
					class="btn bg-text-primary text-bg-app hover:bg-text-secondary flex h-12 items-center gap-2 rounded-full border-transparent px-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors"
					@click="openCreateModal">
					<Plus class="h-5 w-5" />
					<span class="font-bold">Nueva Categoría</span>
				</button>
			</header>

			<!-- Content -->
			<div v-if="isPending" class="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div v-for="i in 6" :key="i" class="bg-bg-card h-24 animate-pulse rounded-3xl"></div>
			</div>

			<div v-else-if="error" class="bg-error/10 text-error rounded-3xl p-8 text-center">
				Ocurrió un error al cargar las categorías.
			</div>

			<div
				v-else-if="categories?.length === 0"
				class="bg-bg-card flex flex-col items-center justify-center rounded-3xl py-20 text-center">
				<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<Layers class="text-text-muted/50 h-10 w-10" />
				</div>
				<p class="text-text-primary text-xl font-bold">Sin categorías</p>
				<p class="text-text-muted mt-2 max-w-sm">Aún no has registrado ninguna categoría de producto.</p>
			</div>

			<div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				<div
					v-for="category in categories"
					:key="category.category_id"
					class="bg-bg-card group flex cursor-pointer items-start justify-between rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-md"
					@click="openEditModal(category)">
					<div class="flex items-center gap-4">
						<div
							class="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
							<Layers class="h-6 w-6" />
						</div>
						<div class="flex flex-col overflow-hidden pr-2">
							<h3 class="text-text-primary truncate text-lg font-bold">{{ category.name }}</h3>
							<p
								v-if="category.description"
								class="text-text-muted mt-0.5 max-w-full truncate text-xs font-medium"
								:title="category.description">
								{{ category.description }}
							</p>

							<!-- Subcategories Chips Preview -->
							<div
								class="mt-3 flex flex-wrap items-center gap-2"
								v-if="category.subcategories?.length">
								<span
									v-for="sub in category.subcategories"
									:key="sub.subcategory_id"
									class="bg-primary/5 text-primary border-primary/10 rounded-lg border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase shadow-xs">
									{{ sub.name }}
								</span>
								<span
									v-if="category._count.subcategories > category.subcategories.length"
									class="bg-bg-muted text-text-muted border-border-default rounded-lg border px-2.5 py-1 text-[10px] font-bold tracking-wide shadow-xs">
									+{{ category._count.subcategories - category.subcategories.length }} más
								</span>
							</div>
							<div v-else class="mt-3">
								<span
									class="bg-bg-muted text-text-muted/60 border-border-default rounded-lg border border-dashed px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase">
									Sin subcategorías
								</span>
							</div>
						</div>
					</div>

					<!-- Menú de Acciones -->
					<div class="dropdown dropdown-end" @click.stop.prevent>
						<div
							tabindex="0"
							role="button"
							class="btn btn-ghost btn-circle btn-sm text-text-muted hover:bg-bg-muted hover:text-text-primary transition-colors"
							@click.stop>
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
							class="dropdown-content menu bg-bg-card border-border-subtle z-50 mt-1 w-48 rounded-2xl border p-2 shadow-xl">
							<li>
								<button
									class="text-text-secondary hover:bg-bg-muted rounded-xl font-bold"
									@click="openEditModal(category)">
									Editar Categoría
								</button>
							</li>
							<li>
								<button
									class="text-error hover:bg-error/10 hover:text-error rounded-xl font-bold"
									@click.stop="openDeleteModal(category)">
									Eliminar
								</button>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>

		<!-- Modales -->
		<CategoryModal v-model="showCategoryModal" :category-to-edit="selectedCategory" />
		<GenericDeleteModal
			:is-open="showDeleteModal"
			:item-name="selectedCategory?.name || ''"
			:is-deleting="deleting"
			custom-title="Eliminar Categoría"
			custom-message="¿Estás seguro de que deseas eliminar esta categoría? Las subcategorías vinculadas también podrían verse afectadas si se configuran en cascada."
			@close="showDeleteModal = false"
			@confirm="confirmDelete" />
	</div>
</template>
