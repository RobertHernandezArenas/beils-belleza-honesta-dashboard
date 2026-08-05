<script setup lang="ts">
import type { CatalogItem, FetchError } from '~~/shared/types/domain'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Scissors, Plus, Search, MoreVertical, Edit2, Trash2, Clock, Package as PackageIcon } from 'lucide-vue-next'
	import ServiceFormModal from '~/components/services/ServiceFormModal.vue'
	import PackageFormModal from '~/components/packages/PackageFormModal.vue'
	import type { IService } from '~/../shared/types/catalog'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Servicios y Bonos | Catálogo' })

	const activeTab = ref<'services' | 'packages'>('services')

	const queryClient = useQueryClient()
	const searchQuery = ref('')
	const modalRef = ref<InstanceType<typeof ServiceFormModal> | null>(null)
	const packageModalRef = ref<InstanceType<typeof PackageFormModal> | null>(null)

	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	const queryParams = computed(() => {
		const params: Record<string, string> = {}
		if (searchQuery.value) params.search = searchQuery.value
		return params
	})

	// Services Query
	const { data: services, isPending } = useQuery<IService[]>({
		queryKey: ['services', queryParams],
		queryFn: () => $fetch('/api/services', { query: queryParams.value }),
	})

	// Catalog Packages Query
	const { data: packages, isPending: isPendingPackages } = useQuery<CatalogItem[]>({
		queryKey: ['packages'],
		queryFn: () => $fetch('/api/packages'),
	})

	const { mutate: deleteService } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/services/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['services'] })
			queryClient.invalidateQueries({ queryKey: ['services-tpv'] })
			displayToast('Servicio eliminado exitosamente', 'success')
		},
		onError: (error: FetchError) => {
			displayToast(error.data?.statusMessage || 'Error al eliminar el servicio', 'error')
		},
	})

	const { mutate: deletePackage } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/packages/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['packages'] })
			displayToast('Paquete eliminado exitosamente', 'success')
		},
		onError: (error: FetchError) => {
			displayToast(error.data?.statusMessage || 'Error al eliminar el paquete', 'error')
		},
	})

	const openCreateModal = () => {
		if (activeTab.value === 'services') {
			modalRef.value?.showModal(null)
		} else {
			packageModalRef.value?.openModal(null)
		}
	}

	// DaisyUI dropdowns stay open via :focus-within; blur to close before opening a modal/dialog
	const closeMenu = () => {
		if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
			document.activeElement.blur()
		}
	}

	const openEditModal = (service: IService) => {
		closeMenu()
		modalRef.value?.showModal(service)
	}

	const openEditPackageModal = (pkg: CatalogItem) => {
		closeMenu()
		packageModalRef.value?.openModal(pkg)
	}

	const confirmDelete = (id: string) => {
		closeMenu()
		if (confirm('¿Estás seguro de que deseas eliminar este servicio? No podrás recuperarlo.')) {
			deleteService(id)
		}
	}

	const confirmDeletePackage = (id: string) => {
		closeMenu()
		if (confirm('¿Estás seguro de que deseas eliminar este paquete del catálogo?')) {
			deletePackage(id)
		}
	}

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => (showToast.value = false), 3000)
	}

	const formatDuration = (minutes: number) => {
		const h = Math.floor(minutes / 60)
		const m = minutes % 60
		if (h > 0 && m > 0) return `${h}h ${m}m`
		if (h > 0) return `${h}h`
		return `${m} min`
	}

	const formatCurrency = (val: number) => {
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)
	}

	const formatPackageBadge = (pkg: CatalogItem) => {
		const serviceSessions = (pkg.items || [])
			.filter((it: { item_type?: string; quantity?: number }) => (it.item_type || 'SERVICE') === 'SERVICE')
			.reduce((sum: number, it: { item_type?: string; quantity?: number }) => sum + (Number(it.quantity) || 0), 0)
		
		const productCount = (pkg.items || [])
			.filter((it: { item_type?: string; quantity?: number }) => (it.item_type || 'SERVICE') === 'PRODUCT')
			.reduce((sum: number, it: { item_type?: string; quantity?: number }) => sum + (Number(it.quantity) || 0), 0)

		const sessions = serviceSessions || pkg.total_sessions || 0

		if (productCount > 0) {
			return `${sessions} Sesiones + ${productCount} ${productCount === 1 ? 'Producto' : 'Productos'}`
		}
		return `${sessions} Sesiones`
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8">
		<div class="mx-auto max-w-7xl">
			<!-- Header -->
			<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
						<Scissors class="h-6 w-6" />
					</div>
					<div>
						<h1 class="text-2xl font-bold tracking-tight">Catálogo de Servicios y Bonos</h1>
						<p class="text-text-muted text-sm font-medium">Gestiona tu oferta de tratamientos y paquetes de sesiones</p>
					</div>
				</div>

				<div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
					<div class="relative w-full sm:w-3/4 lg:w-64">
						<Search class="text-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
						<input
							v-model="searchQuery"
							type="text"
							placeholder="Buscar en catálogo..."
							class="input bg-bg-card border-border-default focus:border-border-strong focus:ring-border-subtle h-12 w-full rounded-2xl pl-10 text-sm shadow-sm transition-[border-color,box-shadow]" >
					</div>
					<button
						class="btn bg-text-primary text-bg-card hover:bg-text-secondary h-12 w-full shrink-0 flex items-center justify-center rounded-2xl border-none px-6 font-bold shadow-sm sm:w-1/4 lg:w-auto"
						@click="openCreateModal">
						<Plus class="h-5 w-5" />
						{{ activeTab === 'services' ? 'Nuevo Servicio' : 'Nuevo Paquete / Bono' }}
					</button>
				</div>
			</div>

			<!-- Tab Switcher -->
			<div class="mb-8 border-b border-border-default flex items-center gap-4">
				<button
					type="button"
					class="flex items-center gap-2 pb-3 px-1 text-sm font-black uppercase transition-all relative border-b-2"
					:class="activeTab === 'services' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'"
					@click="activeTab = 'services'">
					<Scissors class="h-4 w-4" />
					Servicios Individuales
				</button>
				<button
					type="button"
					class="flex items-center gap-2 pb-3 px-1 text-sm font-black uppercase transition-all relative border-b-2"
					:class="activeTab === 'packages' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'"
					@click="activeTab = 'packages'">
					<PackageIcon class="h-4 w-4" />
					Bonos y Paquetes
					<span v-if="packages?.length" class="badge badge-primary badge-xs font-mono font-bold">{{ packages.length }}</span>
				</button>
			</div>

			<!-- TAB 1: SERVICES -->
			<template v-if="activeTab === 'services'">
				<!-- Loading State -->
				<div v-if="isPending" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					<div
						v-for="i in 6"
						:key="i"
						class="bg-bg-card border-border-default h-40 w-full animate-pulse rounded-3xl border opacity-50 mix-blend-multiply"/>
				</div>

				<!-- Grid List -->
				<div
					v-else-if="services && services.length > 0"
					class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					<div
						v-for="service in services"
						:key="service.service_id"
						class="group bg-bg-card border-border-default hover:border-border-strong relative flex flex-col justify-between rounded-3xl border p-6 shadow-sm transition-colors duration-300 hover:shadow-md">
						<div class="mb-4">
							<div class="mb-2 flex items-start justify-between">
								<div class="flex items-center gap-2">
									<span
										class="badge badge-sm font-bold tracking-wider uppercase"
										:class="
											service.status === 'activo'
												? 'badge-success text-white'
												: 'badge-ghost text-text-muted'
										">
										{{ service.status }}
									</span>
									<span
										v-if="service.code"
										class="text-text-muted bg-bg-muted rounded-md px-2 py-0.5 text-xs font-bold tracking-wider uppercase">
										{{ service.code }}
									</span>
								</div>

								<!-- Menu dropdown -->
								<div class="dropdown dropdown-end">
									<button tabindex="0" class="btn btn-ghost btn-sm btn-circle text-text-muted -mr-2">
										<MoreVertical class="h-4 w-4" />
									</button>
									<ul
										tabindex="0"
										class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-1 mt-1 w-40 rounded-xl border p-2 shadow-lg">
										<li>
											<a class="hover:bg-bg-muted font-medium" @click="openEditModal(service)">
												<Edit2 class="h-4 w-4" />
												Editar
											</a>
										</li>
										<li>
											<a
												class="text-error hover:bg-error/10 font-medium"
												@click="confirmDelete(service.service_id)">
												<Trash2 class="h-4 w-4" />
												Eliminar
											</a>
										</li>
									</ul>
								</div>
							</div>

							<h3 class="mb-1 text-lg leading-tight font-bold">{{ service.name }}</h3>
							<p class="text-text-muted line-clamp-2 text-sm font-medium">
								{{ service.description || 'Sin descripción' }}
							</p>
						</div>

						<div class="mt-auto flex items-end justify-between">
							<div
								class="text-text-muted bg-bg-muted flex w-fit items-center gap-1.5 rounded-xl px-3 py-1.5">
								<Clock class="h-4 w-4" />
								<span class="text-sm font-bold tabular-nums">
									{{ formatDuration(service.duration) }}
								</span>
							</div>

							<div class="text-right">
								<span
									class="text-text-muted mb-0.5 block text-xs font-bold tracking-wider uppercase opacity-70">
									Precio
								</span>
								<p class="text-text-primary text-xl leading-none font-bold tabular-nums">
									{{ formatCurrency(service.price) }}
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Empty State -->
				<div
					v-else
					class="bg-bg-card border-border-default flex flex-col items-center justify-center rounded-3xl border border-dashed px-4 py-20 text-center">
					<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
						<Scissors class="text-text-muted h-10 w-10" />
					</div>
					<h3 class="mb-1 text-xl font-bold">No hay servicios registrados</h3>
					<p class="text-text-muted mb-6 max-w-sm text-sm">
						Comienza agregando los servicios que ofreces a tus clientes para poder agendarlos o facturarlos.
					</p>
					<button
						class="btn bg-text-primary text-bg-card hover:bg-text-secondary rounded-xl border-none px-8 font-bold"
						@click="openCreateModal">
						Crear Servicio
					</button>
				</div>
			</template>

			<!-- TAB 2: PACKAGES & BONOS -->
			<template v-else>
				<!-- Loading State -->
				<div v-if="isPendingPackages" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					<div
						v-for="i in 6"
						:key="i"
						class="bg-bg-card border-border-default h-48 w-full animate-pulse rounded-3xl border opacity-50 mix-blend-multiply"/>
				</div>

				<!-- Packages Grid List -->
				<div
					v-else-if="packages && packages.length > 0"
					class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					<div
						v-for="pkg in packages"
						:key="pkg.package_id"
						class="group bg-bg-card border-border-default hover:border-border-strong relative flex flex-col justify-between rounded-3xl border p-6 shadow-sm transition-colors duration-300 hover:shadow-md">
						<div>
							<div class="mb-3 flex items-start justify-between">
								<div class="flex items-center gap-2">
									<span
										class="badge badge-sm font-black tracking-wider uppercase"
										:class="pkg.type === 'MIXTO' ? 'badge-warning text-amber-950' : 'badge-primary text-white'">
										{{ pkg.type === 'MIXTO' ? 'Bono Mixto' : 'Bono Individual' }}
									</span>
									<span class="text-text-muted bg-bg-muted rounded-md px-2 py-0.5 text-xs font-bold font-mono">
										{{ formatPackageBadge(pkg) }}
									</span>
								</div>

								<!-- Dropdown menu -->
								<div class="dropdown dropdown-end">
									<button tabindex="0" class="btn btn-ghost btn-sm btn-circle text-text-muted -mr-2">
										<MoreVertical class="h-4 w-4" />
									</button>
									<ul
										tabindex="0"
										class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-1 mt-1 w-40 rounded-xl border p-2 shadow-lg">
										<li>
											<a class="hover:bg-bg-muted font-medium" @click="openEditPackageModal(pkg)">
												<Edit2 class="h-4 w-4" />
												Editar
											</a>
										</li>
										<li>
											<a
												class="text-error hover:bg-error/10 font-medium"
												@click="confirmDeletePackage(pkg.package_id || '')">
												<Trash2 class="h-4 w-4" />
												Eliminar
											</a>
										</li>
									</ul>
								</div>
							</div>

							<h3 class="mb-1 text-lg leading-tight font-black text-text-primary">{{ pkg.name }}</h3>
							<p class="text-text-muted line-clamp-2 text-xs font-medium mb-3">
								{{ pkg.description || 'Sin descripción' }}
							</p>

							<!-- Items Breakdown -->
							<div v-if="pkg.items && pkg.items.length > 0" class="bg-bg-muted/50 rounded-2xl p-3 border border-border-default space-y-1.5 mb-4">
								<span class="text-[10px] font-black uppercase text-text-muted tracking-wider block">Tratamientos / Productos incluidos:</span>
								<div v-for="it in pkg.items" :key="it.package_item_id" class="flex items-center justify-between text-xs">
									<span class="font-medium text-text-primary truncate max-w-42.5">{{ it.name }}</span>
									<span class="font-mono font-bold text-text-muted text-[11px]">{{ it.quantity }}x</span>
								</div>
							</div>
						</div>

						<div class="mt-auto flex items-end justify-between border-t border-border-default/60 pt-4">
							<div>
								<span class="text-text-muted block text-[10px] font-bold tracking-wider uppercase">Tipo</span>
								<span class="text-xs font-extrabold uppercase text-text-primary">{{ pkg.type }}</span>
							</div>

							<div class="text-right">
								<span class="text-text-muted block text-[10px] font-bold tracking-wider uppercase opacity-70">Precio Oferta</span>
								<p class="text-text-primary text-xl leading-none font-black tabular-nums">
									{{ formatCurrency(pkg.price || 0) }}
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Empty State for Packages -->
				<div
					v-else
					class="bg-bg-card border-border-default flex flex-col items-center justify-center rounded-3xl border border-dashed px-4 py-20 text-center">
					<div class="bg-bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
						<PackageIcon class="text-text-muted h-10 w-10" />
					</div>
					<h3 class="mb-1 text-xl font-bold">No hay bonos creados en el catálogo</h3>
					<p class="text-text-muted mb-6 max-w-sm text-sm">
						Crea bonos individuales de un tratamiento o paquetes mixtos combinados para vender a tus clientes.
					</p>
					<button
						class="btn bg-text-primary text-bg-card hover:bg-text-secondary rounded-xl border-none px-8 font-bold"
						@click="openCreateModal">
						Crear Primer Bono
					</button>
				</div>
			</template>
		</div>

		<!-- Toast Provider -->
		<div v-if="showToast" class="toast toast-end toast-bottom z-50">
			<div
				:class="[
					'alert rounded-2xl border-none text-white shadow-lg',
					toastType === 'success' ? 'bg-success' : 'bg-error',
				]">
				<span class="font-medium">{{ toastMessage }}</span>
			</div>
		</div>

		<!-- Service Form Modal -->
		<ServiceFormModal
			ref="modalRef"
			@refresh="queryClient.invalidateQueries({ queryKey: ['services'] })"
			@toast="displayToast" />

		<!-- Package Form Modal -->
		<PackageFormModal
			ref="packageModalRef"
			@saved="queryClient.invalidateQueries({ queryKey: ['packages'] })" />
	</div>
</template>
