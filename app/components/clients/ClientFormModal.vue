<script setup lang="ts">
	import { ref, reactive, watch, computed } from 'vue'
	import { z } from 'zod'
	import { useMutation, useQueryClient } from '@tanstack/vue-query'
	import { UserPlus, Save, AlertCircle, Edit, User } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'

	const props = defineProps<{
		modelValue: boolean
		clientToEdit?: any | null
	}>()

	const emit = defineEmits(['update:modelValue', 'close'])
	const { t } = useI18n()
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

	const form = reactive({
		name: '',
		surname: '',
		email: '',
		phone: '',
		document_type: 'DNI',
		document_number: '',
		status: 'ON',
	})

	const errors = reactive({
		name: '',
		surname: '',
		email: '',
		phone: '',
		document_number: '',
	})

	const apiError = ref('')

	const isEditing = computed(() => !!props.clientToEdit?.user_id)

	const initForm = () => {
		apiError.value = ''
		Object.keys(errors).forEach(key => (errors[key as keyof typeof errors] = ''))

		if (props.clientToEdit) {
			form.name = props.clientToEdit.name || ''
			form.surname = props.clientToEdit.surname || ''
			form.email = props.clientToEdit.email || ''
			form.phone = props.clientToEdit.phone || ''
			form.document_type = props.clientToEdit.document_type || 'DNI'
			form.document_number = props.clientToEdit.document_number || ''
			form.status = props.clientToEdit.status || 'ON'
		} else {
			form.name = ''
			form.surname = ''
			form.email = ''
			form.phone = ''
			form.document_type = 'DNI'
			form.document_number = ''
			form.status = 'ON'
		}
	}

	const clearError = (field: keyof typeof errors) => {
		errors[field] = ''
		apiError.value = ''
	}

	const clientSchema = z.object({
		name: z.string().min(2, 'El nombre es obligatorio'),
		surname: z.string().min(2, 'El apellido es obligatorio'),
		email: z.string().email('Email inválido'),
		phone: z.string().min(6, 'El teléfono es obligatorio'),
		document_type: z.enum(['DNI', 'PASSPORT', 'NIE']),
		document_number: z.string().min(3, 'Documento inválido'),
		status: z.enum(['ON', 'OFF']),
	})

	const { mutate: saveClient, isPending } = useMutation({
		mutationFn: async (data: typeof form) => {
			const url = isEditing.value ? `/api/clients/${props.clientToEdit!.user_id}` : '/api/clients'
			const method = isEditing.value ? 'PUT' : 'POST'

			return await $fetch(url, {
				method,
				body: data,
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['clients-list'] })
			localVisible.value = false
		},
		onError: (err: any) => {
			apiError.value = err.response?._data?.statusMessage || err.message || 'Error al guardar el cliente'
		},
	})

	const onSubmit = () => {
		Object.keys(errors).forEach(key => (errors[key as keyof typeof errors] = ''))
		apiError.value = ''

		const result = clientSchema.safeParse(form)
		if (!result.success) {
			const formatted = result.error.format()
			errors.name = formatted.name?._errors[0] || ''
			errors.surname = formatted.surname?._errors[0] || ''
			errors.email = formatted.email?._errors[0] || ''
			errors.phone = formatted.phone?._errors[0] || ''
			errors.document_number = formatted.document_number?._errors[0] || ''
			return
		}

		saveClient(result.data as any)
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
					<UserPlus v-else class="h-6 w-6" />
				</div>
				<div>
					<h3 class="text-text-primary text-lg font-bold">
						{{ isEditing ? t('catalog.clients.edit') : t('catalog.clients.newClient') }}
					</h3>
					<p class="text-text-muted text-sm font-medium">
						{{
							isEditing
								? 'Actualiza los datos de este cliente'
								: 'Registra un cliente en el sistema CRM'
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
					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								Nombre *
							</span>
						</label>
						<input
							v-model="form.name"
							type="text"
							placeholder="Iñigo"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors transition-transform focus:ring-4"
							:class="{ 'border-error focus:border-error focus:ring-error/20': errors.name }"
							@input="clearError('name')" />
						<span v-if="errors.name" class="text-error mt-1.5 ml-1 text-xs font-bold">
							{{ errors.name }}
						</span>
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								Apellidos *
							</span>
						</label>
						<input
							v-model="form.surname"
							type="text"
							placeholder="López..."
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors transition-transform focus:ring-4"
							:class="{ 'border-error focus:border-error focus:ring-error/20': errors.surname }"
							@input="clearError('surname')" />
						<span v-if="errors.surname" class="text-error mt-1.5 ml-1 text-xs font-bold">
							{{ errors.surname }}
						</span>
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								Correo Electrónico *
							</span>
						</label>
						<input
							v-model="form.email"
							type="email"
							placeholder="cliente@correo.com"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors transition-transform focus:ring-4"
							:class="{ 'border-error focus:border-error focus:ring-error/20': errors.email }"
							@input="clearError('email')" />
						<span v-if="errors.email" class="text-error mt-1.5 ml-1 text-xs font-bold">
							{{ errors.email }}
						</span>
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								Teléfono *
							</span>
						</label>
						<input
							v-model="form.phone"
							type="tel"
							placeholder="+34 600..."
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors transition-transform focus:ring-4"
							:class="{ 'border-error focus:border-error focus:ring-error/20': errors.phone }"
							@input="clearError('phone')" />
						<span v-if="errors.phone" class="text-error mt-1.5 ml-1 text-xs font-bold">
							{{ errors.phone }}
						</span>
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								Tipo Documento
							</span>
						</label>
						<select
							v-model="form.document_type"
							class="select bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors transition-transform focus:ring-4">
							<option value="DNI">DNI</option>
							<option value="NIE">NIE</option>
							<option value="PASSPORT">Pasaporte</option>
						</select>
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								Nº Documento *
							</span>
						</label>
						<input
							v-model="form.document_number"
							type="text"
							placeholder="12345678Z"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors transition-transform focus:ring-4"
							:class="{
								'border-error focus:border-error focus:ring-error/20': errors.document_number,
							}"
							@input="clearError('document_number')" />
						<span v-if="errors.document_number" class="text-error mt-1.5 ml-1 text-xs font-bold">
							{{ errors.document_number }}
						</span>
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
						class="btn bg-text-primary text-bg-app hover:bg-text-secondary flex h-12 flex-1 items-center gap-2 rounded-xl border-transparent shadow-md transition-colors transition-transform hover:shadow-lg"
						:disabled="isPending">
						<span v-if="isPending" class="loading loading-spinner loading-sm"></span>
						<template v-else>
							<Save class="h-4 w-4" />
							<span class="font-bold tracking-wide">
								{{ isEditing ? t('common.save') : t('catalog.clients.newClient') }}
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
