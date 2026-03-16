<script setup lang="ts">
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

	const searchQuery = useDebouncedRef('', 500)
	const selectedCategory = ref('')

	const resetFilters = () => {
		searchQuery.value = ''
		selectedCategory.value = ''
	}

	// Configuración de filtro dependiente (query params)
	const queryParams = computed(() => {
		const params: Record<string, string> = {}
		if (searchQuery.value) params.search = searchQuery.value
		if (selectedCategory.value) params.category_id = selectedCategory.value
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

	const modalRef = ref<InstanceType<typeof ProductFormModal> | null>(null)
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/catalog/products/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['products'] })
			queryClient.invalidateQueries({ queryKey: ['products-tpv'] })
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
				<div class="relative w-full sm:w-3/4">
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

				<!-- Reset Filters -->
				<div class="w-full sm:w-auto">
					<button
						v-if="searchQuery || selectedCategory"
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
				class="glass-card flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl premium-shadow">
				<div class="w-full flex-1 overflow-auto custom-scrollbar">
					<table class="table w-full relative">
						<thead class="glass-header sticky top-0 z-10">
							<tr
								class="border-border-default text-text-muted border-b pb-4 text-[10px] font-black tracking-widest uppercase">
								<th class="py-5 pl-6">Producto</th>
								<th class="py-5">Categoría</th>
								<th class="text-right py-5 tabular-nums">Stock / Precio</th>
								<th class="text-center py-5">Estado</th>
								<th class="w-16 pr-6 py-5"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border-subtle/50">
							<tr
								v-for="(product, index) in products"
								:key="product.product_id"
								class="premium-lift group hover:bg-white/60 cursor-pointer transition-all duration-300"
								@click="openEditModal(product)">
								<td class="pl-6 py-4">
									<div class="flex items-center gap-4">
										<div
											class="bg-white border-border-default/50 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-transform group-hover:scale-105 overflow-hidden">
											<ImageIcon
												v-if="!product.image_url"
												class="text-text-muted/30 h-6 w-6" />
											<img
												v-else
												:src="product.image_url"
												alt=""
												class="h-full w-full object-cover" />
										</div>
										<div class="flex flex-col">
											<span class="text-text-primary text-sm font-bold tracking-tight">{{ product.name }}</span>
											<div class="text-text-muted mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider opacity-60">
												<span v-if="product.sku">SKU: {{ product.sku }}</span>
												<span v-if="product.sku && product.barcode" class="text-primary">•</span>
												<span v-if="product.barcode">EAN: {{ product.barcode }}</span>
											</div>
										</div>
									</div>
								</td>

								<td class="py-4">
									<div class="flex flex-col gap-1.5">
										<span
											v-if="product.category"
											class="bg-primary/10 text-primary border-primary/20 w-fit rounded-lg border px-2.5 py-1 text-[10px] font-black tracking-widest uppercase">
											{{ product.category.name }}
											<span v-if="product.subcategory" class="opacity-60">
												/ {{ product.subcategory.name }}
											</span>
										</span>
										<span v-else class="text-text-muted/50 text-[10px] font-bold italic tracking-wide">Sin categoría</span>
									</div>
								</td>

								<td class="text-right py-4">
									<div class="flex flex-col items-end gap-1">
										<span class="text-text-primary text-base font-black tabular-nums">{{ formatCurrency(product.price) }}</span>
										<span
											class="flex items-center gap-1.5 text-[11px] font-bold tabular-nums"
											:class="
												product.stock <= (product.min_stock || 0)
													? 'text-rose-500'
													: 'text-text-muted/70'
											">
											<AlertCircle
												v-if="product.stock <= (product.min_stock || 0)"
												class="h-3 w-3" />
											<span class="opacity-60 font-medium">Stock:</span> {{ product.stock }}
										</span>
									</div>
								</td>

								<td class="text-center py-4">
									<span
										class="inline-flex items-center rounded-lg border px-3 py-1 text-[10px] font-black tracking-widest uppercase"
										:class="
											product.status === 'activo'
												? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
												: 'bg-stone-500/10 text-stone-700 border-stone-500/20'
										">
										<span class="mr-1.5 h-1 w-1 rounded-full bg-current"></span>
										{{ product.status }}
									</span>
								</td>

								<th class="pr-6 py-4" @click.stop>
									<div 
										class="dropdown dropdown-left dropdown-end"
										:class="{ 'dropdown-top': index > (products?.length || 0) - 3 }"
									>
										<button tabindex="0" class="btn btn-ghost btn-sm btn-circle text-text-muted transition-all hover:bg-primary/10 hover:text-primary">
											<MoreVertical class="h-4.5 w-4.5" />
										</button>
										<ul
											tabindex="0"
											class="dropdown-content menu glass-card text-text-secondary z-100 mt-1 w-44 rounded-2xl border p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
											<li>
												<a @click="openEditModal(product)" class="hover:bg-primary/5 hover:text-primary rounded-xl py-2.5 font-bold transition-colors">
													<Edit2 class="h-4 w-4" />
													<span>{{ $t('common.edit') }}</span>
												</a>
											</li>
											<div class="divider my-1 opacity-50"></div>
											<li>
												<a
													@click="confirmDelete(product.product_id)"
													class="text-rose-500 hover:bg-rose-500/10 rounded-xl py-2.5 font-bold transition-colors">
													<Trash2 class="h-4 w-4" />
													<span>{{ $t('common.delete') }}</span>
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
