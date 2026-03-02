<script setup lang="ts">
	import { ref, reactive } from 'vue'

	const modalRef = ref<HTMLDialogElement | null>(null)
	const editingService = ref<any | null>(null)
	const isSaving = ref(false)

	const emit = defineEmits(['refresh', 'toast'])

	const form = reactive({
		name: '',
		description: '',
		code: '',
		price: 0,
		tax_rate: 21,
		duration: 30, // Default 30 minutes
		status: 'activo',
	})

	const showModal = (service: any | null) => {
		editingService.value = service
		if (service) {
			form.name = service.name || ''
			form.description = service.description || ''
			form.code = service.code || ''
			form.price = service.price || 0
			form.tax_rate = service.tax_rate || 21
			form.duration = service.duration || 30
			form.status = service.status || 'activo'
		} else {
			// Reset
			form.name = ''
			form.description = ''
			form.code = ''
			form.price = 0
			form.tax_rate = 21
			form.duration = 60
			form.status = 'activo'
		}
		modalRef.value?.showModal()
	}

	const closeModal = () => {
		modalRef.value?.close()
	}

	const saveService = async () => {
		isSaving.value = true
		try {
			const payload = {
				...form,
				price: Number(form.price),
				tax_rate: Number(form.tax_rate),
				duration: Number(form.duration),
			}

			if (editingService.value) {
				await $fetch(`/api/services/${editingService.value.service_id}`, {
					method: 'PUT',
					body: payload,
				})
				emit('toast', 'Servicio actualizado', 'success')
			} else {
				await $fetch(`/api/services`, {
					method: 'POST',
					body: payload,
				})
				emit('toast', 'Servicio creado exitosamente', 'success')
			}
			emit('refresh')
			closeModal()
		} catch (error: any) {
			console.error('Error saving service:', error)
			emit('toast', error.data?.statusMessage || 'Error al guardar el servicio', 'error')
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
					{{ editingService ? 'Editar Servicio' : 'Nuevo Servicio' }}
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
				<form id="serviceForm" @submit.prevent="saveService" class="flex flex-col gap-5">
					<div class="flex items-center justify-between">
						<span class="text-text-muted text-sm font-bold tracking-wider uppercase">
							Estado del Servicio
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

					<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
						<div class="form-control md:col-span-2">
							<label class="label pb-1" for="svc-name">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Nombre del Servicio *
								</span>
							</label>
							<input
								id="svc-name"
								v-model="form.name"
								type="text"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-all focus:shadow-md focus:outline-none" />
						</div>

						<div class="form-control">
							<label class="label pb-1" for="svc-code">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Código Interno
								</span>
							</label>
							<input
								id="svc-code"
								v-model="form.code"
								type="text"
								placeholder="SVC-01"
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-all focus:shadow-md focus:outline-none" />
						</div>
					</div>

					<div class="form-control">
						<label class="label pb-1" for="svc-desc">
							<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
								Descripción
							</span>
						</label>
						<textarea
							id="svc-desc"
							v-model="form.description"
							rows="3"
							class="textarea bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover custom-scrollbar w-full rounded-xl px-4 py-3 text-sm font-medium shadow-sm transition-all focus:shadow-md focus:outline-none"></textarea>
					</div>

					<div class="divider my-0 opacity-50"></div>
					<span class="text-text-muted text-sm font-bold tracking-wider uppercase">
						Facturación y Agenda
					</span>

					<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
						<div class="form-control">
							<label class="label pb-1" for="svc-price">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Precio Venta (IVA inc.) *
								</span>
							</label>
							<input
								id="svc-price"
								v-model="form.price"
								type="number"
								step="0.01"
								min="0"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold tabular-nums shadow-sm transition-all focus:shadow-md focus:outline-none" />
						</div>

						<div class="form-control">
							<label class="label pb-1" for="svc-tax">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Impuesto (%) *
								</span>
							</label>
							<input
								id="svc-tax"
								v-model="form.tax_rate"
								type="number"
								step="0.1"
								min="0"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-all focus:shadow-md focus:outline-none" />
						</div>

						<div class="form-control">
							<label class="label pb-1" for="svc-duration">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Duración (Mins) *
								</span>
							</label>
							<input
								id="svc-duration"
								v-model="form.duration"
								type="number"
								min="1"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover text-primary h-11 w-full rounded-xl px-4 text-sm font-bold tabular-nums shadow-sm transition-all focus:shadow-md focus:outline-none" />
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
					form="serviceForm"
					class="btn text-bg-card hover:bg-text-secondary/80 bg-text-secondary h-12 rounded-xl border-none px-8 font-bold shadow-md"
					:disabled="isSaving">
					<span v-if="isSaving" class="loading loading-spinner"></span>
					{{ editingService ? 'Guardar Cambios' : 'Crear Servicio' }}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-text-secondary/40 backdrop-blur-sm">
			<button>close</button>
		</form>
	</dialog>
</template>
