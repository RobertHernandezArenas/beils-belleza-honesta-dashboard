<script lang="ts" setup>
	import { ref, computed } from 'vue'
	import { SlidersHorizontal, User, Key, Palette, Sun, Moon, Languages } from 'lucide-vue-next'
	import LanguageSelector from '~/components/ui/LanguageSelector.vue'
	import ThemeToggle from '~/components/ui/ThemeToggle.vue'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Configuración | Dashboard' })

	const { theme } = useTheme()

	const sections = [
		{ id: 'profile', label: 'Perfil', icon: User },
		{ id: 'security', label: 'Seguridad', icon: Key },
		{ id: 'preferences', label: 'Preferencias', icon: Palette },
		{ id: 'system', label: 'Sistema', icon: SlidersHorizontal },
	]
	const activeSection = ref<'profile' | 'security' | 'preferences' | 'system'>('preferences')
	const isDark = computed(() => theme.value === 'dark')
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

			<div class="grid grid-cols-1 gap-8 md:grid-cols-4">
				<!-- Sidebar Ajustes -->
				<div class="col-span-1">
					<ul class="flex flex-col gap-2">
						<li v-for="s in sections" :key="s.id">
							<button
								type="button"
								@click="activeSection = s.id as typeof activeSection"
								class="flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-left transition-colors"
								:class="
									activeSection === s.id
										? 'bg-bg-card text-text-primary font-bold shadow-sm'
										: 'text-text-muted hover:bg-bg-card/50 font-medium'
								">
								<component :is="s.icon" class="h-5 w-5" />
								{{ s.label }}
							</button>
						</li>
					</ul>
				</div>

				<!-- Area Principal -->
				<div class="col-span-1 md:col-span-3">
					<!-- PREFERENCIAS: Apariencia + Idioma -->
					<div v-if="activeSection === 'preferences'" class="flex flex-col gap-6">
						<!-- Apartado: Apariencia (tema) -->
						<section class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] lg:p-8">
							<div class="mb-6 flex items-center gap-3">
								<div class="bg-bg-muted text-text-primary flex h-10 w-10 items-center justify-center rounded-xl">
									<Palette class="h-5 w-5" />
								</div>
								<div>
									<h2 class="text-text-primary text-lg font-bold">Apariencia</h2>
									<p class="text-text-muted text-sm">Elige el tema claro u oscuro del panel.</p>
								</div>
							</div>

							<div
								class="border-border-default flex items-center justify-between gap-4 rounded-2xl border p-4">
								<div class="flex items-center gap-3">
									<component
										:is="isDark ? Moon : Sun"
										class="text-text-secondary h-5 w-5" />
									<div>
										<p class="text-text-primary text-sm font-bold">
											{{ isDark ? 'Modo oscuro' : 'Modo claro' }}
										</p>
										<p class="text-text-muted text-xs">
											{{ isDark ? 'Interfaz en tonos oscuros.' : 'Interfaz clara por defecto.' }}
										</p>
									</div>
								</div>
								<ThemeToggle />
							</div>
						</section>

						<!-- Apartado: Idioma -->
						<section class="bg-bg-card rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] lg:p-8">
							<div class="mb-6 flex items-center gap-3">
								<div class="bg-bg-muted text-text-primary flex h-10 w-10 items-center justify-center rounded-xl">
									<Languages class="h-5 w-5" />
								</div>
								<div>
									<h2 class="text-text-primary text-lg font-bold">Idioma</h2>
									<p class="text-text-muted text-sm">Idioma de la interfaz del panel.</p>
								</div>
							</div>

							<div
								class="border-border-default flex items-center justify-between gap-4 rounded-2xl border p-4">
								<div>
									<p class="text-text-primary text-sm font-bold">Idioma de la aplicación</p>
									<p class="text-text-muted text-xs">Se aplica de inmediato y se recuerda.</p>
								</div>
								<LanguageSelector />
							</div>
						</section>
					</div>

					<!-- Otras secciones (en desarrollo) -->
					<div
						v-else
						class="bg-bg-card rounded-3xl p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
						<div class="flex flex-col items-center justify-center py-16 text-center">
							<div class="bg-bg-muted mb-6 flex h-24 w-24 items-center justify-center rounded-full">
								<SlidersHorizontal class="text-text-muted/50 h-10 w-10" />
							</div>
							<h3 class="text-text-primary mb-2 text-xl font-bold">Panel de Ajustes</h3>
							<p class="text-text-muted max-w-md text-sm">
								Módulo en desarrollo. Aquí podrás administrar impuestos, horarios, seguridad y
								preferencias del comercio.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
