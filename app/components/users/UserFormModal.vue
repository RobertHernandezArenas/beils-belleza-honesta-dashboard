<template>
	<dialog ref="userModal" class="modal">
		<div
			class="modal-box bg-bg-card text-text-secondary relative w-11/12 max-w-4xl rounded-4xl p-8 shadow-lg backdrop-blur-md">
			<div
				class="from-bg-app pointer-events-none absolute inset-0 z-0 rounded-4xl bg-linear-to-b to-transparent"></div>

			<button
				type="button"
				aria-label="Cerrar modal de usuario"
				class="btn btn-sm btn-circle btn-ghost text-text-light hover:bg-bg-hover hover:text-text-secondary absolute top-4 right-4 z-20 text-xl"
				@click="closeModal">
				✕
			</button>

			<div class="relative z-10">
				<h3 class="mb-6 text-2xl font-medium tracking-tight">
					{{ editingUser ? $t('users.form.editTitle') : $t('users.form.createTitle') }}
				</h3>

				<form @submit.prevent="saveUser">
					<div class="grid gap-4 md:grid-cols-2">
						<div class="form-control">
							<label class="label pb-1" for="user-name">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									{{ $t('users.form.name') }}
								</span>
							</label>
							<input
								id="user-name"
								v-model="form.name"
								type="text"
								class="input bg-bg-muted text-text-primary placeholder:text-text-light hover:bg-bg-hover focus:bg-bg-card focus:ring-border-subtle/40 border-border-default h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 placeholder:font-normal hover:shadow-sm focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus-visible:outline-none sm:h-12 sm:text-base" />
						</div>
						<div class="form-control">
							<label class="label pb-1" for="user-surname">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									{{ $t('users.form.surname') }}
								</span>
							</label>
							<input
								id="user-surname"
								v-model="form.surname"
								type="text"
								class="input bg-bg-muted text-text-primary placeholder:text-text-light hover:bg-bg-hover focus:bg-bg-card focus:ring-border-subtle/40 border-border-default h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 placeholder:font-normal hover:shadow-sm focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus-visible:outline-none sm:h-12 sm:text-base" />
						</div>
						<div class="form-control">
							<label class="label pb-1" for="user-email">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									{{ $t('users.form.email') }}
								</span>
							</label>
							<input
								id="user-email"
								v-model="form.email"
								type="email"
								:disabled="!isAdmin"
								class="input bg-bg-muted text-text-primary placeholder:text-text-light hover:bg-bg-hover focus:bg-bg-card focus:ring-border-subtle/40 disabled:bg-bg-muted border-border-default h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 placeholder:font-normal hover:shadow-sm focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:h-12 sm:text-base" />
						</div>
						<div class="form-control">
							<label class="label pb-1" for="user-password">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									{{ $t('users.form.password') }}
								</span>
							</label>
							<input
								id="user-password"
								v-model="form.password"
								type="password"
								autocomplete="new-password"
								:placeholder="
									editingUser
										? $t('users.form.passwordPlaceholderEdit')
										: $t('users.form.passwordPlaceholderNew')
								"
								class="input bg-bg-muted text-text-primary placeholder:text-text-light hover:bg-bg-hover focus:bg-bg-card focus:ring-border-subtle/40 border-border-default h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 placeholder:font-normal hover:shadow-sm focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus-visible:outline-none sm:h-12 sm:text-base" />
						</div>

						<div class="form-control dropdown w-full">
							<label class="label pb-1" id="label-doctype">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									{{ $t('users.form.documentType') }}
								</span>
							</label>
							<div
								tabindex="0"
								role="button"
								class="input bg-bg-muted text-text-primary hover:bg-bg-hover focus:bg-bg-card focus:ring-border-subtle/40 border-border-default flex h-11 w-full items-center justify-between rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 hover:shadow-sm focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus-visible:outline-none sm:h-12 sm:text-base"
								aria-labelledby="label-doctype">
								<span class="font-medium">
									{{ form.document_type === 'PASSPORT' ? 'Pasaporte' : form.document_type }}
								</span>
								<ChevronDown class="h-4 w-4 opacity-50" />
							</div>
							<ul
								tabindex="0"
								class="menu dropdown-content bg-bg-card text-text-secondary z-100 mt-1 w-full rounded-xl p-2 shadow-lg">
								<li
									v-for="type in [
										{ value: 'DNI', label: 'DNI' },
										{ value: 'PASSPORT', label: 'Pasaporte' },
										{ value: 'NIE', label: 'NIE' },
									]"
									:key="type.value">
									<a
										class="hover:bg-bg-hover hover:text-text-secondary rounded-lg px-4 py-2.5 font-medium transition-colors"
										:class="
											form.document_type === type.value
												? 'text-bg-card bg-text-secondary'
												: 'text-text-muted'
										"
										@click.prevent="selectOption('document_type', type.value)">
										{{ type.label }}
									</a>
								</li>
							</ul>
						</div>
						<div class="form-control">
							<label class="label pb-1" for="user-docnum">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									{{ $t('users.form.documentNumber') }}
								</span>
							</label>
							<input
								id="user-docnum"
								v-model="form.document_number"
								type="text"
								class="input bg-bg-muted text-text-primary placeholder:text-text-light hover:bg-bg-hover focus:bg-bg-card focus:ring-border-subtle/40 border-border-default h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 placeholder:font-normal hover:shadow-sm focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus-visible:outline-none sm:h-12 sm:text-base" />
						</div>

						<div class="form-control">
							<label class="label pb-1" for="user-phone">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									{{ $t('users.form.phone') }}
								</span>
							</label>
							<input
								id="user-phone"
								v-model="form.phone"
								type="tel"
								class="input bg-bg-muted text-text-primary placeholder:text-text-light hover:bg-bg-hover focus:bg-bg-card focus:ring-border-subtle/40 border-border-default h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 placeholder:font-normal hover:shadow-sm focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus-visible:outline-none sm:h-12 sm:text-base" />
						</div>
						<div class="form-control dropdown w-full">
							<label class="label pb-1" id="label-role">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									{{ $t('users.form.role') }}
								</span>
							</label>
							<div
								:tabindex="!isAdmin ? -1 : 0"
								role="button"
								class="input border-border-default text-text-primary focus:bg-bg-card focus:ring-border-subtle/40 flex h-11 w-full items-center justify-between rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus:ring-4 sm:h-12 sm:text-base"
								:class="
									!isAdmin
										? 'bg-bg-muted cursor-not-allowed opacity-50 shadow-none'
										: 'bg-bg-muted hover:bg-bg-hover hover:shadow-sm focus-visible:outline-none'
								"
								@mousedown="!isAdmin && $event.preventDefault()"
								@click="!isAdmin && $event.stopPropagation()">
								<span class="font-medium">
									{{ $t('users.constants.roles.' + form.role) }}
								</span>
								<ChevronDown class="h-4 w-4 opacity-50" />
							</div>
							<ul
								tabindex="0"
								class="menu dropdown-content bg-bg-card text-text-secondary z-100 mt-1 w-full rounded-xl p-2 shadow-lg">
								<li
									v-for="role in [
										{ label: $t('users.constants.roles.CLIENT'), value: 'CLIENT' },
										{ label: $t('users.constants.roles.STAFF'), value: 'STAFF' },
										{ label: $t('users.constants.roles.ADMIN'), value: 'ADMIN' },
									]"
									:key="role.value">
									<a
										class="hover:bg-bg-hover hover:text-text-secondary rounded-lg py-2.5 font-bold transition-colors"
										v-show="isAdmin"
										:class="
											form.role === role.value
												? 'text-bg-card bg-text-secondary'
												: 'text-text-muted'
										"
										@click.prevent="selectOption('role', role.value)">
										{{ role.label }}
									</a>
								</li>
							</ul>
						</div>

						<div class="form-control md:col-span-2">
							<label class="label pb-1" for="user-address">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									{{ $t('users.form.address') }}
								</span>
							</label>
							<input
								id="user-address"
								v-model="form.address"
								type="text"
								class="input bg-bg-muted text-text-primary placeholder:text-text-light hover:bg-bg-hover focus:bg-bg-card focus:ring-border-subtle/40 border-border-default h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 placeholder:font-normal hover:shadow-sm focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus-visible:outline-none sm:h-12 sm:text-base" />
						</div>

						<div class="form-control">
							<label class="label pb-1" for="user-city">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									{{ $t('users.form.city') }}
								</span>
							</label>
							<input
								id="user-city"
								v-model="form.city"
								type="text"
								class="input bg-bg-muted text-text-primary placeholder:text-text-light hover:bg-bg-hover focus:bg-bg-card focus:ring-border-subtle/40 border-border-default h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 placeholder:font-normal hover:shadow-sm focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus-visible:outline-none sm:h-12 sm:text-base" />
						</div>
						<div class="form-control">
							<label class="label pb-1" for="user-country">
								<span class="label-text text-text-muted text-xs font-bold tracking-wider uppercase">
									{{ $t('users.form.country') }}
								</span>
							</label>
							<input
								id="user-country"
								v-model="form.country"
								type="text"
								class="input bg-bg-muted text-text-primary placeholder:text-text-light hover:bg-bg-hover focus:bg-bg-card focus:ring-border-subtle/40 border-border-default h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors duration-300 placeholder:font-normal hover:shadow-sm focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus-visible:outline-none sm:h-12 sm:text-base" />
						</div>
					</div>

					<div class="mt-8 flex justify-end gap-3">
						<button
							type="button"
							class="btn btn-ghost text-text-muted hover:bg-bg-hover hover:text-text-secondary h-12 rounded-xl px-8"
							@click.prevent="closeModal">
							{{ $t('common.cancel') }}
						</button>
						<button
							type="submit"
							class="btn text-bg-card bg-text-secondary hover:bg-text-secondary/80 h-12 rounded-xl border-none px-8 font-bold shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-lg"
							:disabled="isSaving">
							<span v-if="isSaving" class="loading loading-spinner"></span>
							{{ editingUser ? 'Guardar Cambios' : 'Crear Usuario' }}
						</button>
					</div>
				</form>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-text-secondary/40 backdrop-blur-sm">
			<button aria-label="Cerrar modal de dialogo">close</button>
		</form>
	</dialog>
