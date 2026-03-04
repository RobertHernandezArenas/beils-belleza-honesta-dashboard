<script lang="ts" setup>
	import { ref } from 'vue'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Plus, Hash } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'
	import TagModal from '~/components/catalog/tags/TagModal.vue'
	import GenericDeleteModal from '~/components/shared/GenericDeleteModal.vue'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Etiquetas | Catálogo' })

	const {
		data: tags,
		isPending,
		error,
	} = useQuery<{ tag_id: string; name: string }[]>({
		queryKey: ['tags-list'],
		queryFn: () => $fetch('/api/catalog/tags'),
	})

	const queryClient = useQueryClient()
	const { t } = useI18n()

	// Modales
	const showTagModal = ref(false)
	const showDeleteModal = ref(false)
	const selectedTag = ref<any>(null)

	// Acciones
	const openCreateModal = () => {
		selectedTag.value = null
		showTagModal.value = true
	}

	const openEditModal = (tag: any) => {
		selectedTag.value = { ...tag }
		showTagModal.value = true
	}

	const openDeleteModal = (tag: any) => {
		selectedTag.value = tag
		showDeleteModal.value = true
	}

	const { mutate: deleteTag, isPending: deleting } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/catalog/tags/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tags-list'] })
			showDeleteModal.value = false
		},
		onError: (err: any) => {
			const msg = err.response?._data?.statusMessage || err.message
			alert(`Error: ${msg}`)
			showDeleteModal.value = false
		},
	})

	const confirmDelete = () => {
		if (selectedTag.value?.tag_id) {
			deleteTag(selectedTag.value.tag_id)
		}
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-[1400px]">
			<!-- Header -->
			<header class="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">Etiquetas</h1>
					<p class="text-text-muted text-sm font-medium">Gestiona las etiquetas de tus productos</p>
				</div>
				<button
					class="btn bg-text-primary text-bg-app hover:bg-text-secondary flex h-12 items-center gap-2 rounded-full border-transparent px-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all"
					@click="openCreateModal">
					<Plus class="h-5 w-5" />
					<span class="font-bold">Nueva Etiqueta</span>
				</button>
			</header>

			<!-- Content -->
			<div v-if="isPending" class="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div v-for="i in 6" :key="i" class="bg-bg-card h-24 animate-pulse rounded-3xl"></div>
			</div>

			<div v-else-if="error" class="bg-error/10 text-error rounded-3xl p-8 text-center">
				Ocurrió un error al cargar las etiquetas.
			</div>

			<div
				v-else-if="tags?.length === 0"
				class="bg-bg-card flex flex-col items-center justify-center rounded-3xl py-20 text-center">
				<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<Hash class="text-text-muted/50 h-10 w-10" />
				</div>
				<p class="text-text-primary text-xl font-bold">Sin etiquetas</p>
				<p class="text-text-muted mt-2 max-w-sm">
					Aún no has registrado ninguna etiqueta para organizar tus productos.
				</p>
			</div>

			<div v-else class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
				<div
					v-for="tag in tags"
					:key="tag.tag_id"
					class="bg-bg-card group flex cursor-pointer items-center justify-between rounded-full py-2 pr-2 pl-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:shadow-md"
					@click="openEditModal(tag)">
					<div class="flex items-center gap-2 overflow-hidden">
						<Hash class="text-primary h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
						<span class="text-text-primary truncate font-bold tracking-tight">{{ tag.name }}</span>
					</div>

					<!-- Menú de Acciones -->
					<div class="dropdown dropdown-end" @click.stop.prevent>
						<div
							tabindex="0"
							role="button"
							class="btn btn-ghost btn-circle btn-xs text-text-muted hover:bg-bg-muted hover:text-text-primary transition-colors">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								class="h-4 w-4 stroke-current stroke-[2.5]">
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
									class="text-text-secondary hover:bg-bg-muted rounded-xl text-sm font-bold"
									@click.stop="openEditModal(tag)">
									Editar
								</button>
							</li>
							<li>
								<button
									class="text-error hover:bg-error/10 hover:text-error rounded-xl text-sm font-bold"
									@click.stop="openDeleteModal(tag)">
									Eliminar
								</button>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>

		<!-- Modales -->
		<TagModal v-model="showTagModal" :tag-to-edit="selectedTag" />
		<GenericDeleteModal
			:is-open="showDeleteModal"
			:item-name="selectedTag?.name || ''"
			:is-deleting="deleting"
			custom-title="Eliminar Etiqueta"
			custom-message="¿Estás seguro de que deseas eliminar esta etiqueta? Los productos perderán esta asociación, pero no serán eliminados."
			@close="showDeleteModal = false"
			@confirm="confirmDelete" />
	</div>
</template>
