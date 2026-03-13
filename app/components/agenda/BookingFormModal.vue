<script setup lang="ts">
	import { useQuery } from '@tanstack/vue-query'
	import { useModalAnimation } from '~/composables/useModalAnimation'
	import { Search, User, ShieldCheck, Calendar, Clock, Scissors, Package, CheckCircle2, History, Pencil } from 'lucide-vue-next'

	interface ClientItem {
		user_id: string
		name: string
		surname: string
		phone: string
		[key: string]: any
	}

	interface StaffItem {
		user_id: string
		name: string
		surname: string
		[key: string]: any
	}

	interface ServiceItem {
		service_id: string
		name: string
		price: number
		[key: string]: any
	}

	interface PackItem {
		pack_id: string
		name: string
		price: number
		[key: string]: any
	}

	// Fetch Data for Dropdowns
	const { data: clients } = useQuery({
		queryKey: ['clients-agenda'],
		queryFn: async () => {
			const res = await $fetch<any>('/api/clients', { query: { limit: 500 } })
			return res?.data || []
		},
	})

	const { data: staff } = useQuery({
		queryKey: ['staff-agenda'],
		queryFn: () => $fetch<StaffItem[]>('/api/users', {
			query: { roles: 'ADMIN,STAFF' }
		}),
	})

	const { data: services } = useQuery({
		queryKey: ['services-agenda'],
		queryFn: () => $fetch<ServiceItem[]>('/api/services'),
	})

	const { data: packs } = useQuery({
		queryKey: ['packs-agenda'],
		queryFn: () => $fetch<PackItem[]>('/api/catalog/packs'),
	})

	const modalRef = ref<HTMLDialogElement | null>(null)
	const editingBooking = ref<any | null>(null)
	const isSaving = ref(false)
	const activeTab = ref<'service' | 'pack'>('service')
	const { animateOpen, animateClose } = useModalAnimation()

	const emit = defineEmits(['refresh', 'toast'])

	const clientSearch = ref('')
	const isClientDropdownOpen = ref(false)

	const selectClient = (client: ClientItem) => {
		form.client_id = client.user_id
		clientSearch.value = `${client.name} ${client.surname || ''}`.trim()
		isClientDropdownOpen.value = false
	}

	const onClientBlur = () => {
		setTimeout(() => {
			isClientDropdownOpen.value = false
		}, 200)
	}

	const form = reactive({
		client_id: '',
		staff_id: '',
		item_type: 'service',
		item_id: '',
		status: 'pending',
		booking_date: new Date().toISOString().slice(0, 10),
		start_time: '10:00',
		duration: 60,
		notes: '',
	})

	const filteredClients = computed(() => {
		const all = clients.value
		if (!all || !Array.isArray(all)) return []
		
		const q = (clientSearch.value || '').toLowerCase().trim()
		console.log('--- COMBOBOX DEBUG ---')
		console.log('Query:', q)
		console.log('Raw clients in computed:', all.length)
		if (all.length > 0) {
			console.log('First client sample:', all[0])
		}

		if (!q) return all.slice(0, 10)
		
		const filtered = all.filter(c => {
			if (!c) return false
			const n = (c.name || '').toLowerCase()
			const s = (c.surname || '').toLowerCase()
			const f = `${n} ${s}`.trim()
			const p = (c.phone || '')
			const matches = n.includes(q) || s.includes(q) || f.includes(q) || p.includes(q)
			return matches
		}).slice(0, 15)
		
		console.log('Filtered result count:', filtered.length)
		return filtered
	})

	const showModal = (booking: any | null, defaultDate: Date) => {
		editingBooking.value = booking

		if (booking) {
			form.client_id = booking.client_id || ''
			form.staff_id = booking.staff_id || ''
			form.item_type = booking.item_type || 'service'
			activeTab.value = booking.item_type as 'service' | 'pack'
			form.item_id = booking.item_id || ''
			form.status = booking.status || 'pending'
			form.booking_date = new Date(booking.booking_date).toISOString().slice(0, 10)
			form.start_time = booking.start_time || '10:00'
			form.duration = booking.duration || 60
			form.notes = booking.notes || ''
		} else {
			form.client_id = ''
			form.staff_id = ''
			form.item_type = 'service'
			activeTab.value = 'service'
			form.item_id = ''
			form.status = 'pending'
			form.booking_date = defaultDate.toISOString().slice(0, 10)
			form.start_time = '10:00'
			form.duration = 60
			form.notes = ''
		}
		
		isClientDropdownOpen.value = false
		
		// Define a helper for name syncing
		const syncClientName = () => {
			if (form.client_id && clients.value) {
				const c = Array.isArray(clients.value) 
					? clients.value.find(x => x.user_id === form.client_id)
					: null
				if (c) {
					clientSearch.value = `${c.name} ${c.surname || ''}`.trim()
					console.log('syncClientName: Success:', clientSearch.value)
				} else {
					console.warn('syncClientName: Client ID not found in current list:', form.client_id)
				}
			} else {
				clientSearch.value = ''
			}
		}

		syncClientName()

		animateOpen(modalRef.value, { staggerChildren: true })
	}

	const closeModal = () => {
		animateClose(modalRef.value)
	}

	const setItemsType = (type: 'service' | 'pack') => {
		activeTab.value = type
		form.item_type = type
		form.item_id = '' // Reset selection on change
	}

	const saveBooking = async () => {
		isSaving.value = true
		try {
			const payload = {
				...form,
				duration: Number(form.duration),
			}

			if (editingBooking.value) {
				await $fetch(`/api/agenda/bookings/${editingBooking.value.booking_id}`, {
					method: 'PUT',
					body: payload,
				})
				emit('toast', 'Cita actualizada correctamente', 'success')
			} else {
				await $fetch(`/api/agenda/bookings`, {
					method: 'POST',
					body: payload,
				})
				emit('toast', 'Cita programada con éxito', 'success')
			}
			emit('refresh')
			closeModal()
		} catch (error: any) {
			console.error('Error saving booking:', error)
			emit('toast', error.data?.statusMessage || 'Error al guardar la cita', 'error')
		} finally {
			isSaving.value = false
		}
	}

	// Robust watch for both clients data and form.client_id
	watch([clients, () => form.client_id], ([newClients, newId]) => {
		if (newId && Array.isArray(newClients)) {
			const c = (newClients as ClientItem[]).find(x => x.user_id === (newId as string))
			if (c) {
				const fullName = `${c.name} ${c.surname || ''}`.trim()
				if (clientSearch.value !== fullName) {
					clientSearch.value = fullName
					console.log('watch(sync): Synced client name:', fullName)
				}
			}
		}
	}, { immediate: true })

	defineExpose({ showModal })
