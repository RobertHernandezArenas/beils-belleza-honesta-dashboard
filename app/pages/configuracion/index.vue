<script lang="ts" setup>
	import { SlidersHorizontal, User, Key, Globe } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Configuración | Dashboard' })

	const { t } = useI18n()
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-[1400px]">
			<!-- Header -->
			<header class="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">Configuración</h1>
					<p class="text-text-muted text-sm font-medium">Ajustes generales del sistema</p>
				</div>
			</header>

			<!-- Content Placeholder -->
			<div class="grid grid-cols-1 gap-8 md:grid-cols-4">
				<!-- Sidebar Ajustes -->
				<div class="col-span-1">
					<ul class="flex flex-col gap-2">
						<li>
							<button
								class="bg-bg-card text-text-primary flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-left font-bold shadow-sm">
								<User class="h-5 w-5" />
								Perfil
							</button>
						</li>
						<li>
							<button
								class="text-text-muted hover:bg-bg-card/50 flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-left font-medium transition-colors">
								<Key class="h-5 w-5" />
								Seguridad
							</button>
						</li>
						<li>
							<button
								class="text-text-muted hover:bg-bg-card/50 flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-left font-medium transition-colors">
								<Globe class="h-5 w-5" />
								Preferencias
							</button>
						</li>
						<li>
							<button
								class="text-text-muted hover:bg-bg-card/50 flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-left font-medium transition-colors">
								<SlidersHorizontal class="h-5 w-5" />
								Sistema
							</button>
						</li>
					</ul>
				</div>

				<!-- Area Principal -->
				<div class="col-span-1 md:col-span-3">
					<div class="bg-bg-card rounded-3xl p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
						<div class="mb-8">
							<h2 class="text-text-primary text-xl font-bold">Información del Perfil</h2>
							<p class="text-text-muted mt-1 text-sm">
								Actualiza tus datos personales y profesionales de tu cuenta corporativa.
							</p>
						</div>

						<div class="flex flex-col items-center justify-center py-16 text-center">
							<div class="bg-bg-muted mb-6 flex h-24 w-24 items-center justify-center rounded-full">
								<SlidersHorizontal class="text-text-muted/50 h-10 w-10" />
							</div>
							<h3 class="text-text-primary mb-2 text-xl font-bold">Panel de Ajustes</h3>
							<p class="text-text-muted max-w-md text-sm">
								Módulo de configuración en desarrollo. Aquí podrás administrar impuestos, horarios, y
								preferencias del comercio.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
