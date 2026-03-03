<script lang="ts" setup>
	import { useQuery } from '@tanstack/vue-query'
	import { Plus, Hash } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Etiquetas | Catálogo' })

	const {
		data: tags,
		isPending,
		error,
	} = useQuery<{ tag_id: string; name: string; description: string | null }[]>({
		queryKey: ['tags-list'],
		queryFn: () => $fetch('/api/catalog/tags'),
	})

	const { t } = useI18n()

	const openCreateModal = () => {
		// TODO: Implement Tag Modal
		alert('Funcionalidad de crear etiqueta próximamente')
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
				<p class="text-text-muted mt-2 max-w-sm">Aún no has registrado ninguna etiqueta de producto.</p>
			</div>

			<div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div
					v-for="tag in tags"
					:key="tag.tag_id"
					class="bg-bg-card group flex items-start justify-between rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-md">
					<div class="flex items-center gap-4">
						<div
							class="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
							<Hash class="h-6 w-6" />
						</div>
						<div class="flex flex-col">
							<h3 class="text-text-primary text-lg font-bold">{{ tag.name }}</h3>
							<p
								v-if="tag.description"
								class="text-text-muted max-w-[120px] truncate text-xs font-medium"
								:title="tag.description">
								{{ tag.description }}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
