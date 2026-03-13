<script setup lang="ts">
	import { z } from 'zod'
	import { useMutation, useQueryClient } from '@tanstack/vue-query'
	import { UserPlus, Save, AlertCircle, Edit, User } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'
	import { useModalAnimation } from '~/composables/useModalAnimation'

	const props = defineProps<{
		modelValue: boolean
		clientToEdit?: any | null
	}>()

	const emit = defineEmits(['update:modelValue', 'close'])
	const { t } = useI18n()
	const queryClient = useQueryClient()
	const { animateOpen, animateClose } = useModalAnimation()

	const localVisible = ref(props.modelValue)
	const clientDialog = ref<HTMLDialogElement | null>(null)

	watch(
		() => props.modelValue,
		newVal => {
			localVisible.value = newVal
			if (newVal) {
				initForm()
				nextTick(() => {
					animateOpen(clientDialog.value, { staggerChildren: true })
				})
			} else if (clientDialog.value?.open) {
				animateClose(clientDialog.value)
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
		name: '',
		surname: '',
		email: '',
		phone: '',
		document_type: 'DNI',
		document_number: '',
		address: '',
		city: '',
		country: 'España',
		postal_code: '',
		gender: '',
		birth_date: new Date().toISOString().split('T')[0],
		status: 'ON',
	})

	const errors = reactive({
		name: '',
		surname: '',
		email: '',
		phone: '',
		document_number: '',
		address: '',
		city: '',
		country: '',
		postal_code: '',
		birth_date: '',
	})

	const apiError = ref('')

	const isEditing = computed(() => !!props.clientToEdit?.user_id)

	const initForm = async () => {
		apiError.value = ''
		Object.keys(errors).forEach(key => (errors[key as keyof typeof errors] = ''))

		if (props.clientToEdit) {
			let fullDocNumber = props.clientToEdit.document_number || ''

			// If the document number is masked (starts with ****), fetch the real one
			if (fullDocNumber.startsWith('****')) {
				try {
					const res: any = await $fetch(`/api/clients/${props.clientToEdit.user_id}`, {
						query: { reveal: 'true' },
					})
					if (res && res.document_number) {
						fullDocNumber = res.document_number
					}
				} catch (err) {
					console.error('Error fetching full document for edit:', err)
				}
			}

			form.name = props.clientToEdit.name || ''
			form.surname = props.clientToEdit.surname || ''
			form.email = props.clientToEdit.email || ''
			form.phone = props.clientToEdit.phone || ''
			form.document_type = props.clientToEdit.document_type || 'DNI'
			form.document_number = fullDocNumber
			form.address = props.clientToEdit.address || ''
			form.city = props.clientToEdit.city || ''
			form.country = props.clientToEdit.country || 'España'
			form.postal_code = props.clientToEdit.postal_code || ''
			form.gender = props.clientToEdit.gender || ''
			form.birth_date = props.clientToEdit.birth_date ? new Date(props.clientToEdit.birth_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
			form.status = props.clientToEdit.status || 'ON'
		} else {
			form.name = ''
			form.surname = ''
			form.email = ''
			form.phone = ''
			form.document_type = 'DNI'
			form.document_number = ''
			form.address = ''
			form.city = ''
			form.country = 'España'
			form.postal_code = ''
			form.gender = ''
			form.birth_date = new Date().toISOString().split('T')[0]
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
		address: z.string().optional().default(''),
		city: z.string().optional().default(''),
		country: z.string().optional().default('España'),
		postal_code: z.string().optional().default(''),
		gender: z.string().optional().default(''),
		birth_date: z.string().optional().default(new Date().toISOString()),
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
			errors.address = formatted.address?._errors[0] || ''
			errors.city = formatted.city?._errors[0] || ''
			errors.country = formatted.country?._errors[0] || ''
			errors.postal_code = formatted.postal_code?._errors[0] || ''
			errors.birth_date = formatted.birth_date?._errors[0] || ''
			return
		}

		saveClient(result.data as any)
	}
</script>

<template>
	<dialog ref="clientDialog" class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': localVisible }">
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
								{{ t('catalog.clients.form.name') }}
							</span>
						</label>
						<input
							v-model="form.name"
							type="text"
							placeholder="Iñigo"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
							:class="{ 'border-error focus:border-error focus:ring-error/20': errors.name }"
							@input="clearError('name')" />
						<span v-if="errors.name" class="text-error mt-1.5 ml-1 text-xs font-bold">
							{{ errors.name }}
						</span>
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								{{ t('catalog.clients.form.surname') }}
							</span>
						</label>
						<input
							v-model="form.surname"
							type="text"
							placeholder="López..."
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
							:class="{ 'border-error focus:border-error focus:ring-error/20': errors.surname }"
							@input="clearError('surname')" />
						<span v-if="errors.surname" class="text-error mt-1.5 ml-1 text-xs font-bold">
							{{ errors.surname }}
						</span>
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								{{ t('catalog.clients.form.email') }}
							</span>
						</label>
						<input
							v-model="form.email"
							type="email"
							placeholder="cliente@correo.com"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
							:class="{ 'border-error focus:border-error focus:ring-error/20': errors.email }"
							@input="clearError('email')" />
						<span v-if="errors.email" class="text-error mt-1.5 ml-1 text-xs font-bold">
							{{ errors.email }}
						</span>
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								{{ t('catalog.clients.form.phone') }}
							</span>
						</label>
						<input
							v-model="form.phone"
							type="tel"
							placeholder="+34 600..."
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
							:class="{ 'border-error focus:border-error focus:ring-error/20': errors.phone }"
							@input="clearError('phone')" />
						<span v-if="errors.phone" class="text-error mt-1.5 ml-1 text-xs font-bold">
							{{ errors.phone }}
						</span>
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								{{ t('catalog.clients.form.documentType') }}
							</span>
						</label>
						<select
							v-model="form.document_type"
							class="select bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4">
							<option value="DNI">DNI</option>
							<option value="NIE">NIE</option>
							<option value="PASSPORT">{{ t('catalog.clients.form.passport') }}</option>
						</select>
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								{{ t('catalog.clients.form.documentNumber') }}
							</span>
						</label>
						<input
							v-model="form.document_number"
							type="text"
							placeholder="12345678Z"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
							:class="{
								'border-error focus:border-error focus:ring-error/20': errors.document_number,
							}"
							@input="clearError('document_number')" />
						<span v-if="errors.document_number" class="text-error mt-1.5 ml-1 text-xs font-bold">
							{{ errors.document_number }}
						</span>
					</div>

					<!-- New Fields -->
					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								{{ t('catalog.clients.form.birthDate') }}
							</span>
						</label>
						<input
							v-model="form.birth_date"
							type="date"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
							@input="clearError('birth_date')" />
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								{{ t('catalog.clients.form.gender') }}
							</span>
						</label>
						<select
							v-model="form.gender"
							class="select bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4">
							<option value="">{{ t('catalog.clients.form.selectGender') }}</option>
							<option value="male">{{ t('catalog.clients.form.male') }}</option>
							<option value="female">{{ t('catalog.clients.form.female') }}</option>
							<option value="other">{{ t('catalog.clients.form.other') }}</option>
						</select>
					</div>

					<div class="form-control md:col-span-2">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								{{ t('catalog.clients.form.address') }}
							</span>
						</label>
						<input
							v-model="form.address"
							type="text"
							placeholder="Calle, número, piso..."
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
							@input="clearError('address')" />
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								{{ t('catalog.clients.form.city') }}
							</span>
						</label>
						<input
							v-model="form.city"
							type="text"
							placeholder="Pontevedra"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
							@input="clearError('city')" />
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								{{ t('catalog.clients.form.postalCode') }}
							</span>
						</label>
						<input
							v-model="form.postal_code"
							type="text"
							placeholder="36001"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
							@input="clearError('postal_code')" />
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								{{ t('catalog.clients.form.country') }}
							</span>
						</label>
						<input
							v-model="form.country"
							type="text"
							placeholder="España"
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
							@input="clearError('country')" />
					</div>

					<div class="form-control">
						<label class="label">
							<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
								{{ t('catalog.clients.form.status') }}
							</span>
						</label>
						<select
							v-model="form.status"
							class="select bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4">
							<option value="ON">Activo</option>
							<option value="OFF">Inactivo</option>
						</select>
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