</template>

<script setup lang="ts">
	import { ChevronDown } from 'lucide-vue-next'
	import { useAuthStore } from '~/stores/auth'
	import { useMutation, useQueryClient } from '@tanstack/vue-query'
	import { useModalAnimation } from '~/composables/useModalAnimation'

	const authStore = useAuthStore()
	const queryClient = useQueryClient()
	const isAdmin = computed(() => authStore.user?.role === 'ADMIN')

	const userModal = ref<HTMLDialogElement | null>(null)
	const editingUser = ref<any | null>(null)
	const { animateOpen, animateClose } = useModalAnimation()

	const emit = defineEmits(['refresh', 'toast'])

	const form = reactive({
		name: '',
		surname: '',
		email: '',
		password: '',
		document_type: 'DNI',
		document_number: '',
		phone: '',
		address: '',
		city: '',
		country: '',
		role: 'CLIENT',
	})

	const selectOption = (field: 'document_type' | 'role', value: string) => {
		form[field] = value
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur()
		}
	}

	const showModal = (user: any | null) => {
		editingUser.value = user
		if (user) {
			form.name = user.name || ''
			form.surname = user.surname || ''
			form.email = user.email || ''
			form.password = ''
			form.document_type = user.document_type || 'DNI'
			form.document_number = user.document_number || ''
			form.phone = user.phone || ''
			form.address = user.address || ''
			form.city = user.city || ''
			form.country = user.country || ''
			form.role = user.role || 'CLIENT'
		} else {
			form.name = ''
			form.surname = ''
			form.email = ''
			form.password = ''
			form.document_type = 'DNI'
			form.document_number = ''
			form.phone = ''
			form.address = ''
			form.city = ''
			form.country = ''
			form.role = 'CLIENT'
		}
		animateOpen(userModal.value, { staggerChildren: true })
	}

	const closeModal = () => {
		animateClose(userModal.value)
	}

	const { mutate: performSave, isPending: isSaving } = useMutation({
		mutationFn: async (userData: typeof form) => {
			if (editingUser.value) {
				return await $fetch(`/api/users/${editingUser.value.user_id}`, {
					method: 'PUT',
					body: userData,
				})
			} else {
				return await $fetch(`/api/users`, {
					method: 'POST',
					body: userData,
				})
			}
		},
		onSuccess: () => {
			const msg = editingUser.value
				? 'Usuario actualizado exitosamente'
				: 'Usuario creado exitosamente'
			emit('toast', { message: msg, type: 'success' })
			queryClient.invalidateQueries({ queryKey: ['users'] })
			queryClient.invalidateQueries({ queryKey: ['staff-agenda'] })
			emit('refresh')
			closeModal()
		},
		onError: (error: any) => {
			console.error('Error saving user:', error)
			emit('toast', {
				message: error.data?.statusMessage || 'Error al guardar el usuario',
				type: 'error',
			})
		},
	})

	const saveUser = () => {
		performSave(form)
	}

	defineExpose({
		showModal,
	})
</script>
