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
				class="glass-card w-full space-y-4 rounded-3xl p-6 premium-shadow">
				<div v-for="i in 5" :key="i" class="bg-bg-muted/50 h-16 w-full animate-pulse rounded-2xl"></div>
			</div>

			<div
				v-else-if="error"
				class="bg-error/10 text-error border-error/20 rounded-3xl border p-8 text-center">
				{{ t('catalog.clients.errorLoad') }}
			</div>

			<div
				v-else-if="clients?.length === 0"
				class="glass-card flex flex-col items-center justify-center rounded-3xl py-24 text-center premium-shadow">
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
				class="glass-card flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl premium-shadow">
				<div class="w-full flex-1 overflow-auto custom-scrollbar">
					<table class="w-full min-w-[950px] relative text-left text-sm">
						<thead class="glass-header text-text-secondary sticky top-0 z-10 border-b">
							<tr>
								<th class="px-6 py-5 font-bold tracking-tight">Cliente</th>
								<th class="px-6 py-5 font-bold tracking-tight">Contacto</th>
								<th class="px-6 py-5 font-bold tracking-tight">Actividad</th>
								<th class="px-6 py-5 text-center font-bold tracking-tight">Estado</th>
								<th class="px-6 py-5 text-right font-bold tracking-tight">Acciones</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border-subtle/50">
							<tr
								v-for="client in clients"
								:key="client.user_id"
								class="premium-lift group hover:bg-white/60 cursor-pointer transition-all duration-300"
								@click="navigateTo(`/clientes/${client.user_id}`)">
								<td class="px-6 py-5">
									<div class="flex items-center gap-4">
										<div
											class="bg-linear-to-br from-primary/20 to-primary/5 text-primary border-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-xs transition-transform group-hover:scale-105">
											<span class="text-base font-black tracking-tight">
												{{ client.name.charAt(0) }}{{ client.surname.charAt(0) }}
											</span>
										</div>
										<div class="flex flex-col">
											<NuxtLink
												:to="`/clientes/${client.user_id}`"
												class="text-text-primary group-hover:text-primary text-sm font-bold transition-colors"
												@click.stop>
												{{ client.name }} {{ client.surname }}
											</NuxtLink>
											<p class="text-text-muted mt-0.5 max-w-[200px] truncate text-xs font-semibold tracking-tight opacity-70">
												{{ client.email }}
											</p>
										</div>
									</div>
								</td>
								<td class="px-6 py-5" @click.stop>
									<div class="flex flex-col">
										<span class="text-text-primary text-sm font-bold tabular-nums">{{ client.phone }}</span>
										<div class="mt-1 flex items-center gap-1.5">
											<span class="text-text-muted bg-bg-muted/50 rounded px-1.5 py-0.5 text-[10px] font-black tracking-widest uppercase">
												{{ client.document_type }}
											</span>
											<span class="text-text-muted text-[11px] font-bold tracking-tight">
												{{ revealedDocs[client.user_id] || client.document_number }}
											</span>
											<button
												class="text-text-muted hover:text-primary disabled:opacity-50 ml-0.5 transition-colors"
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
								<td class="px-6 py-5">
									<div class="flex items-center gap-2">
										<div
											class="text-text-secondary bg-white/50 border-border-default/30 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-xs transition-colors group-hover:border-primary/20 group-hover:bg-primary/5"
											title="Citas Reservadas">
											<CalendarDays class="text-primary/70 h-3.5 w-3.5" />
											<span class="tabular-nums">{{ client._count?.client_bookings || 0 }}</span>
										</div>
										<div
											class="text-text-secondary bg-white/50 border-border-default/30 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-xs transition-colors group-hover:border-primary/20 group-hover:bg-primary/5"
											title="Consentimientos Firmados">
											<ExternalLink class="text-primary/70 h-3.5 w-3.5" />
											<span class="tabular-nums">{{ client._count?.consents || 0 }}</span>
										</div>
									</div>
								</td>
								<td class="px-6 py-5 text-center">
									<span
										class="inline-flex items-center rounded-lg border px-3 py-1 text-[10px] font-black tracking-widest uppercase"
										:class="
											client.status === 'ON'
												? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
												: 'bg-rose-500/10 text-rose-700 border-rose-500/20'
										">
										<span class="mr-1.5 h-1 w-1 rounded-full bg-current"></span>
										{{ client.status === 'ON' ? 'Activo' : 'Inactivo' }}
									</span>
								</td>
								<td class="px-6 py-5 text-right">
									<div class="flex items-center justify-end gap-1.5">
										<NuxtLink
											:to="`/clientes/${client.user_id}`"
											class="btn btn-sm btn-circle btn-ghost text-text-muted hover:bg-primary/10 hover:text-primary transition-all duration-300"
											title="Ver Perfil"
											@click.stop>
											<UserCircle class="h-4.5 w-4.5" />
										</NuxtLink>
										<button
											class="btn btn-sm btn-circle btn-ghost text-text-muted hover:bg-bg-muted hover:text-text-primary transition-all duration-300"
											title="Editar Cliente"
											@click.stop="openEditModal(client)">
											<Edit class="h-4.5 w-4.5" />
										</button>
										<button
											class="btn btn-sm btn-circle btn-ghost text-rose-500/40 hover:bg-rose-500/10 hover:text-rose-600 transition-all duration-300"
											title="Eliminar Cliente"
											@click.stop="openDeleteModal(client)">
											<Trash2 class="h-4.5 w-4.5" />
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Pagination Footer -->
				<div class="glass-header flex flex-col items-center justify-between gap-4 border-t px-8 py-5 sm:flex-row">
					<div class="text-text-muted flex items-center gap-6 text-xs font-bold tracking-tight">
						<span class="hidden opacity-60 sm:inline">Mostrando {{ clients.length }} de {{ pagination.total }} clientes</span>
						<div class="flex items-center gap-3">
							<span class="opacity-60">Filas:</span>
							<select
								v-model="limit"
								class="select select-ghost select-xs focus:bg-white h-9 min-h-0 rounded-xl border-border-default/50 bg-white/50 px-3 font-black transition-all hover:bg-white"
								@change="page = 1">
								<option :value="10">10</option>
								<option :value="25">25</option>
								<option :value="50">50</option>
								<option :value="100">100</option>
							</select>
						</div>
					</div>

					<div class="join overflow-hidden rounded-2xl border border-border-default/50 shadow-sm">
						<button
							class="join-item btn btn-sm bg-white/50 border-none hover:bg-white disabled:bg-transparent disabled:opacity-30"
							:disabled="page === 1"
							@click="page--">
							«
						</button>
						<button
							class="join-item btn btn-sm bg-white/80 pointer-events-none border-none border-x border-border-default/20 px-6 font-bold tracking-tight">
							Pág. {{ page }} <span class="text-text-muted mx-1 font-medium italic">de</span> {{ pagination.totalPages || 1 }}
						</button>
						<button
							class="join-item btn btn-sm bg-white/50 border-none hover:bg-white disabled:bg-transparent disabled:opacity-30"
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
