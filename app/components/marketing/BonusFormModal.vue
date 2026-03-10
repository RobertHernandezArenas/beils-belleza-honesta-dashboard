<script setup lang="ts">
	import { useQuery } from '@tanstack/vue-query'
	import { useModalAnimation } from '~/composables/useModalAnimation'

	interface ServiceOption {
		service_id: string
		name: string
		price: number
	}

	const modalRef = ref<HTMLDialogElement | null>(null)
	const editingBonus = ref<any | null>(null)
	const isSaving = ref(false)
	const { animateOpen, animateClose } = useModalAnimation()

	const emit = defineEmits(['refresh', 'toast'])

	const form = reactive({
		name: '',
		description: '',
		total_sessions: 5,
		price: 0,
		service_id: '',
		status: 'activo',
	})

	// Fetch available services to link with the bonus
	const { data: services } = useQuery({
		queryKey: ['services-for-bonus'],
		queryFn: () => $fetch<ServiceOption[]>('/api/services'),
	})

	const showModal = (bonus: any | null) => {
		editingBonus.value = bonus
		if (bonus) {
			form.name = bonus.name || ''
			form.description = bonus.description || ''
			form.total_sessions = bonus.total_sessions || 5
			form.price = bonus.price || 0
			form.service_id = bonus.service_id || ''
			form.status = bonus.status || 'activo'
		} else {
			form.name = ''
			form.description = ''
			form.total_sessions = 5
			form.price = 0
			form.service_id = ''
			form.status = 'activo'
		}
		animateOpen(modalRef.value, { staggerChildren: true })
	}

	const closeModal = () => {
		animateClose(modalRef.value)
	}

	const saveBonus = async () => {
		isSaving.value = true
		try {
			const payload = {
				...form,
				total_sessions: Number(form.total_sessions),
				price: Number(form.price),
				service_id: form.service_id || null, // send null if empty string to avoid clearing constraint errors assuming its optional
			}

			if (editingBonus.value) {
				await $fetch(`/api/marketing/bonuses/${editingBonus.value.bonus_id}`, {
					method: 'PUT',
					body: payload,
				})
				emit('toast', 'Bono actualizado', 'success')
			} else {
				await $fetch(`/api/marketing/bonuses`, {
					method: 'POST',
					body: payload,
				})
				emit('toast', 'Bono creado exitosamente', 'success')
			}
			emit('refresh')
			closeModal()
		} catch (error: any) {
			console.error('Error saving bonus:', error)
			emit('toast', error.data?.statusMessage || 'Error al guardar el bono', 'error')
		} finally {
			isSaving.value = false
		}
	}

	const pricePerSession = computed(() => {
		if (form.total_sessions && form.price && form.total_sessions > 0) {
			return form.price / form.total_sessions
		}
		return 0
	})

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
					{{ editingBonus ? 'Editar Bono' : 'Nuevo Bono' }}
				</h3>
				<button
					type="button"
					class="btn btn-sm btn-circle btn-ghost text-text-light hover:bg-text-primary"
					@click="closeModal">
					✕
				</button>
			</div>

			<!-- Body -->
			<div class="custom-scrollbar max-h-[70vh] overflow-y-auto px-8 py-6">
				<form id="bonusForm" @submit.prevent="saveBonus" class="flex flex-col gap-5">
					<div class="flex items-center justify-between">
						<span class="text-text-muted text-sm font-bold tracking-wider uppercase">
							Estado del Bono
						</span>
						<div class="form-control flex-row items-center gap-3">
							<span class="label-text text-xs font-bold tracking-wider uppercase">Activo</span>
							<input
								type="checkbox"
								class="toggle toggle-success toggle-sm"
								:checked="form.status === 'activo'"
								@change="form.status = form.status === 'activo' ? 'inactivo' : 'activo'" />
						</div>
					</div>

					<div class="form-control">
						<label class="label pb-1" for="bonus-name">
							<span class="label-text text-primary text-xs font-bold tracking-wider uppercase">
								Nombre del Bono *
							</span>
						</label>
						<input
							id="bonus-name"
							v-model="form.name"
							type="text"
							required
							placeholder="Ej: Bono 5x Limpieza Facial"
							class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold shadow-sm transition-[background-color,border-color,box-shadow] focus:shadow-md focus:outline-none" />
					</div>

					<div class="form-control">
						<label class="label pb-1" for="bonus-desc">
							<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
								Descripción
							</span>
						</label>
						<textarea
							id="bonus-desc"
							v-model="form.description"
							rows="2"
							placeholder="Opcional. Términos y condiciones, notas..."
							class="textarea bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover custom-scrollbar w-full rounded-xl px-4 py-3 text-sm font-medium shadow-sm transition-[background-color,border-color,box-shadow] focus:shadow-md focus:outline-none"></textarea>
					</div>

					<div class="form-control">
						<label class="label pb-1" for="bonus-service">
							<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
								Servicio Vinculado (Opcional)
							</span>
						</label>
						<select
							id="bonus-service"
							v-model="form.service_id"
							class="select bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-[background-color,border-color,box-shadow] focus:shadow-md focus:outline-none">
							<option value="">-- No vincular a un servicio específico --</option>
							<option
								v-for="service in services"
								:key="service.service_id"
								:value="service.service_id">
								{{ service.name }} ({{ formatCurrency(service.price) }})
							</option>
						</select>
						<span class="text-text-muted mt-1 ml-1 text-[10px] font-bold tracking-wider uppercase">
							Si se deja vacío, puede canjearse por cualquier servicio del mismo coste pactado.
						</span>
					</div>

					<div class="divider my-0 opacity-50"></div>
					<span class="text-primary text-sm font-bold tracking-wider uppercase">Precios de Venta</span>

					<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
						<div class="form-control">
							<label class="label pb-1" for="bonus-qty">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Nº de Sesiones *
								</span>
							</label>
							<input
								id="bonus-qty"
								v-model="form.total_sessions"
								type="number"
								min="1"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold tabular-nums shadow-sm transition-[background-color,border-color,box-shadow] focus:shadow-md focus:outline-none" />
						</div>

						<div class="form-control">
							<label class="label pb-1" for="bonus-price">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Precio de Venta (€) *
								</span>
							</label>
							<input
								id="bonus-price"
								v-model="form.price"
								type="number"
								step="0.01"
								min="0"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold tabular-nums shadow-sm transition-[background-color,border-color,box-shadow] focus:shadow-md focus:outline-none" />
							<span class="text-text-muted mt-2 ml-1 text-xs font-bold">
								Equivale a:
								<span class="text-primary">{{ formatCurrency(pricePerSession) }}</span>
								por sesión
							</span>
						</div>
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
					form="bonusForm"
					class="btn text-bg-card hover:bg-text-secondary/80 bg-text-secondary h-12 rounded-xl border-none px-8 font-bold shadow-md"
					:disabled="isSaving">
					<span v-if="isSaving" class="loading loading-spinner"></span>
					{{ editingBonus ? 'Guardar Cambios' : 'Crear Bono' }}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-text-secondary/40 backdrop-blur-sm">
			<button>close</button>
		</form>
	</dialog>
</template>
