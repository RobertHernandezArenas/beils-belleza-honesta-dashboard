<script lang="ts" setup>
	import { ref } from 'vue'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import {
		Search,
		Plus,
		UserCircle,
		Edit,
		Trash2,
		CreditCard,
		CalendarDays,
		ExternalLink,
		Eye,
		EyeOff,
	} from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'
	import AOS from 'aos'
	import ClientFormModal from '~/components/clients/ClientFormModal.vue'
	import UserDeleteModal from '~/components/users/UserDeleteModal.vue'
	import { useDataPrivacy } from '~/composables/useDataPrivacy'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Clientes | CRM' })

	const queryClient = useQueryClient()
	const { t } = useI18n()
	const searchQuery = useDebouncedRef('', 500)
	const page = ref(1)
	const limit = ref(7)

	const {
		data: clientsResponse,
		isPending,
		error,
	} = useQuery<any>({
		queryKey: ['clients-list', searchQuery, page, limit],
		queryFn: () =>
			$fetch('/api/clients', {
				query: {
					search: searchQuery.value,
					page: page.value,
					limit: limit.value,
				},
			}),
	})

	const clients = computed(() => clientsResponse.value?.data || [])
	const pagination = computed(() => clientsResponse.value?.pagination || { total: 0, totalPages: 0 })

	// Reset page when search changes
	watch(searchQuery, () => {
		page.value = 1
	})

	// Modales
	const showClientModal = ref(false)
	const showDeleteModal = ref(false)
	const selectedClient = ref<any>(null)

	// Acciones
	const openCreateModal = () => {
		selectedClient.value = null
		showClientModal.value = true
	}

	const openEditModal = (client: any) => {
		selectedClient.value = { ...client }
		showClientModal.value = true
	}

	const openDeleteModal = (client: any) => {
		selectedClient.value = client
		showDeleteModal.value = true
	}

	const { mutate: deleteClient, isPending: deleting } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/clients/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['clients-list'] })
			showDeleteModal.value = false
		},
		onError: (err: any) => {
			const msg = err.response?._data?.statusMessage || err.message
			alert(`Error: ${msg}`)
			showDeleteModal.value = false
		},
	})

	const confirmDelete = () => {
		if (selectedClient.value?.user_id) {
			deleteClient(selectedClient.value.user_id)
		}
	}

	const formatContact = (cl: any) => {
		return `${cl.phone} • ${cl.email}`
	}

	// Privacidad de documentos (Centralizada)
	const { revealedDocs, revealedLoading, toggleDocumentVisibility } = useDataPrivacy()
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 font-sans lg:p-10 lg:h-[calc(100dvh-73px)] lg:flex lg:flex-col lg:overflow-hidden">
		<div class="mx-auto flex h-full w-full max-w-[1400px] flex-col lg:overflow-hidden">
			<!-- Header -->
			<header data-aos="fade-up" class="mb-6 flex flex-col justify-between gap-4 lg:mb-10 lg:flex-row lg:items-center">
				<div>
					<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">
						{{ t('catalog.clients.title') }}
					</h1>
					<p class="text-text-muted text-sm font-medium">{{ t('catalog.clients.subtitle') }}</p>
				</div>

				<div class="flex w-full flex-col gap-4 sm:flex-row sm:items-center lg:w-auto">
					<div class="relative w-full sm:w-3/4 lg:w-auto">
						<Search class="text-text-muted absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Buscar nombre o correo..."
							class="input bg-bg-card hover:bg-bg-card focus:bg-bg-card focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-full border-none pl-11 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors focus:ring-4 sm:w-full lg:w-64" />
					</div>
					<button
						class="btn bg-text-primary text-bg-app hover:bg-text-secondary flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full border-transparent px-6 shadow-md transition-colors sm:w-1/4 lg:w-auto"
						@click="openCreateModal">
						<Plus class="h-5 w-5" />
						<span class="font-bold">{{ t('catalog.clients.newClient') }}</span>
					</button>
				</div>
			</header>

			<!-- Content -->
			<div
				v-if="isPending"
				class="bg-bg-card border-border-subtle w-full space-y-4 rounded-3xl border p-6 shadow-sm">
				<div v-for="i in 5" :key="i" class="bg-bg-muted h-16 w-full animate-pulse rounded-2xl"></div>
			</div>

			<div
				v-else-if="error"
				class="bg-error/10 text-error border-error/20 rounded-3xl border p-8 text-center">
				{{ t('catalog.clients.errorLoad') }}
			</div>

			<div
				v-else-if="clients?.length === 0"
				class="bg-bg-card border-border-subtle flex flex-col items-center justify-center rounded-3xl border py-24 text-center shadow-sm">
				<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<UserCircle class="text-text-muted/50 h-10 w-10" />
				</div>
				<p class="text-text-primary text-xl font-bold">{{ t('catalog.clients.emptyState') }}</p>
				<p class="text-text-muted mt-2 max-w-sm">{{ t('catalog.clients.emptyStateSub') }}</p>
			</div>

			<div
				v-else
				data-aos="fade-up"
				data-aos-delay="100"
				class="bg-bg-card border-border-subtle flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border shadow-sm">
				<div class="w-full flex-1 overflow-auto">
					<table class="w-full min-w-[950px] relative text-left text-sm">
						<thead class="bg-bg-muted/50 text-text-secondary border-border-subtle sticky top-0 z-10 border-b backdrop-blur-md">
							<tr>
								<th class="px-6 py-4 font-bold">Cliente</th>
								<th class="px-6 py-4 font-bold">Contacto</th>
								<th class="px-6 py-4 font-bold">Actividad</th>
								<th class="px-6 py-4 text-center font-bold">Estado</th>
								<th class="px-6 py-4 text-right font-bold">Acciones</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="client in clients"
								:key="client.user_id"
								class="border-border-default hover:bg-bg-muted/40 cursor-pointer border-b transition-colors last:border-0"
								@click="navigateTo(`/clientes/${client.user_id}`)">
								<td class="px-6 py-4">
									<div class="flex items-center gap-4">
										<div
											class="bg-primary/10 text-primary border-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border">
											<span class="text-lg font-bold tracking-tight">
												{{ client.name.charAt(0) }}{{ client.surname.charAt(0) }}
											</span>
										</div>
										<div class="flex flex-col">
											<NuxtLink
												:to="`/clientes/${client.user_id}`"
												class="text-text-primary hover:text-primary text-sm font-bold transition-colors"
												@click.stop>
												{{ client.name }} {{ client.surname }}
											</NuxtLink>
											<p class="text-text-muted mt-0.5 max-w-[200px] truncate text-xs font-medium">
												{{ client.email }}
											</p>
										</div>
									</div>
								</td>
								<td class="px-6 py-4" @click.stop>
									<div class="flex flex-col">
										<span class="text-text-primary font-medium">{{ client.phone }}</span>
										<div class="mt-0.5 flex items-center gap-2">
											<span class="text-text-muted text-xs font-medium uppercase">
												{{ client.document_type }}:
												{{
													revealedDocs[client.user_id] || client.document_number
												}}
											</span>
											<button
												class="text-text-muted hover:text-primary disabled:opacity-50 transition-colors"
												role="button"
												:aria-label="revealedDocs[client.user_id] ? 'Ocultar' : 'Mostrar'"
												:disabled="revealedLoading[client.user_id]"
												@click="toggleDocumentVisibility(client.user_id, client.document_number)">
												<span v-if="revealedLoading[client.user_id]" class="loading loading-spinner loading-xs h-3 w-3"></span>
												<component
													v-else
													:is="revealedDocs[client.user_id] ? EyeOff : Eye"
													class="h-3.5 w-3.5" />
											</button>
										</div>
									</div>
								</td>
								<td class="px-6 py-4">
									<div class="flex items-center gap-2">
										<div
											class="text-text-secondary bg-bg-muted border-border-default/50 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold"
											title="Citas Reservadas">
											<CalendarDays class="text-primary h-3.5 w-3.5" />
											<span>{{ client._count?.client_bookings || 0 }}</span>
										</div>
										<div
											class="text-text-secondary bg-bg-muted border-border-default/50 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold"
											title="Consentimientos Firmados">
											<ExternalLink class="text-primary h-3.5 w-3.5" />
											<span>{{ client._count?.consents || 0 }}</span>
										</div>
									</div>
								</td>
								<td class="px-6 py-4 text-center">
									<span
										class="inline-block rounded-full border px-3 py-1 text-xs font-bold"
										:class="
											client.status === 'ON'
												? 'bg-success/10 text-success border-success/20'
												: 'bg-error/10 text-error border-error/20'
										">
										{{ client.status === 'ON' ? 'Activo' : 'Inactivo' }}
									</span>
								</td>
								<td class="px-6 py-4 text-right">
									<div class="flex items-center justify-end gap-1">
										<NuxtLink
											:to="`/clientes/${client.user_id}`"
											class="btn btn-sm btn-circle btn-ghost text-text-muted hover:bg-bg-muted hover:text-primary tooltip tooltip-left transition-colors"
											data-tip="Ver Perfil"
											aria-label="Ver Perfil"
											@click.stop>
											<UserCircle class="h-4 w-4" />
										</NuxtLink>
										<button
											class="btn btn-sm btn-circle btn-ghost text-text-muted hover:bg-bg-muted hover:text-text-primary tooltip tooltip-left transition-colors"
											data-tip="Editar Cliente"
											aria-label="Editar"
											@click.stop="openEditModal(client)">
											<Edit class="h-4 w-4" />
										</button>
										<button
											class="btn btn-sm btn-circle btn-ghost text-error/70 hover:bg-error/10 hover:text-error tooltip tooltip-left transition-colors"
											data-tip="Eliminar Cliente"
											aria-label="Eliminar"
											@click.stop="openDeleteModal(client)">
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Pagination Footer -->
				<div class="bg-bg-muted/30 border-border-subtle flex flex-col items-center justify-between gap-4 border-t px-6 py-4 backdrop-blur-md sm:flex-row">
					<div class="text-text-muted flex items-center gap-4 text-xs font-medium">
						<span class="hidden sm:inline">Mostrando {{ clients.length }} de {{ pagination.total }} clientes</span>
						<div class="flex items-center gap-2">
							<span class="shrink-0">Filas:</span>
							<select
								v-model="limit"
								class="select select-ghost select-xs focus:bg-bg-card h-8 min-h-0 rounded-lg border-none bg-transparent font-bold"
								@change="page = 1">
								<option :value="10">10</option>
								<option :value="25">25</option>
								<option :value="50">50</option>
								<option :value="100">100</option>
							</select>
						</div>
					</div>

					<div class="join">
						<button
							class="join-item btn btn-sm bg-bg-card border-border-subtle hover:bg-bg-muted h-9 min-h-0 px-3 transition-colors disabled:opacity-50"
							:disabled="page === 1"
							@click="page--">
							«
						</button>
						<button
							class="join-item btn btn-sm bg-bg-card border-border-subtle hover:bg-bg-muted h-9 min-h-0 min-w-[40px] px-3 transition-colors">
							Pág. {{ page }} de {{ pagination.totalPages || 1 }}
						</button>
						<button
							class="join-item btn btn-sm bg-bg-card border-border-subtle hover:bg-bg-muted h-9 min-h-0 px-3 transition-colors disabled:opacity-50"
							:disabled="page >= pagination.totalPages"
							@click="page++">
							»
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Modales -->
		<ClientFormModal v-model="showClientModal" :client-to-edit="selectedClient" />
		<UserDeleteModal
			:is-open="showDeleteModal"
			:user-name="selectedClient?.name || ''"
			:is-deleting="deleting"
			custom-title="Eliminar Cliente"
			custom-message="¿Estás seguro de que deseas eliminar este perfil de cliente? Se perderán sus consentimientos y cuestionarios asociados."
			@close="showDeleteModal = false"
			@confirm="confirmDelete" />
	</div>
</template>
