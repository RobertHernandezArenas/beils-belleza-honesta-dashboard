<script setup lang="ts">
	import { RefreshCcw } from 'lucide-vue-next'
	import { useModalAnimation } from '~/composables/useModalAnimation'

	const modalRef = ref<HTMLDialogElement | null>(null)
	const editingCard = ref<any | null>(null)
	const isSaving = ref(false)
	const { animateOpen, animateClose } = useModalAnimation()

	const emit = defineEmits(['refresh', 'toast'])

	const form = reactive({
		code: '',
		initial_balance: 0,
		current_balance: 0,
		issue_date: new Date().toISOString().slice(0, 16),
		expiration_date: '',
		status: 'active',
	})

	const generateCode = () => {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
		let result = ''
		for (let i = 0; i < 12; i++) {
			if (i > 0 && i % 4 === 0) result += '-'
			result += chars.charAt(Math.floor(Math.random() * chars.length))
		}
		form.code = result
	}

	const showModal = (card: any | null) => {
		editingCard.value = card
		if (card) {
			form.code = card.code || ''
			form.initial_balance = card.initial_balance || 0
			form.current_balance = card.current_balance || 0
			form.issue_date = card.issue_date
				? new Date(card.issue_date).toISOString().slice(0, 16)
				: new Date().toISOString().slice(0, 16)
			form.expiration_date = card.expiration_date
				? new Date(card.expiration_date).toISOString().slice(0, 16)
				: ''
			form.status = card.status || 'active'
		} else {
			generateCode()
			form.initial_balance = 0
			form.current_balance = 0
			form.issue_date = new Date().toISOString().slice(0, 16)
			form.expiration_date = ''
			form.status = 'active'
		}
		animateOpen(modalRef.value, { staggerChildren: true })
	}

	const closeModal = () => {
		animateClose(modalRef.value)
	}

	const saveGiftcard = async () => {
		isSaving.value = true
		try {
			const payload = {
				...form,
				initial_balance: Number(form.initial_balance),
				current_balance: editingCard.value ? Number(form.current_balance) : Number(form.initial_balance), // If new, current = initial
				issue_date: form.issue_date ? new Date(form.issue_date).toISOString() : null,
				expiration_date: form.expiration_date ? new Date(form.expiration_date).toISOString() : null,
			}

			if (editingCard.value) {
				await $fetch(`/api/marketing/giftcards/${editingCard.value.giftcard_id}`, {
					method: 'PUT',
					body: payload,
				})
				emit('toast', 'Tarjeta actualizada', 'success')
			} else {
				await $fetch(`/api/marketing/giftcards`, {
					method: 'POST',
					body: payload,
				})
				emit('toast', 'Tarjeta emitida exitosamente', 'success')
			}
			emit('refresh')
			closeModal()
		} catch (error: any) {
			console.error('Error saving giftcard:', error)
			emit('toast', error.data?.statusMessage || 'Error al guardar la tarjeta', 'error')
		} finally {
			isSaving.value = false
		}
	}

	defineExpose({ showModal })
</script>

<template>
	<dialog ref="modalRef" class="modal">
		<div
			class="modal-box bg-bg-card text-text-secondary relative w-11/12 max-w-lg overflow-hidden rounded-4xl p-0 shadow-xl">
			<!-- Header -->
			<div
				class="bg-bg-muted/30 border-border-default sticky top-0 z-20 flex items-center justify-between border-b px-8 py-5 backdrop-blur-md">
				<h3 class="text-xl font-bold tracking-tight">
					{{ editingCard ? 'Modificar Tarjeta' : 'Emitir Nueva Tarjeta' }}
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
				<form id="cardForm" @submit.prevent="saveGiftcard" class="flex flex-col gap-5">
					<div v-if="editingCard" class="flex items-center justify-between">
						<span class="text-text-muted text-sm font-bold tracking-wider uppercase">
							Estado de Tarjeta
						</span>
						<select
							v-model="form.status"
							class="select select-sm bg-bg-muted border-border-default focus:bg-bg-card h-9 rounded-lg px-3 text-sm font-bold">
							<option value="active">Activa</option>
							<option value="used">Agotada</option>
							<option value="expired">Expirada</option>
						</select>
					</div>

					<div class="form-control">
						<label class="label pb-1" for="card-code">
							<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
								Número de Tarjeta / PIN *
							</span>
						</label>
						<div class="relative">
							<input
								id="card-code"
								v-model="form.code"
								type="text"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-12 w-full rounded-xl pr-12 text-center font-mono text-xl font-black tracking-[0.2em] shadow-sm transition-colors focus:shadow-md focus:outline-none" />
							<button
								type="button"
								v-if="!editingCard"
								@click="generateCode"
								class="btn btn-ghost btn-sm btn-circle text-primary hover:bg-primary/10 absolute top-1/2 right-2 -translate-y-1/2">
								<RefreshCcw class="h-4 w-4" />
							</button>
						</div>
					</div>

					<div class="divider my-0 opacity-50"></div>

					<div class="grid grid-cols-2 gap-5">
						<div class="form-control">
							<label class="label pb-1" for="card-initial">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Saldo Inicial (€) *
								</span>
							</label>
							<input
								id="card-initial"
								v-model="form.initial_balance"
								type="number"
								step="0.01"
								min="0"
								required
								:disabled="editingCard !== null"
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-bold tabular-nums shadow-sm transition-colors focus:shadow-md focus:outline-none disabled:opacity-50" />
						</div>

						<div class="form-control" v-if="editingCard">
							<label class="label pb-1" for="card-current">
								<span class="label-text text-primary text-xs font-bold tracking-wider uppercase">
									Saldo Restante (€) *
								</span>
							</label>
							<input
								id="card-current"
								v-model="form.current_balance"
								type="number"
								step="0.01"
								min="0"
								required
								class="input bg-primary/10 border-primary text-primary focus:bg-bg-card focus:ring-primary h-11 w-full rounded-xl px-4 text-sm font-bold tabular-nums shadow-sm transition-colors focus:shadow-md focus:outline-none" />
						</div>
					</div>

					<div class="grid grid-cols-1 gap-5">
						<div class="form-control">
							<label class="label pb-1" for="card-issue">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Fecha de Emisión *
								</span>
							</label>
							<input
								id="card-issue"
								v-model="form.issue_date"
								type="datetime-local"
								required
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors focus:shadow-md focus:outline-none" />
						</div>

						<div class="form-control">
							<label class="label pb-1" for="card-end">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									Fecha de Caducidad (Opcional)
								</span>
							</label>
							<input
								id="card-end"
								v-model="form.expiration_date"
								type="datetime-local"
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-border-subtle/40 hover:bg-bg-hover h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-[background-color,border-color,box-shadow] duration-200 focus:shadow-md focus:outline-none" />
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
					form="cardForm"
					class="btn text-bg-card hover:bg-text-secondary/80 bg-text-secondary h-12 rounded-xl border-none px-8 font-bold shadow-md"
					:disabled="isSaving">
					<span v-if="isSaving" class="loading loading-spinner"></span>
					{{ editingCard ? 'Guardar Cambios' : 'Emitir Tarjeta' }}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-text-secondary/40 backdrop-blur-sm">
			<button>close</button>
		</form>
	</dialog>
</template>
