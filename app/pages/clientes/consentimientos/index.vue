<script lang="ts" setup>
	import { ref } from 'vue'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Search, Plus, FileCheck, Edit, Trash2, ExternalLink } from 'lucide-vue-next'
	import ConsentFormModal from '~/components/clients/ConsentFormModal.vue'
	import UserDeleteModal from '~/components/users/UserDeleteModal.vue'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Consentimientos | CRM' })

	const queryClient = useQueryClient()
	const searchQuery = ref('')

	const {
		data: consents,
		isPending,
		error,
	} = useQuery<any[]>({
		queryKey: ['consents-list'],
		queryFn: () => $fetch('/api/clients/consents'),
	})

	const filteredConsents = computed(() => {
		if (!consents.value) return []
		const q = searchQuery.value.toLowerCase()
		if (!q) return consents.value
		return consents.value.filter(
			(c: any) =>
				c.user?.name?.toLowerCase().includes(q) ||
				c.user?.surname?.toLowerCase().includes(q) ||
				c.user?.email?.toLowerCase().includes(q) ||
				c.document_url?.toLowerCase().includes(q),
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
		mutationFn: (id: string) => $fetch(`/api/clients/consents/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['consents-list'] })
			showDeleteModal.value = false
		},
		onError: (err: any) => {
			alert(`Error: ${err.response?._data?.statusMessage || err.message}`)
			showDeleteModal.value = false
		},
	})

	const confirmDelete = () => {
		if (selectedItem.value?.consent_id) {
			deleteItem(selectedItem.value.consent_id)
		}
	}

	const statusBadge = (status: string) => {
		switch (status) {
			case 'SIGNED':
				return 'bg-success/10 text-success border-success/20'
			case 'UNSIGNED':
				return 'bg-warning/10 text-warning border-warning/20'
			default:
				return 'bg-bg-muted text-text-muted border-border-default'
		}
	}

	const statusLabel = (status: string) => {
		switch (status) {
			case 'SIGNED':
				return 'Firmado'
			case 'UNSIGNED':
				return 'Sin Firmar'
			default:
				return status
		}
	}

	const formatDate = (dateStr: string) => {
		return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(
			new Date(dateStr),
		)
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-[1400px]">
			<!-- Header -->
			<header class="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">Consentimientos</h1>
					<p class="text-text-muted text-sm font-medium">
						Gestión de consentimientos firmados por clientes
					</p>
				</div>

				<div class="flex items-center gap-4">
					<div class="relative">
						<Search class="text-text-muted absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Buscar consentimiento..."
							class="input bg-bg-card hover:bg-bg-card focus:bg-bg-card focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-full border-none pl-11 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors focus:ring-4 md:w-64" />
					</div>
					<button
						class="btn bg-text-primary text-bg-app hover:bg-text-secondary flex h-12 items-center gap-2 rounded-full border-transparent px-6 shadow-md transition-colors"
						@click="openCreate">
						<Plus class="h-5 w-5" />
						<span class="font-bold">Nuevo Consentimiento</span>
					</button>
				</div>
			</header>

			<!-- Loading -->
			<div
				v-if="isPending"
				class="bg-bg-card border-border-subtle w-full space-y-4 rounded-3xl border p-6 shadow-sm">
				<div v-for="i in 5" :key="i" class="bg-bg-muted h-16 w-full animate-pulse rounded-2xl"></div>
			</div>

			<!-- Error -->
			<div
				v-else-if="error"
				class="bg-error/10 text-error border-error/20 rounded-3xl border p-8 text-center">
				Error al cargar consentimientos
			</div>

			<!-- Empty -->
			<div
				v-else-if="filteredConsents.length === 0"
				class="bg-bg-card border-border-subtle flex flex-col items-center justify-center rounded-3xl border py-24 text-center shadow-sm">
				<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<FileCheck class="text-text-muted/50 h-10 w-10" />
				</div>
				<p class="text-text-primary text-xl font-bold">No hay consentimientos registrados</p>
				<p class="text-text-muted mt-2 max-w-sm">
					Crea el primer consentimiento utilizando el botón superior.
				</p>
			</div>

			<!-- Table -->
			<div
				v-else
				class="bg-bg-card border-border-subtle w-full overflow-hidden rounded-3xl border shadow-sm">
				<div class="w-full overflow-x-auto">
					<table class="w-full min-w-[900px] text-left text-sm">
						<thead class="bg-bg-muted/50 text-text-secondary border-border-subtle border-b">
							<tr>
								<th class="px-6 py-4 font-bold">Cliente</th>
								<th class="px-6 py-4 font-bold">Documento</th>
								<th class="px-6 py-4 font-bold">Fecha Firma</th>
								<th class="px-6 py-4 text-center font-bold">Estado</th>
								<th class="px-6 py-4 font-bold">Notas</th>
								<th class="px-6 py-4 text-right font-bold">Acciones</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="item in filteredConsents"
								:key="item.consent_id"
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
									<a
										:href="item.document_url"
										target="_blank"
										class="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs font-bold transition-colors">
										<ExternalLink class="h-3.5 w-3.5" />
										Ver documento
									</a>
								</td>
								<td class="px-6 py-4 tabular-nums">
									<span class="text-text-primary font-medium">
										{{ formatDate(item.signed_date) }}
									</span>
								</td>
								<td class="px-6 py-4 text-center">
									<span
										class="inline-block rounded-full border px-3 py-1 text-xs font-bold"
										:class="statusBadge(item.status)">
										{{ statusLabel(item.status) }}
									</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-text-muted max-w-[200px] truncate text-xs">
										{{ item.notes || '—' }}
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

		<!-- Modales -->
		<ConsentFormModal v-model="showFormModal" :item-to-edit="selectedItem" />
		<UserDeleteModal
			:is-open="showDeleteModal"
			:user-name="selectedItem?.user?.name || ''"
			:is-deleting="deleting"
			custom-title="Eliminar Consentimiento"
			custom-message="¿Estás seguro de que deseas eliminar este consentimiento? Esta acción no se puede deshacer."
			@close="showDeleteModal = false"
			@confirm="confirmDelete" />
	</div>
</template>
