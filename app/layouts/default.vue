<template>
	<div class="drawer lg:drawer-open bg-bg-app text-text-secondary relative h-dvh overflow-hidden font-sans">
		<!-- Minimalist background without blobs -->

		<input id="my-drawer-4" v-model="isDrawerOpen" type="checkbox" class="drawer-toggle" />

		<div class="drawer-content relative z-10 flex h-dvh flex-col">
			<!-- NAVBAR (Glassmorphism) -->
			<nav
				class="bg-bg-card/90 sticky top-0 z-50 h-[73px] w-full border-b border-transparent px-4 py-3 shadow-xs backdrop-blur-2xl">
				<div class="flex w-full items-center justify-between">
					<div class="flex items-center gap-4">
						<div class="lg:hidden">
							<label
								for="my-drawer-4"
								aria-label="open sidebar"
								class="btn btn-square btn-ghost text-text-secondary hover:bg-bg-muted hover:text-text-secondary">
								<Transition name="swap" mode="out-in">
									<PanelLeftClose v-if="isDrawerOpen" class="h-6 w-6" />
									<PanelLeftOpen v-else class="h-6 w-6" />
								</Transition>
							</label>
						</div>

						<!-- Breadcrumb / Titulo en top bar -->
						<UiAppBreadcrumbs :current-label="currentRouteTranslated" />
					</div>

					<div class="flex items-center gap-4">
						<!-- Selector de Idioma (Trend UI 2026) -->
						<UiLanguageSelector />

						<!-- Perfil rápido superior -->
						<button
							v-if="authStore.user"
							class="group bg-bg-card hover:border-border-strong hover:bg-bg-muted relative flex items-center gap-2 rounded-full border border-transparent p-1 pr-3 transition-colors">
							<div class="avatar">
								<div
									class="ring-border-default group-hover:ring-border-strong w-8 rounded-full ring-1">
									<img
										:src="
											authStore.user.avatar ||
											`https://ui-avatars.com/api/?name=${authStore.user.name}+${authStore.user.surname || ''}&background=random`
										"
										alt="User Avatar"
										width="32"
										height="32"
										class="object-cover brightness-110 saturate-0 transition-[filter] group-hover:saturate-100" />
								</div>
							</div>
						</button>
					</div>
				</div>
			</nav>

			<!-- Contenido de la Página -->
			<main class="w-full flex-1 overflow-y-auto">
				<slot />
			</main>
		</div>

		<!-- SIDEBAR (Glassmorphism) -->
		<div class="drawer-side z-50 h-dvh">
			<label
				for="my-drawer-4"
				aria-label="close sidebar"
				class="drawer-overlay bg-text-secondary/40 backdrop-blur-sm lg:hidden"></label>
			<aside
				class="bg-bg-card/90 flex h-full w-72 flex-col items-start border-r border-transparent shadow-[4px_0_20px_rgba(0,0,0,0.03)] backdrop-blur-2xl duration-300 lg:w-72">
				<!-- Glow lateral en sidebar -->
				<div
					class="from-bg-app pointer-events-none absolute inset-0 z-0 bg-linear-to-r to-transparent"></div>

				<!-- LOGO SPACE -->
				<div
					class="relative z-10 flex h-[73px] min-h-[73px] w-full items-center justify-start gap-3 border-b border-transparent p-6">
					<div class="group relative shrink-0">
						<NuxtLink to="/">
							<NuxtImg
								src="/images/tp-dash.svg"
								class="relative w-9 brightness-0 drop-shadow-sm"
								alt="Logo" />
						</NuxtLink>
					</div>
					<NuxtLink to="/">
						<span class="text-text-secondary text-xl font-bold tracking-wider drop-shadow-none">
							BEILS
						</span>
					</NuxtLink>
				</div>

				<!-- Navegación -->
				<div class="text-text-secondary relative z-10 w-full flex-1 overflow-y-auto px-4 py-6">
					<p class="text-text-light mb-4 pl-2 text-[10px] font-medium tracking-widest uppercase">
						{{ $t('nav.menu') || 'Menú Principal' }}
					</p>

					<ul ref="sidebarNav" class="relative flex w-full flex-col gap-1.5">
						<!-- GSAP Active Pill Background -->
						<div
							ref="activePill"
							class="bg-text-secondary absolute left-0 w-full rounded-[1.25rem] opacity-0 shadow-md pointer-events-none"
							style="z-index: 0; min-height: 48px;"></div>

						<li v-for="item in navItems" :key="item.to || item.label" class="relative z-10" :ref="setNavRef(item.to)">
							<NuxtLink
								v-if="item.to"
								:to="item.to"
								class="group flex w-full cursor-pointer items-center gap-4 rounded-[1.25rem] px-5 py-3.5 text-left transition-colors duration-300"
								:class="
									currentActivePath === item.to
										? 'text-bg-card font-medium'
										: 'text-text-muted hover:bg-bg-muted/50 hover:text-text-secondary'
								"
								@click="isDrawerOpen = false">
								<component
									:is="item.icon"
									class="h-5 w-5 group-hover:scale-110"
									:class="currentActivePath === item.to ? 'text-bg-card' : ''" />
								<span
									class="text-[13px] tracking-wider uppercase"
									:class="currentActivePath === item.to ? 'font-medium' : 'font-bold'">
									{{ t(item.label) }}
								</span>
							</NuxtLink>

							<button
								v-else
								class="group text-text-muted hover:bg-bg-muted hover:text-text-secondary flex w-full cursor-pointer items-center gap-4 rounded-[1.25rem] px-5 py-3.5 text-left transition-colors duration-300">
								<component :is="item.icon" class="h-5 w-5 group-hover:scale-110" />
								<span class="text-[13px] font-bold tracking-wider uppercase">
									{{ t(item.label) }}
								</span>
							</button>
						</li>
					</ul>
				</div>

				<!-- Footer del Sidebar (Perfil + Logout) -->
				<div
					class="bg-bg-app relative z-10 mt-auto flex w-full flex-col gap-4 border-t border-transparent p-5">
					<div v-if="authStore.user" class="flex flex-col gap-4">
						<div class="flex items-center gap-3">
							<div class="avatar">
								<div
									class="ring-border-default ring-offset-bg-card w-10 rounded-full ring-2 ring-offset-2">
									<img
										:src="
											authStore.user.avatar ||
											`https://ui-avatars.com/api/?name=${authStore.user.name}+${authStore.user.surname || ''}&background=random`
										"
										alt="User Avatar"
										width="40"
										height="40"
										class="object-cover" />
								</div>
							</div>
							<div class="flex-1 overflow-hidden">
								<p class="text-text-secondary truncate text-sm font-bold">
									{{ authStore.user.name }} {{ authStore.user.surname }}
								</p>
								<p
									class="text-text-muted truncate text-[10px] font-semibold tracking-widest uppercase">
									{{ authStore.user.role }}
								</p>
							</div>
						</div>

						<button
							@click="handleLogout"
							class="group hover:text-bg-card flex w-full items-center justify-center gap-2 rounded-xl border border-[#ff0000]/30 bg-[#ff0000]/10 px-4 py-2.5 font-bold text-[#ff0000] transition-[background-color,border-color,color,transform,box-shadow] hover:border-[#ff0000] hover:bg-[#ff0000] hover:shadow-md">
							<LogOut class="h-4 w-4 group-hover:-translate-x-0.5" />
							<span class="text-xs tracking-wider uppercase">
								{{ $t('nav.logout') || 'Cerrar Sesión' }}
							</span>
						</button>
					</div>
				</div>
			</aside>
		</div>
	</div>
