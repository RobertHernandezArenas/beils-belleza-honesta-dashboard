<script lang="ts" setup>
	import { ref } from 'vue'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Search, Plus, ClipboardList, Edit, Trash2 } from 'lucide-vue-next'
	import QuestionnaireFormModal from '~/components/clients/QuestionnaireFormModal.vue'
	import UserDeleteModal from '~/components/users/UserDeleteModal.vue'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Cuestionarios | CRM' })

	const queryClient = useQueryClient()
	const searchQuery = ref('')

	const {
		data: questionnaires,
		isPending,
		error,
	} = useQuery<any[]>({
		queryKey: ['questionnaires-list'],
		queryFn: () => $fetch('/api/clients/questionnaires'),
	})

	const filteredItems = computed(() => {
		if (!questionnaires.value) return []
		const q = searchQuery.value.toLowerCase()
		if (!q) return questionnaires.value
		return questionnaires.value.filter(
			(item: any) =>
				item.user?.name?.toLowerCase().includes(q) ||
				item.user?.surname?.toLowerCase().includes(q) ||
				item.title?.toLowerCase().includes(q),
		)
	})

	const showFormModal = ref(false)
	const showDeleteModal = ref(false)
	const selectedItem = ref<any>(null)

	const openCreate = () => {
		selectedItem.value = null
		showFormModal.value = true
	}

	const openEdit = (item: any) => {
		selectedItem.value = { ...item }
		showFormModal.value = true
	}

	const openDelete = (item: any) => {
		selectedItem.value = item
		showDeleteModal.value = true
	}

	const { mutate: deleteItem, isPending: deleting } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/clients/questionnaires/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['questionnaires-list'] })
			showDeleteModal.value = false
		},
		onError: (err: any) => {
			alert(`Error: ${err.response?._data?.statusMessage || err.message}`)
			showDeleteModal.value = false
		},
	})

	const confirmDelete = () => {
		if (selectedItem.value?.questionnaire_id) {
			deleteItem(selectedItem.value.questionnaire_id)
		}
	}

	const formatDate = (dateStr: string) => {
		return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(
			new Date(dateStr),
		)
	}

	const formatJsonPreview = (data: any) => {
		if (!data) return '—'
		const keys = Object.keys(data)
		if (keys.length === 0) return '(vacío)'
		return `${keys.length} campo${keys.length > 1 ? 's' : ''}`
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-[1400px]">
			<header class="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">Cuestionarios</h1>
					<p class="text-text-muted text-sm font-medium">
						Gestión de cuestionarios y formularios de clientes
					</p>
				</div>

				<div class="flex items-center gap-4">
					<div class="relative">
						<Search class="text-text-muted absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Buscar cuestionario..."
							class="input bg-bg-card hover:bg-bg-card focus:bg-bg-card focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-full border-none pl-11 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors focus:ring-4 md:w-64" />
					</div>
					<button
						class="btn bg-text-primary text-bg-app hover:bg-text-secondary flex h-12 items-center gap-2 rounded-full border-transparent px-6 shadow-md transition-colors"
						@click="openCreate">
						<Plus class="h-5 w-5" />
						<span class="font-bold">Nuevo Cuestionario</span>
					</button>
				</div>
			</header>

			<div
				v-if="isPending"
				class="bg-bg-card border-border-subtle w-full space-y-4 rounded-3xl border p-6 shadow-sm">
				<div v-for="i in 5" :key="i" class="bg-bg-muted h-16 w-full animate-pulse rounded-2xl"></div>
			</div>

			<div
				v-else-if="error"
				class="bg-error/10 text-error border-error/20 rounded-3xl border p-8 text-center">
				Error al cargar cuestionarios
			</div>

			<div
				v-else-if="filteredItems.length === 0"
				class="bg-bg-card border-border-subtle flex flex-col items-center justify-center rounded-3xl border py-24 text-center shadow-sm">
				<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<ClipboardList class="text-text-muted/50 h-10 w-10" />
				</div>
				<p class="text-text-primary text-xl font-bold">No hay cuestionarios registrados</p>
				<p class="text-text-muted mt-2 max-w-sm">
					Crea el primer cuestionario utilizando el botón superior.
				</p>
			</div>

			<div
				v-else
				class="bg-bg-card border-border-subtle w-full overflow-hidden rounded-3xl border shadow-sm">
				<div class="w-full overflow-x-auto">
					<table class="w-full min-w-[750px] text-left text-sm">
						<thead class="bg-bg-muted/50 text-text-secondary border-border-subtle border-b">
							<tr>
								<th class="px-6 py-4 font-bold">Cliente</th>
								<th class="px-6 py-4 font-bold">Título</th>
								<th class="px-6 py-4 font-bold">Datos</th>
								<th class="px-6 py-4 font-bold">Fecha</th>
								<th class="px-6 py-4 text-right font-bold">Acciones</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="item in filteredItems"
								:key="item.questionnaire_id"
								class="border-border-default hover:bg-bg-muted/40 border-b transition-colors last:border-0">
								<td class="px-6 py-4">
									<div class="flex flex-col">
										<span class="text-text-primary font-bold">
											{{ item.user?.name }} {{ item.user?.surname }}
										</span>
										<span class="text-text-muted mt-0.5 text-xs font-medium">
											{{ item.user?.email }}
										</span>
									</div>
								</td>
								<td class="px-6 py-4">
									<span class="text-text-primary font-medium">{{ item.title }}</span>
								</td>
								<td class="px-6 py-4">
									<span
										class="text-text-secondary bg-bg-muted border-border-default/50 inline-block rounded-md border px-2.5 py-1 text-xs font-bold">
										{{ formatJsonPreview(item.data) }}
									</span>
								</td>
								<td class="px-6 py-4 tabular-nums">
									<span class="text-text-primary font-medium">
										{{ formatDate(item.created_at) }}
									</span>
								</td>
								<td class="px-6 py-4 text-right">
									<div class="flex items-center justify-end gap-1">
										<button
											class="btn btn-sm btn-circle btn-ghost text-text-muted hover:bg-bg-muted hover:text-text-primary tooltip tooltip-left transition-colors"
											data-tip="Editar"
											aria-label="Editar"
											@click="openEdit(item)">
											<Edit class="h-4 w-4" />
										</button>
										<button
											class="btn btn-sm btn-circle btn-ghost text-error/70 hover:bg-error/10 hover:text-error tooltip tooltip-left transition-colors"
											data-tip="Eliminar"
											aria-label="Eliminar"
											@click="openDelete(item)">
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<QuestionnaireFormModal v-model="showFormModal" :item-to-edit="selectedItem" />
		<UserDeleteModal
			:is-open="showDeleteModal"
			:user-name="selectedItem?.title || ''"
			:is-deleting="deleting"
			custom-title="Eliminar Cuestionario"
			custom-message="¿Estás seguro de que deseas eliminar este cuestionario? Esta acción no se puede deshacer."
			@close="showDeleteModal = false"
			@confirm="confirmDelete" />
	</div>
</template>