</script>

<template>
	<dialog ref="modalRef" class="modal">
		<div
			class="modal-box bg-bg-card text-text-secondary relative w-11/12 max-w-2xl rounded-4xl p-0 shadow-xl">
			<!-- Header -->
			<div
				class="bg-bg-muted/30 border-border-default sticky top-0 z-20 flex items-center justify-between border-b px-8 py-5 backdrop-blur-md">
				<h3 class="text-xl font-bold tracking-tight">
					{{ editingBooking ? 'Editar Reserva' : 'Agendar Nueva Cita' }}
				</h3>
				<div class="flex items-center gap-3">
					<select
						v-if="editingBooking"
						v-model="form.status"
						class="select select-sm bg-bg-card border-border-default rounded-lg font-bold">
						<option value="pending">Pendiente</option>
						<option value="confirmed">Confirmada</option>
						<option value="completed">Finalizada</option>
						<option value="cancelled">Cancelada</option>
						<option value="no_show">No asiste</option>
					</select>
					<button
						type="button"
						class="btn btn-sm btn-circle btn-ghost text-text-light hover:bg-text-primary"
						@click="closeModal">
						✕
					</button>
				</div>
			</div>

			<!-- Body -->
			<div class="custom-scrollbar max-h-[70vh] overflow-y-auto px-8 py-6">
				<form id="bookingForm" @submit.prevent="saveBooking" class="flex flex-col gap-6">
					<!-- Participants Row -->
					<div class="relative z-40 grid grid-cols-1 gap-5 md:grid-cols-2">
						<div class="form-control">
							<label class="label pb-1" for="book-client">
								<span class="label-text text-primary text-xs font-bold tracking-wider uppercase">
									Cliente *
								</span>
							</label>
							<ClientOnly>
								<div class="relative w-full">
									<div class="relative">
										<Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
										<input 
											v-model="clientSearch" 
											type="text" 
											id="book-client"
											required
											placeholder="Buscar cliente..." 
											autocomplete="off"
											class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-primary/40 h-11 w-full rounded-xl pl-9 text-xs font-bold shadow-sm transition-all focus:outline-none"
											@focus="isClientDropdownOpen = true"
											@blur="onClientBlur" />
									</div>
									
									<!-- Results Dropdown -->
									<div v-show="isClientDropdownOpen" 
										 class="bg-white! border-border-default absolute z-10000 top-full left-0 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border shadow-2xl opacity-100!">
										<div v-if="filteredClients && filteredClients.length > 0">
											<button 
												v-for="client in filteredClients" 
												:key="client.user_id"
												type="button" 
												class="hover:bg-bg-muted flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors"
												:class="{ 'bg-primary/5': form.client_id === client.user_id }"
												@mousedown="selectClient(client)">
												<span class="text-sm font-bold text-text-primary">
													{{ client.name }} {{ client.surname || '' }}
												</span>
												<span class="text-text-muted text-[10px] font-medium">
													{{ client.phone }}
												</span>
											</button>
										</div>
										<div v-else class="px-4 py-8 text-center text-xs font-medium text-text-muted italic">
											No se han encontrado resultados.
										</div>
									</div>
								</div>
							</ClientOnly>
						</div>

						<div class="form-control">
							<label class="label pb-1" for="book-staff">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Profesional Asignado
								</span>
							</label>
							<select
								id="book-staff"
								v-model="form.staff_id"
								class="select bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors focus:shadow-md focus:outline-none">
								<option value="">-- Sin asignar --</option>
								<option v-for="user in staff" :key="user.user_id" :value="user.user_id">
									{{ user.name }} {{ user.surname }}
								</option>
							</select>
						</div>
					</div>

					<div class="divider my-0 opacity-50"></div>

					<!-- Schedule Row -->
					<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
						<div class="form-control">
							<label class="label pb-1" for="book-date">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Fecha *
								</span>
							</label>
							<input
								id="book-date"
								v-model="form.booking_date"
								type="date"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold uppercase shadow-sm transition-colors focus:shadow-md focus:outline-none" />
						</div>

						<div class="form-control">
							<label class="label pb-1" for="book-time">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Hora Inicio *
								</span>
							</label>
							<input
								id="book-time"
								v-model="form.start_time"
								type="time"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold tabular-nums shadow-sm transition-colors focus:shadow-md focus:outline-none" />
						</div>

						<div class="form-control">
							<label class="label pb-1" for="book-dur">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Duración (Min)*
								</span>
							</label>
							<input
								id="book-dur"
								v-model="form.duration"
								type="number"
								step="5"
								min="5"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold tabular-nums shadow-sm transition-colors focus:shadow-md focus:outline-none" />
						</div>
					</div>

					<div class="divider my-0 opacity-50"></div>

					<!-- Service Selection -->
					<div class="flex flex-col gap-2">
						<span class="label-text text-primary pl-1 text-xs font-bold tracking-wider uppercase">
							Servicio o Paquete a agendar *
						</span>

						<div
							class="tabs tabs-boxed bg-bg-muted/50 border-border-default mt-1 mb-2 flex w-fit rounded-xl border p-1">
							<a
								class="tab h-8 rounded-lg px-6 text-xs font-bold tracking-wider transition-colors"
								:class="
									activeTab === 'service'
										? 'bg-bg-card text-text-primary shadow-sm'
										: 'text-text-muted hover:text-text-secondary'
								"
								@click="setItemsType('service')">
								Servicio Individual
							</a>
							<a
								class="tab h-8 rounded-lg px-6 text-xs font-bold tracking-wider transition-colors"
								:class="
									activeTab === 'pack'
										? 'bg-bg-card text-text-primary shadow-sm'
										: 'text-text-muted hover:text-text-secondary'
								"
								@click="setItemsType('pack')">
								Paquete (Packs)
							</a>
						</div>

						<div class="form-control relative">
							<select
								v-model="form.item_id"
								required
								class="select bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold shadow-sm transition-colors focus:shadow-md focus:outline-none">
								<option value="" disabled>-- Selecciona un ítem --</option>
								<template v-if="activeTab === 'service'">
									<option v-for="s in services" :key="s.service_id" :value="s.service_id">
										{{ s.name }} ({{ formatCurrency(s.price) }})
									</option>
								</template>
								<template v-else>
									<option v-for="p in packs" :key="p.pack_id" :value="p.pack_id">
										{{ p.name }} ({{ formatCurrency(p.price) }})
									</option>
								</template>
							</select>
						</div>
					</div>

					<!-- Notes -->
					<div class="form-control">
						<label class="label pb-1" for="book-notes">
							<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
								Notas y Comentarios (Opcional)
							</span>
						</label>
						<textarea
							id="book-notes"
							v-model="form.notes"
							rows="2"
							placeholder="Especificaciones del cliente, alertas, etc."
							class="textarea bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover custom-scrollbar w-full rounded-xl px-4 py-3 text-sm font-medium shadow-sm transition-colors focus:shadow-md focus:outline-none"></textarea>
					</div>
				</form>
			</div>

			<!-- Footer -->
			<div
				class="bg-bg-muted/30 border-border-default sticky bottom-0 z-20 flex justify-end gap-3 border-t px-8 py-5 backdrop-blur-md">
				<button
					type="button"
					class="btn btn-ghost text-text-muted hover:bg-bg-hover h-12 rounded-xl px-6"
					@click="closeModal">
					Cancelar
				</button>
				<button
					type="submit"
					form="bookingForm"
					class="btn text-bg-card hover:bg-text-secondary/80 bg-text-secondary flex h-12 items-center gap-2 rounded-xl border-none px-8 font-bold shadow-md"
					:disabled="isSaving">
					<span v-if="isSaving" class="loading loading-spinner"></span>
					<CheckCircle2 v-else class="h-4 w-4" />
					{{ editingBooking ? 'Guardar Cambios' : 'Confirmar Reserva' }}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-text-secondary/40 backdrop-blur-sm">
			<button>close</button>
		</form>
	</dialog>
</template>
