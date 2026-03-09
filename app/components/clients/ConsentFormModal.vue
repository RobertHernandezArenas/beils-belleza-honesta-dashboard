<script setup lang="ts">
	import { ref, reactive, watch, computed } from 'vue'
	import { z } from 'zod'
	import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
	import { FileCheck, Save, AlertCircle, Edit } from 'lucide-vue-next'

	const props = defineProps<{
		modelValue: boolean
		itemToEdit?: any | null
	}>()

	const emit = defineEmits(['update:modelValue', 'close'])
	const queryClient = useQueryClient()

	const localVisible = ref(props.modelValue)

	watch(
		() => props.modelValue,
		newVal => {
			localVisible.value = newVal
			if (newVal) initForm()
		},
	)

	watch(
		() => localVisible.value,
		newVal => {
			emit('update:modelValue', newVal)
			if (!newVal) emit('close')
		},
	)

	// Fetch clients for the select
	const { data: clients } = useQuery<any[]>({
		queryKey: ['clients-list'],
		queryFn: () => $fetch('/api/clients'),
	})

	const form = reactive({
		user_id: '',
		document_url: '',
		signed_date: new Date().toISOString().split('T')[0],
		status: 'active',
		notes: '',
	})

	const errors = reactive({
		user_id: '',
		document_url: '',
	})

	const apiError = ref('')
	const isEditing = computed(() => !!props.itemToEdit?.consent_id)

	const initForm = () => {
		apiError.value = ''
		Object.keys(errors).forEach(key => (errors[key as keyof typeof errors] = ''))

		if (props.itemToEdit) {
			form.user_id = props.itemToEdit.user_id || ''
			form.document_url = props.itemToEdit.document_url || ''
			form.signed_date = props.itemToEdit.signed_date
				? new Date(props.itemToEdit.signed_date).toISOString().split('T')[0]
				: new Date().toISOString().split('T')[0]
			form.status = props.itemToEdit.status || 'active'
			form.notes = props.itemToEdit.notes || ''
		} else {
			form.user_id = ''
			form.document_url = ''
			form.signed_date = new Date().toISOString().split('T')[0]
			form.status = 'active'
			form.notes = ''
		}
	}

	const clearError = (field: keyof typeof errors) => {
		errors[field] = ''
		apiError.value = ''
	}

	const consentSchema = z.object({
		user_id: z.string().min(1, 'Selecciona un cliente'),
		document_url: z.string().url('La URL debe ser válida'),
		signed_date: z.string().optional(),
		status: z.enum(['active', 'expired', 'revoked']),
		notes: z.string().optional(),
	})

	const { mutate: saveItem, isPending } = useMutation({
		mutationFn: async (data: any) => {
			const url = isEditing.value
				? `/api/clients/consents/${props.itemToEdit!.consent_id}`
				: '/api/clients/consents'
			const method = isEditing.value ? 'PUT' : 'POST'
			return await $fetch(url, { method, body: data })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['consents-list'] })
			localVisible.value = false
		},
		onError: (err: any) => {
			apiError.value = err.response?._data?.statusMessage || err.message || 'Error al guardar'
		},
	})

	const onSubmit = () => {
		Object.keys(errors).forEach(key => (errors[key as keyof typeof errors] = ''))
		apiError.value = ''

		const result = consentSchema.safeParse(form)
		if (!result.success) {
			const formatted = result.error.format()
			errors.user_id = (formatted as any).user_id?._errors[0] || ''
			errors.document_url = (formatted as any).document_url?._errors[0] || ''
			return
		}

		saveItem(result.data)
	}
</script>

<template>
	<dialog class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': localVisible }">
		<div
			class="modal-box bg-bg-app border-border-default m-4 max-w-2xl border p-0 shadow-xl sm:rounded-3xl">
			<!-- Header -->
			<div class="bg-bg-card border-border-subtle flex items-center gap-4 border-b p-6 sm:rounded-t-3xl">
				<div
					class="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
					<Edit v-if="isEditing" class="h-6 w-6" />
					<FileCheck v-else class="h-6 w-6" />
				</div>
				<div>
					<h3 class="text-text-primary text-lg font-bold">
						{{ isEditing ? 'Editar Consentimiento' : 'Nuevo Consentimiento' }}
					</h3>
					<p class="text-text-muted text-sm font-medium">
						{{
							isEditing
								? 'Actualiza los datos del consentimiento'
								: 'Registra un consentimiento firmado'
						}}
					</p>
				</div>
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
				<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
					<div class="form-control md:col-span-2">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								Cliente *
							</span>
						</label>
						<select
							v-model="form.user_id"
							class="select bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
							:class="{ 'border-error focus:border-error focus:ring-error/20': errors.user_id }"
							:disabled="isEditing"
							@change="clearError('user_id')">
							<option value="" disabled>Selecciona un cliente...</option>
							<option v-for="c in clients" :key="c.user_id" :value="c.user_id">
								{{ c.name }} {{ c.surname }} — {{ c.email }}
							</option>
						</select>
						<span v-if="errors.user_id" class="text-error mt-1.5 ml-1 text-xs font-bold">
							{{ errors.user_id }}
						</span>
					</div>

					<div class="form-control md:col-span-2">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								URL del Documento *
							</span>
						</label>
						<input
							v-model="form.document_url"
							type="url"
							placeholder="https://docs.ejemplo.com/consentimiento.pdf"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
							:class="{ 'border-error focus:border-error focus:ring-error/20': errors.document_url }"
							@input="clearError('document_url')" />
						<span v-if="errors.document_url" class="text-error mt-1.5 ml-1 text-xs font-bold">
							{{ errors.document_url }}
						</span>
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								Fecha de Firma
							</span>
						</label>
						<input
							v-model="form.signed_date"
							type="date"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4" />
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								Estado
							</span>
						</label>
						<select
							v-model="form.status"
							class="select bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4">
							<option value="active">Activo</option>
							<option value="expired">Expirado</option>
							<option value="revoked">Revocado</option>
						</select>
					</div>

					<div class="form-control md:col-span-2">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								Notas
							</span>
						</label>
						<textarea
							v-model="form.notes"
							rows="3"
							placeholder="Notas adicionales..."
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
								{{ isEditing ? 'Guardar' : 'Crear Consentimiento' }}
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
