<template>
	<div class="drawer lg:drawer-open bg-bg-app text-text-secondary relative h-dvh overflow-hidden font-sans">
		<input id="my-drawer-4" v-model="isDrawerOpen" type="checkbox" class="drawer-toggle" />

		<!-- NAVBAR (Glassmorphism) -->
		<div class="drawer-content relative z-10 flex h-dvh flex-col">
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
				class="bg-bg-card/90 flex h-full w-72 flex-col items-start border-r border-transparent shadow-[4px_0_20px_rgba(0,0,0,0.03)] backdrop-blur-2xl transition-transform duration-300 lg:w-72">
				<!-- Glow lateral en sidebar -->
				<div
					class="from-bg-app pointer-events-none absolute inset-0 z-0 bg-linear-to-r to-transparent"></div>

				<!-- LOGO SPACE -->
				<div
					class="relative z-10 flex h-[73px] min-h-[73px] w-full items-center justify-start gap-3 border-b border-transparent p-6">
					<div class="group relative shrink-0">
						<NuxtLink to="/">
							<img
								src="/assets/images/beils_.svg"
								class="relative w-25 brightness-0 drop-shadow-sm"
								alt="Logo" />
						</NuxtLink>
					</div>
				</div>

				<!-- Navegación -->
				<div class="text-text-secondary relative z-10 w-full flex-1 overflow-y-auto px-4 py-4 scrollbar-hide lg:overflow-hidden">
					<div ref="sidebarNav" class="relative flex w-full flex-col gap-4">
						<!-- GSAP Active Pill Background -->
						<div
							ref="activePill"
							class="bg-text-secondary pointer-events-none absolute top-0 left-0 w-full rounded-2xl opacity-0 shadow-md"
							style="z-index: 0; min-height: 36px"></div>

						<div v-for="(group, gIdx) in navGroups" :key="gIdx" class="flex flex-col gap-1">
							<!-- Group Header -->
							<p class="text-text-light mb-1 pl-4 text-[10px] font-bold tracking-widest uppercase opacity-60">
								{{ group.title }}
							</p>

							<!-- Group Items -->
							<ul class="flex flex-col gap-0.5">
								<li
									v-for="item in group.items"
									:key="item.to || item.label"
									class="relative z-10 nav-item"
									:ref="setNavRef(item.to)">
									<NuxtLink
										v-if="item.to"
										:to="item.to"
										class="group/link flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-2 text-left transition-colors duration-300"
										:class="
											currentActivePath === item.to
												? 'text-bg-card font-medium'
												: 'text-text-muted hover:text-text-secondary hover:bg-bg-muted/30'
										"
										@click="closeDrawerMobile">
										<component
											:is="item.icon"
											class="h-4 w-4 transition-transform group-hover/link:scale-110"
											:class="currentActivePath === item.to ? 'text-bg-card' : ''" />
										<span
											class="text-[13px] tracking-wider uppercase"
											:class="currentActivePath === item.to ? 'font-medium' : 'font-bold'">
											{{ t(item.label) }}
										</span>
									</NuxtLink>

									<button
										v-else
										class="group/btn text-text-muted hover:bg-bg-muted hover:text-text-secondary flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-2 text-left transition-colors duration-300">
										<component :is="item.icon" class="h-4 w-4 transition-transform group-hover/btn:scale-110" />
										<span class="text-[13px] font-bold tracking-wider uppercase">
											{{ t(item.label) }}
										</span>
									</button>
								</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- Footer del Sidebar (Perfil + Logout) -->
				<div
					class="bg-bg-app relative z-10 mt-auto flex w-full flex-col gap-3 border-t border-transparent p-4">
					<div v-if="authStore.user" class="flex flex-col gap-3">
						<div class="flex items-center gap-3">
							<div class="avatar">
								<div
									class="ring-border-default ring-offset-bg-card w-9 rounded-full ring-2 ring-offset-2">
									<img
										:src="
											authStore.user.avatar ||
											`https://ui-avatars.com/api/?name=${authStore.user.name}+${authStore.user.surname || ''}&background=random`
										"
										alt="User Avatar"
										width="36"
										height="36"
										class="object-cover" />
								</div>
							</div>
							<div class="flex-1 overflow-hidden">
								<p class="text-text-secondary truncate text-[13px] font-bold">
									{{ authStore.user.name }} {{ authStore.user.surname }}
								</p>
								<p
									class="text-text-muted truncate text-[9px] font-semibold tracking-widest uppercase">
									{{ authStore.user.role }}
								</p>
							</div>
						</div>

						<button
							@click="handleLogout"
							class="group hover:text-bg-card flex w-full items-center justify-center gap-2 rounded-xl border border-[#ff0000]/30 bg-[#ff0000]/10 px-4 py-2 font-bold text-[#ff0000] transition-[background-color,border-color,color,transform,box-shadow] hover:border-[#ff0000] hover:bg-[#ff0000] hover:shadow-md">
							<LogOut class="h-4 w-4 group-hover:-translate-x-0.5" />
							<span class="text-[11px] tracking-wider uppercase">
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
		Tags,
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
		FileCheck,
		ClipboardList,
		ShieldOff,
		Image,
		ChevronDown,
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
	const closeDrawerMobile = () => {
		setTimeout(() => {
			isDrawerOpen.value = false
		}, 150)
	}
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
		requestAnimationFrame(() => {
			if (!activePill.value || !sidebarNav.value) return

			const activeEl = navRefs.value[currentActivePath.value]
			if (activeEl && activeEl.offsetHeight > 0) {
				const navRect = sidebarNav.value.getBoundingClientRect()
				const elRect = activeEl.getBoundingClientRect()
				const top = elRect.top - navRect.top
				const height = elRect.height

				if (immediate) {
					gsap.set(activePill.value, { y: top, height, opacity: 1 })
				} else {
					gsap.to(activePill.value, {
						y: top,
						height,
						opacity: 1,
						duration: 0.35,
						ease: 'power3.out',
					})
				}
			} else {
				gsap.to(activePill.value, {
					opacity: 0,
					duration: 0.2,
					ease: 'power2.in',
				})
			}
		})
	}

	watch(
		() => route.path,
		() => {
			nextTick(() => updateActivePill(false))
		},
	)

	onMounted(() => {
		// GSAP sidebar nav stagger entrance
		if (sidebarNav.value) {
			const navItems = sidebarNav.value.querySelectorAll('.nav-item')
			if (navItems.length) {
				gsap.fromTo(
					navItems,
					{ opacity: 0, x: -16 },
					{
						opacity: 1,
						x: 0,
						duration: 0.5,
						stagger: 0.04,
						ease: 'power3.out',
						delay: 0.15,
					}
				)
			}
		}

		// Initial pill setup
		setTimeout(() => updateActivePill(true), 200)
	})

	const navGroups = ref([
		{
			title: 'Principal',
			items: [
				{ to: '/overview', label: 'nav.dashboard', icon: LayoutDashboard },
				{ to: '/agenda', label: 'catalog.menu.agenda', icon: CalendarDays },
				{ to: '/clientes', label: 'nav.clients', icon: UsersRound },
				{ to: '/tpv', label: 'catalog.menu.pos', icon: Store },
			]
		},
		{
			title: 'Catálogo y Ventas',
			items: [
				{ to: '/ventas', label: 'catalog.menu.sales', icon: ShoppingBag },
				{ to: '/catalogo/productos', label: 'catalog.menu.products', icon: Package },
				{ to: '/servicios', label: 'catalog.menu.services', icon: Scissors },
				{ to: '/marketing/bonos', label: 'catalog.menu.bonuses', icon: Repeat },
			]
		},
		{
			title: 'Administración',
			items: [
				{ to: '/finanzas/deudas', label: 'catalog.menu.debts', icon: Landmark },
				{ to: '/reportes', label: 'nav.reports', icon: PieChart },
				{ to: '/multimedia', label: 'nav.multimedia', icon: Image },
				{ to: '/configuracion', label: 'nav.settings', icon: SlidersHorizontal },
			]
		}
	])

	const currentRouteTranslated = computed(() => {
		for (const group of navGroups.value) {
			const currentNav = group.items.find(item => item.to === route.path)
			if (currentNav) return t(currentNav.label)
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

	/* Ocultar scrollbar completamente en LG y ajustar padding */
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
