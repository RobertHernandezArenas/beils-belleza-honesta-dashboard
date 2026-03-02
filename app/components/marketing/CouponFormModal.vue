<script setup lang="ts">
	import { ref, reactive } from 'vue'

	const modalRef = ref<HTMLDialogElement | null>(null)
	const editingCoupon = ref<any | null>(null)
	const isSaving = ref(false)

	const emit = defineEmits(['refresh', 'toast'])

	const form = reactive({
		code: '',
		description: '',
		discount_type: 'percentage',
		discount_value: 0,
		min_purchase: null as number | null,
		max_uses: null as number | null,
		valid_from: '',
		valid_until: '',
		status: 'activo',
	})

	const showModal = (coupon: any | null) => {
		editingCoupon.value = coupon
		if (coupon) {
			form.code = coupon.code || ''
			form.description = coupon.description || ''
			form.discount_type = coupon.discount_type || 'percentage'
			form.discount_value = coupon.discount_value || 0
			form.min_purchase = coupon.min_purchase || null
			form.max_uses = coupon.max_uses || null
			form.valid_from = coupon.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 16) : ''
			form.valid_until = coupon.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 16) : ''
			form.status = coupon.status || 'activo'
		} else {
			// Reset
			form.code = ''
			form.description = ''
			form.discount_type = 'percentage'
			form.discount_value = 0
			form.min_purchase = null
			form.max_uses = null
			form.valid_from = ''
			form.valid_until = ''
			form.status = 'activo'
		}
		modalRef.value?.showModal()
	}

	const closeModal = () => {
		modalRef.value?.close()
	}

	const saveCoupon = async () => {
		isSaving.value = true
		try {
			const payload = {
				...form,
				discount_value: Number(form.discount_value),
				min_purchase: form.min_purchase ? Number(form.min_purchase) : null,
				max_uses: form.max_uses ? Number(form.max_uses) : null,
				valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
				valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
			}

			if (editingCoupon.value) {
				await $fetch(`/api/marketing/coupons/${editingCoupon.value.coupon_id}`, {
					method: 'PUT',
					body: payload,
				})
				emit('toast', 'Cupón actualizado', 'success')
			} else {
				await $fetch(`/api/marketing/coupons`, {
					method: 'POST',
					body: payload,
				})
				emit('toast', 'Cupón creado exitosamente', 'success')
			}
			emit('refresh')
			closeModal()
		} catch (error: any) {
			console.error('Error saving coupon:', error)
			emit('toast', error.data?.statusMessage || 'Error al guardar el cupón', 'error')
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
					{{ editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón' }}
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
				<form id="couponForm" @submit.prevent="saveCoupon" class="flex flex-col gap-5">
					<div class="flex items-center justify-between">
						<span class="text-text-muted text-sm font-bold tracking-wider uppercase">
							Estado del Cupón
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
						<label class="label pb-1" for="coup-code">
							<span class="label-text text-primary text-xs font-bold tracking-wider uppercase">
								Código del Cupón *
							</span>
						</label>
						<input
							id="coup-code"
							v-model="form.code"
							type="text"
							required
							placeholder="EJ: VERN2026"
							class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold tracking-widest uppercase shadow-sm transition-all focus:shadow-md focus:outline-none" />
					</div>

					<div class="form-control">
						<label class="label pb-1" for="coup-desc">
							<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
								Descripción
							</span>
						</label>
						<textarea
							id="coup-desc"
							v-model="form.description"
							rows="2"
							class="textarea bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover custom-scrollbar w-full rounded-xl px-4 py-3 text-sm font-medium shadow-sm transition-all focus:shadow-md focus:outline-none"></textarea>
					</div>

					<div class="divider my-0 opacity-50"></div>
					<span class="text-primary text-sm font-bold tracking-wider uppercase">
						Configuración de Descuento
					</span>

					<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
						<div class="form-control">
							<label class="label pb-1" for="coup-type">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Tipo *
								</span>
							</label>
							<select
								id="coup-type"
								v-model="form.discount_type"
								required
								class="select bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-all focus:shadow-md focus:outline-none">
								<option value="percentage">Porcentaje (%)</option>
								<option value="fixed_amount">Monto Fijo (€)</option>
							</select>
						</div>

						<div class="form-control">
							<label class="label pb-1" for="coup-value">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Valor de Descuento *
								</span>
							</label>
							<input
								id="coup-value"
								v-model="form.discount_value"
								type="number"
								step="0.01"
								min="0"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold tabular-nums shadow-sm transition-all focus:shadow-md focus:outline-none" />
						</div>
					</div>

					<div class="divider my-0 opacity-50"></div>
					<span class="text-text-muted text-sm font-bold tracking-wider uppercase">
						Límites y Vigencia (Opcional)
					</span>

					<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
						<div class="form-control">
							<label class="label pb-1" for="coup-min">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Compra mínima (€)
								</span>
							</label>
							<input
								id="coup-min"
								v-model="form.min_purchase"
								type="number"
								step="0.01"
								min="0"
								placeholder="0.00"
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium tabular-nums shadow-sm transition-all focus:shadow-md focus:outline-none" />
						</div>

						<div class="form-control">
							<label class="label pb-1" for="coup-uses">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Límite de Usos Totales
								</span>
							</label>
							<input
								id="coup-uses"
								v-model="form.max_uses"
								type="number"
								min="1"
								placeholder="Ej: 100"
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium tabular-nums shadow-sm transition-all focus:shadow-md focus:outline-none" />
						</div>

						<div class="form-control">
							<label class="label pb-1" for="coup-start">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Válido desde
								</span>
							</label>
							<input
								id="coup-start"
								v-model="form.valid_from"
								type="datetime-local"
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-all focus:shadow-md focus:outline-none" />
						</div>

						<div class="form-control">
							<label class="label pb-1" for="coup-end">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Válido hasta
								</span>
							</label>
							<input
								id="coup-end"
								v-model="form.valid_until"
								type="datetime-local"
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-all focus:shadow-md focus:outline-none" />
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
					form="couponForm"
					class="btn text-bg-card hover:bg-text-secondary/80 bg-text-secondary h-12 rounded-xl border-none px-8 font-bold shadow-md"
					:disabled="isSaving">
					<span v-if="isSaving" class="loading loading-spinner"></span>
					{{ editingCoupon ? 'Guardar Cambios' : 'Crear Cupón' }}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-text-secondary/40 backdrop-blur-sm">
			<button>close</button>
		</form>
	</dialog>
</template>
