<script setup lang="ts">
	import { ref, computed } from 'vue'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import {
		Package,
		Plus,
		Search,
		Filter,
		MoreVertical,
		Edit2,
		Trash2,
		Image as ImageIcon,
		AlertCircle,
	} from 'lucide-vue-next'
	import ProductFormModal from '~/components/catalog/products/ProductFormModal.vue'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Productos | Catálogo' })

	const queryClient = useQueryClient()

	const searchQuery = ref('')
	const selectedCategory = ref('')
	const selectedBrand = ref('')

	const resetFilters = () => {
		searchQuery.value = ''
		selectedCategory.value = ''
		selectedBrand.value = ''
	}

	// Configuración de filtro dependiente (query params)
	const queryParams = computed(() => {
		const params: Record<string, string> = {}
		if (searchQuery.value) params.search = searchQuery.value
		if (selectedCategory.value) params.category_id = selectedCategory.value
		if (selectedBrand.value) params.brand_id = selectedBrand.value
		return params
	})

	const { data: products, isPending } = useQuery<any[]>({
		queryKey: ['products', queryParams],
		queryFn: () => $fetch('/api/catalog/products', { query: queryParams.value }),
	})

	const { data: categories } = useQuery<{ category_id: string; name: string }[]>({
		queryKey: ['categories'],
		queryFn: () => $fetch('/api/catalog/categories'),
	})

	const { data: brands } = useQuery<{ brand_id: string; name: string }[]>({
		queryKey: ['brands'],
		queryFn: () => $fetch('/api/catalog/brands'),
	})

	const modalRef = ref<InstanceType<typeof ProductFormModal> | null>(null)
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/catalog/products/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] })
			displayToast('Producto eliminado exitosamente', 'success')
		},
		onError: (error: any) => {
			displayToast(error.data?.statusMessage || 'Error al eliminar', 'error')
		},
	})

	const openCreateModal = () => {
		modalRef.value?.showModal(null)
	}

	const openEditModal = (product: any) => {
		modalRef.value?.showModal(product)
	}

	const confirmDelete = (id: string) => {
		if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
			deleteProduct(id)
		}
	}

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => (showToast.value = false), 3000)
	}
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 lg:p-8 lg:h-[calc(100dvh-73px)] lg:flex lg:flex-col lg:overflow-hidden">
		<div class="mx-auto flex h-full w-full max-w-7xl flex-col lg:overflow-hidden">
			<!-- Header -->
			<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
						<Package class="h-6 w-6" />
					</div>
					<div>
						<h1 class="text-2xl font-bold tracking-tight">Productos</h1>
						<p class="text-text-muted text-sm font-medium">Gestiona tu catálogo de productos base</p>
					</div>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
					<button
						class="btn bg-text-primary text-bg-card hover:bg-text-secondary h-12 rounded-2xl border-none px-6 font-bold shadow-sm"
						@click="openCreateModal">
						<Plus class="h-5 w-5" />
						Nuevo Producto
					</button>
				</div>
			</div>

			<!-- Filters -->
			<div
				class="bg-bg-card border-border-default mb-8 flex flex-col gap-4 rounded-3xl border p-4 sm:flex-row sm:items-center">
				<div class="relative w-full sm:w-1/3">
					<Search class="text-text-muted absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
					<input
						v-model="searchQuery"
						type="text"
						placeholder="Buscar por nombre, SKU o código..."
						class="input bg-bg-muted border-border-default focus:border-border-strong focus:ring-border-subtle hover:bg-bg-hover focus:bg-bg-card h-11 w-full rounded-xl pl-10 text-sm font-medium shadow-sm transition-[background-color,border-color,box-shadow]" />
				</div>

				<div class="w-full sm:w-1/4">
					<select
						v-model="selectedCategory"
						class="select bg-bg-muted border-border-default hover:bg-bg-hover focus:bg-bg-card h-11 w-full rounded-xl text-sm font-medium">
						<option value="">Todas las Categorías</option>
						<option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
							{{ cat.name }}
						</option>
					</select>
				</div>

				<div class="w-full sm:w-1/4">
					<select
						v-model="selectedBrand"
						class="select bg-bg-muted border-border-default hover:bg-bg-hover focus:bg-bg-card h-11 w-full rounded-xl text-sm font-medium">
						<option value="">Todas las Marcas</option>
						<option v-for="brand in brands" :key="brand.brand_id" :value="brand.brand_id">
							{{ brand.name }}
						</option>
					</select>
				</div>

				<!-- Reset Filters -->
				<div class="w-full sm:w-auto">
					<button
						v-if="searchQuery || selectedCategory || selectedBrand"
						@click="resetFilters"
						class="btn btn-ghost text-text-muted hover:bg-bg-hover w-full rounded-xl sm:w-auto">
						Limpiar
					</button>
				</div>
			</div>

			<!-- Loading State -->
			<div v-if="isPending" class="flex flex-col gap-4">
				<div
					v-for="i in 5"
					:key="i"
					class="bg-bg-card border-border-default h-24 w-full animate-pulse rounded-2xl border"></div>
			</div>

			<!-- Table List -->
			<div
				v-else-if="products && products.length > 0"
				class="bg-bg-card border-border-default flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border shadow-sm">
				<div class="w-full flex-1 overflow-auto">
					<table class="table w-full relative">
						<thead class="sticky top-0 z-10 bg-bg-muted/50 backdrop-blur-md">
							<tr
								class="border-border-default text-text-muted border-b pb-4 text-xs tracking-wider uppercase">
								<th class="font-bold">Producto</th>
								<th class="font-bold">Categoría / Marca</th>
								<th class="text-right font-bold tabular-nums">Stock / Precio</th>
								<th class="text-center font-bold">Estado</th>
								<th class="w-16"></th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="product in products"
								:key="product.product_id"
								class="border-border-default hover:bg-bg-muted/50 transition-colors">
								<td>
									<div class="flex items-center gap-4 py-2">
										<div
											class="bg-bg-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
											<ImageIcon
												v-if="!product.image_url"
												class="text-text-muted h-5 w-5 opacity-50" />
											<img
												v-else
												:src="product.image_url"
												alt=""
												class="h-full w-full rounded-xl object-cover" />
										</div>
										<div class="flex flex-col">
											<span class="font-bold">{{ product.name }}</span>
											<div class="text-text-muted flex items-center gap-2 text-xs">
												<span v-if="product.sku">SKU: {{ product.sku }}</span>
												<span v-if="product.sku && product.barcode">•</span>
												<span v-if="product.barcode">EAN: {{ product.barcode }}</span>
											</div>
										</div>
									</div>
								</td>

								<td>
									<div class="flex flex-col gap-1">
										<span
											v-if="product.category"
											class="bg-primary/10 text-primary w-fit rounded-md px-2 py-0.5 text-xs leading-none font-bold">
											{{ product.category.name }}
											<span v-if="product.subcategory" class="opacity-75">
												/ {{ product.subcategory.name }}
											</span>
										</span>
										<span v-else class="text-text-light text-xs italic">Sin categoría</span>

										<span v-if="product.brand" class="text-text-muted text-xs font-medium">
											{{ product.brand.name }}
										</span>
									</div>
								</td>

								<td class="text-right">
									<div class="flex flex-col items-end gap-1">
										<span class="font-bold tabular-nums">{{ formatCurrency(product.price) }}</span>
										<span
											class="flex items-center gap-1 text-xs font-medium tabular-nums"
											:class="
												product.stock <= (product.min_stock || 0)
													? 'text-error'
													: 'text-text-muted'
											">
											<AlertCircle
												v-if="product.stock <= (product.min_stock || 0)"
												class="h-3 w-3" />
											Stock: {{ product.stock }}
										</span>
									</div>
								</td>

								<td class="text-center">
									<span
										class="badge badge-sm font-bold tracking-wider uppercase"
										:class="
											product.status === 'activo'
												? 'badge-success text-white'
												: 'badge-ghost text-text-muted'
										">
										{{ product.status }}
									</span>
								</td>

								<th>
									<div class="dropdown dropdown-end">
										<button tabindex="0" class="btn btn-ghost btn-sm btn-circle text-text-muted">
											<MoreVertical class="h-4 w-4" />
										</button>
										<ul
											tabindex="0"
											class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-1 mt-1 w-40 rounded-xl border p-2 shadow-lg">
											<li>
												<a @click="openEditModal(product)" class="hover:bg-bg-muted font-medium">
													<Edit2 class="h-4 w-4" />
													{{ $t('common.edit') }}
												</a>
											</li>
											<li>
												<a
													@click="confirmDelete(product.product_id)"
													class="text-error hover:bg-error/10 font-medium">
													<Trash2 class="h-4 w-4" />
													{{ $t('common.delete') }}
												</a>
											</li>
										</ul>
									</div>
								</th>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<!-- Empty State -->
			<div
				v-else
				class="bg-bg-card border-border-default flex flex-col items-center justify-center rounded-3xl border border-dashed py-16 text-center">
				<div class="bg-bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
					<Package class="text-text-muted h-8 w-8" />
				</div>
				<h3 class="mb-1 text-lg font-bold">No se encontraron productos</h3>
				<p class="text-text-muted mb-4 text-sm">Prueba ajustando los filtros o crea un nuevo producto.</p>
				<button
					class="btn bg-text-primary text-bg-card hover:bg-text-secondary rounded-xl border-none"
					@click="openCreateModal">
					Añadir Producto
				</button>
			</div>
		</div>

		<!-- Toast -->
		<div v-if="showToast" class="toast toast-end toast-bottom z-50">
			<div
				:class="[
					'alert rounded-2xl border-none text-white shadow-lg',
					toastType === 'success' ? 'bg-success' : 'bg-error',
				]">
				<span class="font-medium">{{ toastMessage }}</span>
			</div>
		</div>

		<!-- Modal -->
		<ProductFormModal
			ref="modalRef"
			@refresh="queryClient.invalidateQueries({ queryKey: ['products'] })"
			@toast="displayToast" />
	</div>
</template>
