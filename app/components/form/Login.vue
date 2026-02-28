<script setup lang="ts">
	import { ref, reactive } from 'vue'
	import { z } from 'zod'
	import { useMutation } from '@tanstack/vue-query'
	import { useRouter } from 'vue-router'
	import { useI18n } from 'vue-i18n'
	import { useAuthStore } from '~/stores/auth' // Auto-imported usually, but explicit is safer
	import { AlertCircle, LockKeyhole, Mail, Lock, Eye, EyeOff } from 'lucide-vue-next'

	// definePageMeta removed - only allowed in pages

	const { t } = useI18n()
	const router = useRouter()
	const authStore = useAuthStore()

	// State
	const showPassword = ref(false)
	const form = reactive({
		email: '',
		password: '',
	})
	// reactive errors object...
	const errors = reactive({
		email: '',
		password: '',
	})

	// Validation Schema
	// Note: replacing schema messages with function calls might be tricky if not reactive.
	// Zod schemas are usually static. But we can make them getters or recreate on submit if needed for dynamic locale change.
	// For now, let's keep it simple or use computed if possible. But z.object is not reactive.
	// A common pattern is to parse and map errors manually or create schema inside a computed/function.
	// Let's create schema inside onSubmit to support dynamic locale, or just accept English/Spanish fixed for now (mixed).
	// Actually, better to move validation message to template if possible or use t() here but it won't react to locale change dynamically unless we rebuild schema.
	// Let's use t() here, it will take current locale at execution time (onSubmit).
	const loginSchema = z.object({
		email: z.string().email('Ingresa un correo válido'), // TODO: key for validation
		password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'), // TODO: key for validation
	})

	// API Login Function
	const loginFn = async (credentials: typeof form) => {
		try {
			const data = await $fetch('/api/auth/login', {
				method: 'POST',
				body: credentials,
			})
			return data as { user: any; token: string }
		} catch (err: any) {
			const errorMessage = err.response?._data?.statusMessage || err.message || t('auth.login.error')
			throw new Error(errorMessage)
		}
	}

	// React Query Mutation
	const { mutate, isPending, isError, error, reset } = useMutation({
		mutationFn: loginFn,
		onSuccess: data => {
			authStore.setAuth(data.user, data.token)
			router.push('/overview') // Redirigir al dashboard
		},
	})

	// Handlers
	const onSubmit = () => {
		// Reset errors
		errors.email = ''
		errors.password = ''

		// Validate
		const result = loginSchema.safeParse(form)

		if (!result.success) {
			const formattedErrors = result.error.format()
			errors.email = formattedErrors.email?._errors[0] || ''
			errors.password = formattedErrors.password?._errors[0] || ''
			return
		}

		// Submit
		mutate(form)
	}

	const resetMutation = () => {
		reset() // Resetea el estado de error de la mutación
	}

	const clearError = (field: 'email' | 'password') => {
		errors[field] = ''
	}
</script>

