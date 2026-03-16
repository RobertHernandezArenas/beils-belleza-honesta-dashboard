<script setup lang="ts">
	import { z } from 'zod'
	import { useMutation, useQueryClient } from '@tanstack/vue-query'
	import { ShieldOff, Save, AlertCircle, Edit, X } from 'lucide-vue-next'
	import { useModalAnimation } from '~/composables/useModalAnimation'
	import ClientAutocomplete from '~/components/shared/ClientAutocomplete.vue'

	const props = defineProps<{
		modelValue: boolean
		itemToEdit?: any | null
	}>()

	const emit = defineEmits(['update:modelValue', 'close'])
	const queryClient = useQueryClient()

	const localVisible = ref(props.modelValue)
	const revokeDialog = ref<HTMLDialogElement | null>(null)
	const { animateOpen, animateClose } = useModalAnimation()

	const selectedClient = ref<any | null>(null)

	watch(
		() => props.modelValue,
		newVal => {
			localVisible.value = newVal
			if (newVal) {
				initForm()
				nextTick(() => {
					animateOpen(revokeDialog.value, { staggerChildren: true })
				})
			} else if (revokeDialog.value?.open) {
				animateClose(revokeDialog.value)
			}
		},
	)

	watch(
		() => localVisible.value,
		newVal => {
			emit('update:modelValue', newVal)
			if (!newVal) emit('close')
		},
	)

	const form = reactive({
		user_id: '',
		reason: '',
		date_revoked: new Date().toISOString().split('T')[0],
	})

	const errors = reactive({
		user_id: '',
	})

	const apiError = ref('')
	const isEditing = computed(() => !!props.itemToEdit?.revoke_id)

	const initForm = () => {
		apiError.value = ''
		Object.keys(errors).forEach(key => (errors[key as keyof typeof errors] = ''))

		if (props.itemToEdit) {
			form.user_id = props.itemToEdit.user_id || ''
			form.reason = props.itemToEdit.reason || ''
			form.date_revoked = props.itemToEdit.date_revoked
				? new Date(props.itemToEdit.date_revoked).toISOString().split('T')[0]
				: new Date().toISOString().split('T')[0]
			
			// Set selected client for display
			selectedClient.value = props.itemToEdit.user || null
		} else {
			form.user_id = ''
			form.reason = ''
			form.date_revoked = new Date().toISOString().split('T')[0]
			selectedClient.value = null
		}
	}

	const clearError = (field: keyof typeof errors) => {
		errors[field] = ''
		apiError.value = ''
	}

	const revokeSchema = z.object({
		user_id: z.string().min(1, 'Selecciona un cliente'),
		reason: z.string().optional(),
		date_revoked: z.string().optional(),
	})

	const { mutate: saveItem, isPending } = useMutation({
		mutationFn: async (data: any) => {
			const url = isEditing.value
				? `/api/clients/revokes/${props.itemToEdit!.revoke_id}`
				: '/api/clients/revokes'
			const method = isEditing.value ? 'PUT' : 'POST'
			return await $fetch(url, { method, body: data })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['revokes-list'] })
			localVisible.value = false
		},
		onError: (err: any) => {
			apiError.value = err.response?._data?.statusMessage || err.message || 'Error al guardar'
		},
	})

	const onSubmit = () => {
		Object.keys(errors).forEach(key => (errors[key as keyof typeof errors] = ''))
		apiError.value = ''

		const result = revokeSchema.safeParse(form)
		if (!result.success) {
			const formatted = result.error.format()
			errors.user_id = (formatted as any).user_id?._errors[0] || ''
			return
		}

		saveItem(result.data)
	}
</script>

<template>
	<dialog ref="revokeDialog" class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': localVisible }">
		<div
			class="modal-box bg-bg-app border-border-default m-4 max-w-2xl border p-0 shadow-xl sm:rounded-3xl">
			<!-- Header -->
			<div class="bg-bg-card border-border-subtle flex items-center justify-between border-b p-6 sm:rounded-t-3xl">
				<div class="flex items-center gap-4">
					<div
						class="bg-error/10 text-error flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
						<Edit v-if="isEditing" class="h-6 w-6" />
						<ShieldOff v-else class="h-6 w-6" />
					</div>
					<div>
						<h3 class="text-text-primary text-lg font-bold">
							{{ isEditing ? 'Editar Revocación' : 'Nueva Revocación' }}
						</h3>
						<p class="text-text-muted text-sm font-medium">
							{{
								isEditing
									? 'Actualiza los datos de la revocación'
									: 'Registra una revocación de consentimiento'
							}}
						</p>
					</div>
				</div>
				<button @click="localVisible = false" class="btn btn-ghost btn-circle btn-sm text-text-muted">
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Error Alert -->
			<div
				v-if="apiError"
				class="bg-error/10 border-error/20 mx-6 mt-6 flex items-start gap-3 rounded-xl border p-4">
				<AlertCircle class="text-error mt-0.5 h-5 w-5 shrink-0" />
				<p class="text-error text-sm font-medium">{{ apiError }}</p>
			</div>

			<!-- Formulario -->
			<form @submit.prevent="onSubmit" class="space-y-5 p-6">
				<div class="grid grid-cols-1 gap-5">
					<!-- Client Selection (Autocomplete) -->
					<div>
						<ClientAutocomplete
							v-model="form.user_id"
							v-model:selected-client="selectedClient"
							:disabled="isEditing"
							:error="errors.user_id"
							@clear-error="clearError('user_id')"
						/>
					</div>

					<!-- Fecha de Revocación -->
					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								Fecha de Revocación
							</span>
						</label>
						<input
							v-model="form.date_revoked"
							type="date"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4" />
					</div>

					<!-- Motivo -->
					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								Motivo
							</span>
						</label>
						<textarea
							v-model="form.reason"
							rows="4"
							placeholder="Describir el motivo de la revocación..."
							class="textarea bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"></textarea>
					</div>
				</div>

				<!-- Acciones -->
				<div class="modal-action border-border-subtle mt-8 flex gap-3 border-t pt-4">
					<button
						type="button"
						class="btn btn-ghost hover:bg-bg-muted text-text-muted h-12 flex-1 rounded-xl border-transparent font-bold transition-colors"
						@click="localVisible = false"
						:disabled="isPending">
						Cancelar
					</button>
					<button
						type="submit"
						class="btn bg-text-primary text-bg-app hover:bg-text-secondary flex h-12 flex-1 items-center gap-2 rounded-xl border-transparent shadow-md transition-colors hover:shadow-lg"
						:disabled="isPending">
						<span v-if="isPending" class="loading loading-spinner loading-sm"></span>
						<template v-else>
							<Save class="h-4 w-4" />
							<span class="font-bold tracking-wide">
								{{ isEditing ? 'Guardar Cambios' : 'Registrar Revocación' }}
							</span>
						</template>
					</button>
				</div>
			</form>
		</div>
		<form method="dialog" class="modal-backdrop bg-black/40 backdrop-blur-sm">
			<button @click="localVisible = false">Cerrar</button>
		</form>
	</dialog>
</template>
