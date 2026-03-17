<script setup lang="ts">
	import { z } from 'zod'
	import { useMutation, useQueryClient } from '@tanstack/vue-query'
	import { UserPlus, Save, AlertCircle, Edit, User, CreditCard, Search, Camera, Trash2 } from 'lucide-vue-next'
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
		avatar: '',
		user_id: '', // Optional pre-generated ID
	})

	const avatarPreview = ref('')
	const avatarFile = ref<File | null>(null)
	const fileInput = ref<HTMLInputElement | null>(null)

	const triggerFileInput = () => fileInput.value?.click()

	const onFileChange = (e: Event) => {
		const target = e.target as HTMLInputElement
		if (target.files && target.files[0]) {
			avatarFile.value = target.files[0]
			avatarPreview.value = URL.createObjectURL(target.files[0])
		}
	}

	const avatarError = ref(false)
	const handleAvatarError = () => {
		avatarError.value = true
	}

	watch(() => avatarPreview.value, () => {
		avatarError.value = false
	})

	const removeAvatar = () => {
		avatarFile.value = null
		avatarPreview.value = ''
		form.avatar = ''
		avatarError.value = false
	}

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
	
	// Scroll-reactive action bar (Mobile only)
	const isActionBarVisible = ref(true)
	let scrollTimeout: any = null

	const handleScroll = () => {
		// Only trigger for real scrolling on small screens
		if (window.innerWidth >= 1024) return
		
		if (isActionBarVisible.value) {
			isActionBarVisible.value = false
		}
		
		if (scrollTimeout) clearTimeout(scrollTimeout)
		scrollTimeout = setTimeout(() => {
			isActionBarVisible.value = true
		}, 600) // Slightly faster than 800ms
	}

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
			form.avatar = props.clientToEdit.avatar || ''
			avatarPreview.value = props.clientToEdit.avatar || ''
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
			form.avatar = ''
			form.user_id = ''
			avatarPreview.value = ''
		}
		avatarFile.value = null
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
		avatar: z.string().optional().default(''),
	})

	const { mutate: saveClient, isPending } = useMutation({
		mutationFn: async (data: typeof form) => {
			// Subir imagen primero si hay un archivo seleccionado
			if (avatarFile.value) {
				const formData = new FormData()
				formData.append('file', avatarFile.value)
				
				// Generar nombre de subcarpeta descriptivo
				const clientId = isEditing.value ? props.clientToEdit!.user_id : (form as any).user_id || crypto.randomUUID()
				if (!isEditing.value) (form as any).user_id = clientId
				
				const slugify = (text: string) => text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-')
				const subdirectory = `${slugify(form.name)}-${slugify(form.surname)}-${clientId.substring(0, 8)}`
				
				formData.append('subdirectory', subdirectory)
				
				try {
					const uploadRes = await $fetch<{ url: string }>('/api/multimedia/upload', {
						method: 'POST',
						body: formData,
					})
					data.avatar = uploadRes.url
				} catch (err) {
					console.error('Error uploading avatar:', err)
					throw new Error('Error al subir la imagen')
				}
			}

			const url = isEditing.value ? `/api/clients/${props.clientToEdit!.user_id}` : '/api/clients'
			const method = isEditing.value ? 'PUT' : 'POST'

			return await $fetch(url, {
				method,
				body: data,
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['clients-list'] })
			queryClient.invalidateQueries({ queryKey: ['clients-tpv'] })
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
			class="modal-box bg-bg-app border-border-default m-0 flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden border p-0 shadow-2xl transition-all sm:m-4 sm:max-h-[90dvh] sm:rounded-3xl rounded-t-[2.5rem]">
			
			<!-- Bottom Sheet Handle (Mobile Only) -->
			<div 
				class="flex w-full items-center justify-center pt-3 pb-3 sm:hidden cursor-pointer active:scale-95 transition-transform"
				@click="localVisible = false">
				<div class="bg-border-default h-1.5 w-12 rounded-full opacity-40 hover:opacity-60 transition-opacity"></div>
			</div>

			<!-- Header -->
			<div class="border-border-subtle sticky top-0 z-20 flex items-center gap-3 border-b p-4 sm:gap-4 sm:p-6 sm:rounded-t-3xl backdrop-blur-md bg-bg-app/80">
				<div
					class="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12">
					<Edit v-if="isEditing" class="h-5 w-5 sm:h-6 sm:w-6" />
					<UserPlus v-else class="h-5 w-5 sm:h-6 sm:w-6" />
				</div>
				<div class="flex-1 overflow-hidden">
					<h3 class="text-text-primary truncate text-base font-bold sm:text-lg">
						{{ isEditing ? t('catalog.clients.edit') : t('catalog.clients.newClient') }}
					</h3>
					<p class="text-text-muted truncate text-xs font-medium sm:text-sm">
						{{
							isEditing
								? 'Actualiza los datos de este cliente'
								: 'Registra un cliente en el sistema CRM'
						}}
					</p>
				</div>
				<button 
					type="button" 
					class="btn btn-ghost btn-sm btn-circle" 
					@click="localVisible = false">
					✕
				</button>
			</div>

			<!-- Formulario -->
			<form 
				id="clientForm"
				@submit.prevent="onSubmit" 
				@scroll.passive="handleScroll"
				class="flex-1 space-y-4 overflow-y-auto p-4 scroll-smooth sm:space-y-5 sm:p-6">
				
				<!-- Sección: Avatar -->
				<div class="flex flex-col items-center justify-center gap-4 py-4">
					<div class="relative group">
						<div class="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-bg-muted flex items-center justify-center transition-all group-hover:border-primary/30 from-primary/20 to-primary/5 bg-linear-to-br">
							<img 
								v-if="avatarPreview && !avatarError" 
								:src="avatarPreview" 
								class="h-full w-full object-cover"
								@error="handleAvatarError" />
							<span v-else-if="form.name || form.surname" class="text-3xl sm:text-4xl font-black text-primary tracking-tight">
								{{ (form.name?.charAt(0) || '') }}{{ (form.surname?.charAt(0) || '') }}
							</span>
							<User v-else class="h-10 w-10 sm:h-12 sm:w-12 text-text-muted/40" />
							
							<div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" @click="triggerFileInput">
								<Camera class="text-white h-6 w-6 sm:h-8 sm:w-8" />
							</div>
						</div>
						
						<button 
							v-if="avatarPreview" 
							type="button"
							@click="removeAvatar"
							class="absolute -top-1 -right-1 bg-rose-500 text-white p-1.5 rounded-full shadow-lg hover:bg-rose-600 transition-colors">
							<Trash2 class="h-3.5 w-3.5" />
						</button>
					</div>
					
					<div class="text-center">
						<button 
							type="button" 
							@click="triggerFileInput"
							class="text-primary text-xs font-black uppercase tracking-widest hover:underline">
							{{ avatarPreview ? 'Cambiar Foto' : 'Subir Foto' }}
						</button>
						<input 
							ref="fileInput"
							type="file" 
							class="hidden" 
							accept="image/*"
							@change="onFileChange" />
					</div>
				</div>

				<!-- Sección: Información Personal -->
				<div class="space-y-5 rounded-3xl bg-white/40 p-5 ring-1 ring-border-subtle/30 shadow-xs">
					<div class="flex items-center gap-3 border-b border-border-subtle/20 pb-4">
						<div class="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
							<User class="h-4 w-4" />
						</div>
						<h4 class="text-text-primary text-[10px] font-black uppercase tracking-widest">Información Personal</h4>
					</div>
					
					<div class="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
						<div class="form-control">
							<label class="label">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
									{{ t('catalog.clients.form.name') }} *
								</span>
							</label>
							<input
								v-model="form.name"
								type="text"
								class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all placeholder:text-text-muted/40"
								:class="{ 'border-rose-500 ring-4 ring-rose-500/10': errors.name }"
								@input="clearError('name')" />
						</div>

						<div class="form-control">
							<label class="label">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
									{{ t('catalog.clients.form.surname') }} *
								</span>
							</label>
							<input
								v-model="form.surname"
								type="text"
								class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all placeholder:text-text-muted/40"
								:class="{ 'border-rose-500 ring-4 ring-rose-500/10': errors.surname }"
								@input="clearError('surname')" />
						</div>

						<div class="form-control">
							<label class="label">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
									{{ t('catalog.clients.form.documentType') }}
								</span>
							</label>
							<select
								v-model="form.document_type"
								class="select bg-white border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all">
								<option value="DNI">DNI (España)</option>
								<option value="NIE">NIE (España)</option>
								<option value="PASSPORT">{{ t('catalog.clients.form.passport') }}</option>
							</select>
						</div>

						<div class="form-control">
							<label class="label">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
									{{ t('catalog.clients.form.documentNumber') }}
								</span>
							</label>
							<input
								v-model="form.document_number"
								type="text"
								class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all placeholder:text-text-muted/40"
								:class="{ 'border-rose-500 ring-4 ring-rose-500/10': errors.document_number }"
								@input="clearError('document_number')" />
						</div>

						<div class="form-control">
							<label class="label">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
									{{ t('catalog.clients.form.birthDate') }}
								</span>
							</label>
							<input
								v-model="form.birth_date"
								type="date"
								class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all"
								@input="clearError('birth_date')" />
						</div>

						<div class="form-control">
							<label class="label">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
									{{ t('catalog.clients.form.gender') }}
								</span>
							</label>
							<select
								v-model="form.gender"
								class="select bg-white border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all">
								<option value="">{{ t('catalog.clients.form.selectGender') }}</option>
								<option value="male">{{ t('catalog.clients.form.male') }}</option>
								<option value="female">{{ t('catalog.clients.form.female') }}</option>
								<option value="other">{{ t('catalog.clients.form.other') }}</option>
							</select>
						</div>
					</div>
				</div>

				<!-- Sección: Contacto -->
				<div class="space-y-5 rounded-3xl bg-white/40 p-5 ring-1 ring-border-subtle/30 shadow-xs">
					<div class="flex items-center gap-3 border-b border-border-subtle/20 pb-4">
						<div class="bg-indigo-500/10 text-indigo-600 flex h-8 w-8 items-center justify-center rounded-lg">
							<CreditCard class="h-4 w-4" />
						</div>
						<h4 class="text-text-primary text-[10px] font-black uppercase tracking-widest">Contacto y Comunicación</h4>
					</div>

					<div class="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
						<div class="form-control">
							<label class="label">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
									{{ t('catalog.clients.form.phone') }} *
								</span>
							</label>
							<input
								v-model="form.phone"
								type="tel"
								class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all placeholder:text-text-muted/40 tabular-nums"
								:class="{ 'border-rose-500 ring-4 ring-rose-500/10': errors.phone }"
								@input="clearError('phone')" />
						</div>

						<div class="form-control">
							<label class="label">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
									{{ t('catalog.clients.form.email') }} *
								</span>
							</label>
							<input
								v-model="form.email"
								type="email"
								class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all placeholder:text-text-muted/40"
								:class="{ 'border-rose-500 ring-4 ring-rose-500/10': errors.email }"
								@input="clearError('email')" />
						</div>

						<div class="form-control">
							<label class="label">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
									{{ t('catalog.clients.form.status') }}
								</span>
							</label>
							<select
								v-model="form.status"
								class="select bg-white border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all">
								<option value="ON">Activo</option>
								<option value="OFF">Inactivo</option>
							</select>
						</div>
					</div>
				</div>

				<!-- Sección: Localización -->
				<div class="space-y-5 rounded-3xl bg-white/40 p-5 ring-1 ring-border-subtle/30 shadow-xs">
					<div class="flex items-center gap-3 border-b border-border-subtle/20 pb-4">
						<div class="bg-amber-500/10 text-amber-600 flex h-8 w-8 items-center justify-center rounded-lg">
							<Search class="h-4 w-4" />
						</div>
						<h4 class="text-text-primary text-[10px] font-black uppercase tracking-widest">Dirección y Localización</h4>
					</div>

					<div class="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
						<div class="form-control md:col-span-2">
							<label class="label">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
									{{ t('catalog.clients.form.address') }}
								</span>
							</label>
							<input
								v-model="form.address"
								type="text"
								class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all placeholder:text-text-muted/40"
								@input="clearError('address')" />
						</div>

						<div class="form-control">
							<label class="label">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
									{{ t('catalog.clients.form.city') }}
								</span>
							</label>
							<input
								v-model="form.city"
								type="text"
								class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all placeholder:text-text-muted/40"
								@input="clearError('city')" />
						</div>

						<div class="form-control">
							<label class="label">
								<span class="label-text text-text-secondary text-[10px] font-black tracking-widest uppercase">
									{{ t('catalog.clients.form.postalCode') }}
								</span>
							</label>
							<input
								v-model="form.postal_code"
								type="text"
								class="input bg-white/60 border-border-default focus:bg-white focus:ring-primary/20 hover:bg-white h-11 w-full rounded-xl px-4 text-sm font-bold shadow-xs transition-all placeholder:text-text-muted/40 tabular-nums"
								@input="clearError('postal_code')" />
						</div>
					</div>
				</div>
			</form>

			<!-- Acciones / Bottom Action Bar (Truly Sticky outside scroll area) -->
			<div 
				v-show="localVisible"
				class="modal-action border-border-subtle sticky bottom-0 z-30 mt-0 flex gap-3 border-t bg-bg-app/90 backdrop-blur-xl p-4 sm:p-6 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out"
				:class="[isActionBarVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none']">
				<button
					type="button"
					class="btn btn-ghost hover:bg-bg-muted text-text-muted h-11 sm:h-12 flex-1 rounded-2xl border-transparent font-bold transition-all hover:scale-[0.98]"
					@click="localVisible = false"
					:disabled="isPending">
					Cancelar
				</button>
				<button
					type="submit"
					form="clientForm"
					class="btn bg-text-primary text-bg-app hover:bg-text-secondary flex h-11 sm:h-12 flex-1 items-center gap-2 rounded-2xl border-transparent shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
					:disabled="isPending">
					<span v-if="isPending" class="loading loading-spinner loading-sm"></span>
					<template v-else>
						<Save class="h-4 w-4" />
						<span class="font-black uppercase tracking-widest text-xs">
							{{ isEditing ? t('common.save') : t('catalog.clients.newClient') }}
						</span>
					</template>
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-black/40 backdrop-blur-sm">
			<button @click="localVisible = false">Cerrar</button>
		</form>
	</dialog>
</template>