</template>

<script lang="ts" setup>
	import { useI18n } from 'vue-i18n'
	import gsap from 'gsap'
	import {
		UsersRound,
		LayoutDashboard,
		SlidersHorizontal,
		Waypoints,
		Van,
		IdCard,
		Building2,
		PanelLeftClose,
		PanelLeftOpen,
		LogOut,
		Package,
		Layers,
		Tags,
		Hash,
		CalendarDays,
		ShoppingBag,
		PieChart,
		Scissors,
		PackageSearch,
		Ticket,
		Repeat,
		CreditCard,
		Store,
		Landmark,
		ListTree,
		FileCheck,
		ClipboardList,
		ShieldOff,
	} from 'lucide-vue-next'

	const { t, locale } = useI18n()
	const localeCookie = useCookie('i18n_redirected')
	const route = useRoute()
	const authStore = useAuthStore()
	const router = useRouter()

	const handleLogout = () => {
		authStore.clearAuth()
		router.push('/')
	}

	watch(locale, newLocale => {
		localeCookie.value = newLocale
	})
	const isDrawerOpen = ref(false)
	const sidebarNav = ref<HTMLElement | null>(null)
	const activePill = ref<HTMLElement | null>(null)
	const navRefs = ref<Record<string, HTMLElement | null>>({})

	const currentActivePath = computed(() => {
		// Normalizamos el path eliminando trailing slash temporalmente si existe
		const path = route.path === '/' ? '/' : route.path.replace(/\/$/, '')
		
		if (navRefs.value[path]) {
			return path
		}
		
		// Fallback para rutas hijas que no están en el menú principal
		const partialMatch = Object.keys(navRefs.value)
			.filter(k => k !== '/')
			.sort((a, b) => b.length - a.length)
			.find(k => path.startsWith(k))
			
		return partialMatch || '/'
	})

	const setNavRef = (path: string | undefined) => (el: any) => {
		if (path && el) {
			navRefs.value[path] = el.$el || el
		}
	}

	const updateActivePill = (immediate = false) => {
		if (!activePill.value) return
		
		const activeEl = navRefs.value[currentActivePath.value]
		if (activeEl) {
			const top = activeEl.offsetTop
			const height = activeEl.offsetHeight
			
			if (immediate) {
				gsap.set(activePill.value, { y: top, height, opacity: 1 })
			} else {
				gsap.to(activePill.value, { 
					y: top, 
					height, 
					opacity: 1, 
					duration: 0.45, 
					ease: 'power3.inOut' 
				})
			}
		} else {
			gsap.to(activePill.value, { opacity: 0, duration: 0.2 })
		}
	}

	watch(
		() => route.path,
		() => {
			nextTick(() => updateActivePill(false))
		}
	)

	// GSAP sidebar nav stagger entrance
	onMounted(() => {
		if (sidebarNav.value) {
			const navLinks = sidebarNav.value.querySelectorAll('li')
			if (navLinks.length) {
				gsap.set(navLinks, { opacity: 0, x: -16 })
				gsap.to(navLinks, {
					opacity: 1,
					x: 0,
					duration: 0.35,
					stagger: 0.03,
					ease: 'power2.out',
					delay: 0.15,
				})
			}
		}

		// Initial pill setup
		setTimeout(() => updateActivePill(true), 150)
	})

	const navItems = [
		{ to: '/', label: 'nav.dashboard', icon: LayoutDashboard },
		{ to: '/clientes', label: 'nav.clients', icon: UsersRound },
		{ to: '/clientes/consentimientos', label: 'Consentimientos', icon: FileCheck },
		{ to: '/clientes/cuestionarios', label: 'Cuestionarios', icon: ClipboardList },
		{ to: '/clientes/revocaciones', label: 'Revocaciones', icon: ShieldOff },
		{ to: '/catalogo/productos', label: 'Productos', icon: Package },
		{ to: '/catalogo/categorias', label: 'Categorías', icon: Layers },
		{ to: '/catalogo/subcategorias', label: 'Subcategorías', icon: ListTree },
		{ to: '/catalogo/marcas', label: 'Marcas', icon: Tags },
		{ to: '/catalogo/etiquetas', label: 'Etiquetas', icon: Hash },
		{ to: '/servicios', label: 'Servicios', icon: Scissors },
		{ to: '/packs', label: 'Packs & Promociones', icon: PackageSearch },
		{ to: '/marketing/cupones', label: 'Cupones', icon: Ticket },
		{ to: '/marketing/bonos', label: 'Bonos', icon: Repeat },
		{ to: '/marketing/giftcards', label: 'Tarjetas de Regalo', icon: CreditCard },
		{ to: '/agenda', label: 'Agenda', icon: CalendarDays },
		{ to: '/tpv', label: 'Terminal Venta', icon: Store },
		{ to: '/ventas', label: 'Ventas', icon: ShoppingBag },
		{ to: '/finanzas/deudas', label: 'Deudas y Cobros', icon: Landmark },
		{ to: '/reportes', label: 'nav.reports', icon: PieChart },
		{ to: '/configuracion', label: 'nav.settings', icon: SlidersHorizontal },
	]

	const currentRouteTranslated = computed(() => {
		const currentNav = navItems.find(item => item.to === route.path)
		if (currentNav) {
			return t(currentNav.label)
		}

		const pathValue = route.path.replace('/', '')
		return pathValue ? pathValue.replace(/-/g, ' ') : 'Panel de Control'
	})
</script>

<style scoped>
	.swap-enter-active,
	.swap-leave-active {
		transition-property: opacity, transform;
		transition-duration: 0.25s;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	}

	.swap-enter-from,
	.swap-leave-to {
		opacity: 0;
		transform: scale(0.8) rotate(-15deg);
	}

	@keyframes blob {
		0% {
			transform: translate(0px, 0px) scale(1);
		}
		33% {
			transform: translate(30px, -50px) scale(1.1);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.9);
		}
		100% {
			transform: translate(0px, 0px) scale(1);
		}
	}

	.animate-blob {
		animation: blob 15s infinite alternate;
	}

	.animation-delay-2000 {
		animation-delay: 2s;
	}

	/* Scrollbar custom para el sidebar */
	.overflow-y-auto::-webkit-scrollbar {
		width: 4px;
	}
	.overflow-y-auto::-webkit-scrollbar-track {
		background: transparent;
	}
	.overflow-y-auto::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 10px;
	}
	.overflow-y-auto::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 0, 0.5);
	}
</style>
