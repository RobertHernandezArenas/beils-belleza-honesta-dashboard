<script setup lang="ts">
	import { ref, reactive, computed } from 'vue'
	import { useQuery } from '@tanstack/vue-query'

	const modalRef = ref<HTMLDialogElement | null>(null)
	const editingBooking = ref<any | null>(null)
	const isSaving = ref(false)
	const activeTab = ref<'service' | 'pack'>('service')

	const emit = defineEmits(['refresh', 'toast'])

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

	// Fetch Data for Dropdowns
	const { data: clients } = useQuery({
		queryKey: ['clients-agenda'],
		queryFn: () => $fetch('/api/clients'),
	})

	const { data: staff } = useQuery({
		queryKey: ['staff-agenda'],
		// Usually we would fetch users with role STAFF or ADMIN
		queryFn: () => $fetch('/api/users'),
	})

	const { data: services } = useQuery({
		queryKey: ['services-agenda'],
		queryFn: () => $fetch('/api/services'),
	})

	const { data: packs } = useQuery({
		queryKey: ['packs-agenda'],
		queryFn: () => $fetch('/api/catalog/packs'),
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
		modalRef.value?.showModal()
	}

	const closeModal = () => {
		modalRef.value?.close()
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

	defineExpose({ showModal })
</script>

<template>
	<dialog ref="modalRef" class="modal">
		<div
			class="modal-box bg-bg-card text-text-secondary relative w-11/12 max-w-2xl overflow-hidden rounded-4xl p-0 shadow-xl">
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
					<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
						<div class="form-control">
							<label class="label pb-1" for="book-client">
								<span class="label-text text-primary text-xs font-bold tracking-wider uppercase">
									Cliente *
								</span>
							</label>
							<select
								id="book-client"
								v-model="form.client_id"
								required
								class="select bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold shadow-sm transition-colors transition-transform focus:shadow-md focus:outline-none">
								<option value="" disabled>Selecciona un cliente</option>
								<option v-for="client in clients" :key="client.user_id" :value="client.user_id">
									{{ client.name }} {{ client.surname }} ({{ client.phone }})
								</option>
							</select>
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
								class="select bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors transition-transform focus:shadow-md focus:outline-none">
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
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold uppercase shadow-sm transition-colors transition-transform focus:shadow-md focus:outline-none" />
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
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold tabular-nums shadow-sm transition-colors transition-transform focus:shadow-md focus:outline-none" />
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
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold tabular-nums shadow-sm transition-colors transition-transform focus:shadow-md focus:outline-none" />
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
								class="tab h-8 rounded-lg px-6 text-xs font-bold tracking-wider transition-colors transition-transform"
								:class="
									activeTab === 'service'
										? 'bg-bg-card text-text-primary shadow-sm'
										: 'text-text-muted hover:text-text-secondary'
								"
								@click="setItemsType('service')">
								Servicio Individual
							</a>
							<a
								class="tab h-8 rounded-lg px-6 text-xs font-bold tracking-wider transition-colors transition-transform"
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
								class="select bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold shadow-sm transition-colors transition-transform focus:shadow-md focus:outline-none">
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
							class="textarea bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover custom-scrollbar w-full rounded-xl px-4 py-3 text-sm font-medium shadow-sm transition-colors transition-transform focus:shadow-md focus:outline-none"></textarea>
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
					class="btn text-bg-card hover:bg-text-secondary/80 bg-text-secondary h-12 rounded-xl border-none px-8 font-bold shadow-md"
					:disabled="isSaving">
					<span v-if="isSaving" class="loading loading-spinner"></span>
					{{ editingBooking ? 'Guardar Cambios' : 'Confirmar Reserva' }}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-text-secondary/40 backdrop-blur-sm">
			<button>close</button>
		</form>
	</dialog>
</template>