<template>
	<div class="mx-auto w-full max-w-md">
		<div
			class="bg-bg-card relative space-y-8 rounded-4xl border border-transparent p-8 sm:p-12 lg:shadow-xl lg:backdrop-blur-md">
			<!-- Glow sutil dentro de la tarjeta -->
			<div
				class="pointer-events-none absolute inset-0 z-0 rounded-[2rem] bg-linear-to-b from-[#fbfaf9] to-transparent"></div>

			<div class="relative z-10 w-full">
				<!-- Loading Screen -->
				<div v-if="isPending" class="flex h-full w-full flex-col items-center justify-center gap-5 py-10">
					<div class="relative">
						<div class="absolute inset-0 rounded-full bg-[#fbfaf9] blur-2xl"></div>
						<LogoTPLoader class="relative h-20 w-20" />
					</div>
					<p class="animate-pulse text-xl font-bold tracking-wide text-[#404040]">Iniciando sesión...</p>
				</div>

				<!-- Error Screen -->
				<div v-else-if="isError" class="flex flex-col items-center justify-center py-6 text-center">
					<div
						class="mb-5 rounded-full bg-red-50 p-4 text-red-600 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-red-200">
						<AlertCircle class="h-10 w-10" />
					</div>
					<h2 class="mb-3 text-2xl font-bold text-red-600">Error de Acceso</h2>
					<p class="mb-8 max-w-xs text-center text-sm font-medium text-[#666666]">
						{{ error?.message || 'Ocurrió un error inesperado al conectar.' }}
					</p>
					<button
						class="btn btn-ghost h-14 w-full rounded-2xl border border-transparent font-semibold text-[#666666] transition-colors hover:bg-[#f2f0eb] hover:text-[#404040]"
						@click="resetMutation">
						Intentar de nuevo
					</button>
				</div>

				<!-- Login Form -->
				<form v-else class="flex flex-col gap-8" @submit.prevent="onSubmit">
					<div class="flex flex-col items-center gap-3 text-center">
						<h2 class="text-5xl font-bold tracking-[.5rem] text-[#404040]">
							{{ t('auth.login.platform') }}
						</h2>
						<p class="text-xs font-bold tracking-[.23rem] text-[#8c8c8c] uppercase">
							Belleza Honesta
						</p>
					</div>

					<div class="space-y-6">
						<div class="form-control">
							<label class="label pb-2" for="login-email">
								<span class="label-text text-xs font-bold tracking-wider text-[#666666] uppercase">
									{{ t('auth.login.email') }}
								</span>
							</label>
							<div class="group relative">
								<input
									id="login-email"
									v-model="form.email"
									type="email"
									inputmode="email"
									autocomplete="username"
									placeholder="usuario@ejemplo.com"
									:aria-invalid="!!errors.email"
									class="input input-bordered h-14 w-full rounded-2xl border-transparent bg-[#fbfaf9] pl-12 text-lg font-medium text-[#404040] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-[border-color,background-color,color,box-shadow] placeholder:text-[#bababa] focus-visible:bg-[#ffffff] focus-visible:outline-none"
									:class="{
										'border-red-500 focus:border-red-500 focus:outline-none': errors.email,
									}"
									@input="clearError('email')" />
								<Mail
									class="absolute top-4 left-4 h-6 w-6 text-[#8c8c8c] transition-colors group-focus-within:text-[#404040]"
									:class="{ 'text-red-500': errors.email }" />
							</div>
							<span v-if="errors.email" class="mt-2 ml-1 text-xs font-bold text-red-600">
								{{ errors.email }}
							</span>
						</div>

						<div class="form-control">
							<label class="label flex justify-between pb-2" for="login-password">
								<span class="label-text text-xs font-bold tracking-wider text-[#666666] uppercase">
									{{ t('auth.login.password') }}
								</span>
							</label>
							<div class="group relative">
								<input
									id="login-password"
									v-model="form.password"
									:type="showPassword ? 'text' : 'password'"
									inputmode="text"
									autocomplete="current-password"
									placeholder="••••••••"
									:aria-invalid="!!errors.password"
									class="input input-bordered h-14 w-full rounded-2xl border-transparent bg-[#fbfaf9] pr-12 pl-12 text-lg font-medium tracking-widest text-[#404040] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-[border-color,background-color,color,box-shadow] placeholder:text-[#bababa] focus-visible:bg-[#ffffff] focus-visible:outline-none"
									:class="{
										'border-red-500 focus:border-red-500 focus:outline-none': errors.password,
									}"
									@input="clearError('password')" />
								<Lock
									class="absolute top-4 left-4 h-6 w-6 text-[#8c8c8c] transition-colors group-focus-within:text-[#404040]"
									:class="{ 'text-red-500': errors.password }" />
								<button
									type="button"
									aria-label="Toggle password visibility"
									class="absolute top-4 right-4 text-[#8c8c8c] transition-colors hover:text-[#404040] focus-visible:outline-none"
									@click="showPassword = !showPassword">
									<Eye v-if="showPassword" class="h-6 w-6" />
									<EyeOff v-else class="h-6 w-6" />
								</button>
							</div>
							<span
								v-if="errors.password"
								class="mt-2 ml-1 text-xs font-bold tracking-normal text-red-600">
								{{ errors.password }}
							</span>
						</div>
					</div>

					<div class="form-control mt-4">
						<button
							class="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#404040] text-lg font-medium tracking-wide text-[#ffffff] uppercase shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-[transform,color,background-color,box-shadow] hover:bg-[#404040]/80 hover:shadow-lg disabled:opacity-70 disabled:hover:scale-100"
							type="submit"
							:disabled="isPending">
							<span class="relative z-10 flex items-center justify-center gap-2">
								{{ t('auth.login.button') }}
							</span>
							<!-- Efecto de brillo en hover -->
							<div
								class="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-[#ffffff]/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<style scoped>
	@keyframes shimmer {
		100% {
			transform: translateX(100%);
		}
	}

	/* Fix browser autofill background color */
	input:-webkit-autofill,
	input:-webkit-autofill:hover,
	input:-webkit-autofill:focus,
	input:-webkit-autofill:active {
		-webkit-box-shadow: 0 0 0 30px #fbfaf9 inset !important;
		-webkit-text-fill-color: #1a1a1a !important;
		transition: background-color 5000s ease-in-out 0s;
	}
</style>
